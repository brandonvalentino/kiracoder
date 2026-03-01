/**
 * WebSocket Handler - Manages WebSocket connections and forwards RPC events
 */

import { WebSocket, WebSocketServer } from "ws";
import { RPCManager } from "./rpc-manager";
import { RPCEvent, ExtensionUIResponse, WSMessage } from "./types";

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();

  constructor(private rpcManager: RPCManager) {
    this.wss = new WebSocketServer({ noServer: true });

    // Set up RPC event forwarding
    this.setupRPCEventForwarding();

    // Handle new WebSocket connections
    this.wss.on("connection", (ws) => {
      console.log("[WS] Client connected");
      this.clients.add(ws);

      // Send initial state
      this.sendToClient(ws, {
        type: "state",
        isStreaming: false,
      });

      // Handle messages from client
      ws.on("message", (data) => {
        this.handleClientMessage(ws, data.toString());
      });

      // Handle client disconnect
      ws.on("close", () => {
        console.log("[WS] Client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("[WS] Client error:", error);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Handle WebSocket upgrade
   */
  handleUpgrade(request: any, socket: any, head: any): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit("connection", ws, request);
    });
  }

  /**
   * Set up forwarding of RPC events to all connected clients
   */
  private setupRPCEventForwarding(): void {
    // Forward all RPC events to connected clients
    this.rpcManager.on("event", (event: RPCEvent) => {
      this.broadcast({
        type: "event",
        event,
      });
    });

    // Handle RPC errors
    this.rpcManager.on("error", (error: Error) => {
      this.broadcast({
        type: "error",
        message: error.message,
      });
    });

    // Handle process exit
    this.rpcManager.on("exit", ({ code, signal }: { code: number | null; signal: string | null }) => {
      // SIGTERM is a normal shutdown (e.g. session switch), not an error
      if (signal === "SIGTERM") {
        this.broadcast({
          type: "state",
          isStreaming: false,
        } as WSMessage);
      } else {
        this.broadcast({
          type: "error",
          message: `Pi process exited (code: ${code}, signal: ${signal})`,
        });
      }
    });
  }

  /**
   * Handle a message from a client
   */
  private handleClientMessage(ws: WebSocket, data: string): void {
    try {
      const message = JSON.parse(data);
      console.log(`[WS] Received from client:`, message.type);

      // Handle extension UI responses
      if (message.type === "extension_ui_response") {
        this.rpcManager.sendCommand(message as ExtensionUIResponse);
        return;
      }

      // Forward other commands to RPC manager
      this.rpcManager.sendCommand(message);
    } catch (error) {
      console.error("[WS] Failed to handle client message:", error);
      this.sendToClient(ws, {
        type: "error",
        message: "Invalid message format",
      });
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  private broadcast(message: WSMessage): void {
    const json = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }

  /**
   * Notify all clients that the session has been switched
   */
  notifySessionSwitch(): void {
    this.broadcast({
      type: "state",
      isStreaming: false,
    } as WSMessage);
    // Also send a custom session_switch event
    const msg = JSON.stringify({ type: "session_switch" });
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  /**
   * Get the WebSocket server
   */
  get server(): WebSocketServer {
    return this.wss;
  }
}
