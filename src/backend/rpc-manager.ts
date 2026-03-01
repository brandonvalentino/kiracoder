/**
 * RPC Manager - Spawns Pi subprocess and manages JSON-lines communication
 */

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import * as readline from "readline";
import { RPCCommand, RPCEvent, RPCResponse, ExtensionUIResponse } from "./types";

export interface RPCManagerOptions {
  piCommand?: string;
  args?: string[];
  onStderr?: (data: string) => void;
}

export class RPCManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private stdoutReader: readline.Interface | null = null;
  private isRunning = false;

  constructor(private options: RPCManagerOptions = {}) {
    super();
  }

  /**
   * Update the args for the next start() call
   */
  updateArgs(args: string[]): void {
    this.options.args = args;
  }

  /**
   * Start the Pi subprocess in RPC mode
   */
  start(): void {
    if (this.isRunning) {
      throw new Error("RPC manager already running");
    }

    const piCommand = this.options.piCommand || "pi";
    const args = this.options.args || ["--mode", "rpc", "--no-session"];

    console.log(`[RPC] Starting Pi: ${piCommand} ${args.join(" ")}`);

    this.process = spawn(piCommand, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.isRunning = true;

    // Handle stdout (JSON-lines events)
    if (this.process.stdout) {
      this.stdoutReader = readline.createInterface({
        input: this.process.stdout,
        terminal: false,
      });

      this.stdoutReader.on("line", (line) => {
        this.handleStdoutLine(line);
      });
    }

    // Handle stderr (logs, errors)
    if (this.process.stderr) {
      let stderrBuffer = "";
      this.process.stderr.on("data", (data: Buffer) => {
        stderrBuffer += data.toString();
        const lines = stderrBuffer.split("\n");
        stderrBuffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.trim()) {
            console.error(`[Pi stderr] ${line}`);
            if (this.options.onStderr) {
              this.options.onStderr(line);
            }
          }
        }
      });
    }

    // Handle process exit
    this.process.on("exit", (code, signal) => {
      console.log(`[RPC] Pi process exited with code ${code}, signal ${signal}`);
      this.isRunning = false;
      this.emit("exit", { code, signal });
    });

    // Handle process errors
    this.process.on("error", (error) => {
      console.error(`[RPC] Pi process error:`, error);
      this.emit("error", error);
    });
  }

  /**
   * Stop the Pi subprocess
   */
  stop(): void {
    if (this.process) {
      console.log("[RPC] Stopping Pi process");
      this.process.kill("SIGTERM");
      this.process = null;
      this.stdoutReader = null;
      this.isRunning = false;
    }
  }

  /**
   * Send a command to Pi via stdin
   */
  sendCommand(command: RPCCommand | ExtensionUIResponse): void {
    if (!this.process || !this.process.stdin) {
      throw new Error("Pi process not running");
    }

    const json = JSON.stringify(command);
    console.log(`[RPC →] ${json.substring(0, 200)}${json.length > 200 ? "..." : ""}`);
    
    this.process.stdin.write(json + "\n");
  }

  /**
   * Handle a line of JSON from stdout
   */
  private handleStdoutLine(line: string): void {
    if (!line.trim()) return;

    try {
      const data = JSON.parse(line) as RPCEvent | RPCResponse;
      
      // Log events for debugging
      if ("type" in data) {
        const logData = JSON.stringify(data).substring(0, 200);
        console.log(`[RPC ←] ${data.type}: ${logData}${JSON.stringify(data).length > 200 ? "..." : ""}`);
      }

      // Emit typed events
      if (this.isEvent(data)) {
        this.emit("event", data);
        this.emit(data.type, data);
      } else if (this.isResponse(data)) {
        this.emit("response", data);
      }
    } catch (error) {
      console.error(`[RPC] Failed to parse stdout line:`, line);
      console.error(`[RPC] Parse error:`, error);
    }
  }

  /**
   * Type guard for events
   */
  private isEvent(data: unknown): data is RPCEvent {
    return typeof data === "object" && data !== null && "type" in data && (data as { type: string }).type !== "response";
  }

  /**
   * Type guard for responses
   */
  private isResponse(data: unknown): data is RPCResponse {
    return typeof data === "object" && data !== null && "type" in data && (data as { type: string }).type === "response";
  }

  /**
   * Check if the manager is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}
