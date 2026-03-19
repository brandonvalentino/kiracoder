import { create } from "zustand";
import { createApiClient, apiBaseUrl } from "@/lib/api";
import { parsePiEvent, formatToolResult, type ToolExecution } from "@/lib/pi-events";

type Project = {
  createdAt: string;
  id: string;
  name: string;
};

type Workspace = {
  createdAt: string;
  cwd: string;
  id: string;
  name: string;
  presetId: string;
  projectId: string;
  sessionFile: string;
};

type RuntimeSummary = {
  cwd: string;
  sessionFile: string;
  sessionId: string;
  status: string;
  workspaceId: string;
};

type AgentMessage = {
  content?: unknown;
  role: string;
  usage?: { cost?: { total?: number } };
};

type StreamingState = { text: string; thinking: string };

type AppStore = {
  // Core
  activeProjectId: string | null;
  activeWorkspaceId: string | null;
  apiUrl: string;
  bootstrapped: boolean;

  // Data
  projects: Project[];
  workspacesByProject: Record<string, Workspace[]>;
  messagesByWorkspace: Record<string, AgentMessage[]>;
  toolExecutionsByWorkspace: Record<string, Record<string, ToolExecution>>;

  // Streaming
  isStreaming: boolean;
  streamingWorkspaceId: string | null;
  streamingState: StreamingState;

  // UI
  healthStatus: string;
  statusText: string;
  settingsOpen: boolean;
  sidebarOpen: boolean;

  // Internal — not for components
  _unsubscribe?: () => void;

  // Actions
  setSettingsOpen: (open: boolean) => void;
  selectProject: (projectId: string | null) => void;
  selectWorkspace: (workspaceId: string | null) => void;
  loadProjects: () => Promise<void>;
  loadWorkspaces: (projectId: string) => Promise<void>;
  loadMessages: (workspaceId: string) => Promise<AgentMessage[]>;
  createProject: (name: string) => Promise<Project>;
  createWorkspace: (input: {
    cwd?: string;
    name: string;
    projectId: string;
  }) => Promise<{ runtime: RuntimeSummary; workspace: Workspace }>;
  promptWorkspace: (workspaceId: string, message: string) => Promise<void>;
  // Returns the unsubscribe fn — route effect uses it as cleanup.
  subscribeToWorkspace: (workspaceId: string) => () => void;
};

const client = createApiClient();

export const useAppStore = create<AppStore>()((set, get) => ({
  activeProjectId: null,
  activeWorkspaceId: null,
  apiUrl: apiBaseUrl,
  bootstrapped: false,
  projects: [],
  workspacesByProject: {},
  messagesByWorkspace: {},
  toolExecutionsByWorkspace: {},
  isStreaming: false,
  streamingWorkspaceId: null,
  streamingState: { text: "", thinking: "" },
  healthStatus: "connecting",
  statusText: "Connecting…",
  settingsOpen: false,
  sidebarOpen: true,

  setSettingsOpen(open) {
    set({ settingsOpen: open });
  },
  selectProject(projectId) {
    set({ activeProjectId: projectId });
  },
  // rerender-derived-state: selectWorkspace only sets the primitive id.
  // subscribeToWorkspace is a separate concern, called by the route effect.
  selectWorkspace(workspaceId) {
    set({ activeWorkspaceId: workspaceId });
  },

  async loadProjects() {
    // async-parallel: both requests are independent — fire them together.
    const [health, projects] = await Promise.all([
      client.system.health.query(),
      client.projects.list.query(),
    ]);
    const activeProjectId = get().activeProjectId ?? projects[0]?.id ?? null;
    set({
      activeProjectId,
      bootstrapped: true,
      healthStatus: health.status,
      projects,
      statusText: activeProjectId ? "Connected" : "Create a project to begin",
    });
    if (activeProjectId) await get().loadWorkspaces(activeProjectId);
  },

  async loadWorkspaces(projectId) {
    const workspaces = await client.workspaces.list.query({ projectId });
    const nextActiveWorkspaceId = get().activeWorkspaceId ?? workspaces[0]?.id ?? null;
    set((state) => ({
      activeProjectId: projectId,
      activeWorkspaceId: nextActiveWorkspaceId,
      workspacesByProject: { ...state.workspacesByProject, [projectId]: workspaces },
    }));
    // Subscription is owned by the WorkspaceRoute effect (not this function).
    // Only pre-load messages so the sidebar/welcome screen isn't empty.
    if (nextActiveWorkspaceId) {
      await get().loadMessages(nextActiveWorkspaceId);
    }
  },

  async loadMessages(workspaceId) {
    const messages = await client.workspaces.messages.query({ workspaceId });
    set((state) => ({
      messagesByWorkspace: {
        ...state.messagesByWorkspace,
        [workspaceId]: messages as AgentMessage[],
      },
    }));
    return messages as AgentMessage[];
  },

  async createProject(name) {
    const project = await client.projects.create.mutate({ name });
    set((state) => ({
      activeProjectId: project.id,
      projects: [...state.projects, project],
      statusText: `Project "${project.name}" created`,
    }));
    return project;
  },

  async createWorkspace(input) {
    const result = await client.workspaces.create.mutate(input);
    set((state) => ({
      activeWorkspaceId: result.workspace.id,
      statusText: `Workspace "${result.workspace.name}" ready`,
      workspacesByProject: {
        ...state.workspacesByProject,
        [input.projectId]: [
          ...(state.workspacesByProject[input.projectId] ?? []),
          result.workspace,
        ],
      },
    }));
    await get().loadMessages(result.workspace.id);
    // Subscription ownership stays with the route; navigate there after create.
    return result;
  },

  async promptWorkspace(workspaceId, message) {
    // Subscription is already active from the route effect — don't re-subscribe.
    // Optimistically append the user message so it's visible immediately.
    set((state) => ({
      isStreaming: true,
      streamingWorkspaceId: workspaceId,
      // rerender-functional-setstate: reset streaming state directly here
      // instead of reading stale closure values.
      streamingState: { text: "", thinking: "" },
      statusText: "Sending…",
      messagesByWorkspace: {
        ...state.messagesByWorkspace,
        [workspaceId]: [
          ...(state.messagesByWorkspace[workspaceId] ?? []),
          { role: "user", content: message },
        ],
      },
    }));
    try {
      await client.workspaces.prompt.mutate({ message, workspaceId });
      // agent_end event also calls loadMessages, but this is a safety net
      // for cases where the subscription doesn't deliver the event.
      await get().loadMessages(workspaceId);
      set({ statusText: "Ready" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Prompt failed";
      set({ isStreaming: false, streamingWorkspaceId: null, statusText: msg });
      throw error;
    }
  },

  subscribeToWorkspace(workspaceId) {
    // Cancel any existing subscription first (handles workspace switching).
    get()._unsubscribe?.();

    // Clear tool executions for the incoming workspace.
    set((state) => ({
      toolExecutionsByWorkspace: {
        ...state.toolExecutionsByWorkspace,
        [workspaceId]: {},
      },
    }));

    const subscription = client.workspaces.events.subscribe(
      { workspaceId },
      {
        onData(payload) {
          const raw = payload as { event?: unknown };
          const ev = parsePiEvent(raw.event);
          if (!ev) return;

          // Use raw object access — the catch-all union member prevents
          // TypeScript from narrowing correctly inside switch cases.
          const e = ev as Record<string, unknown>;

          switch (e.type) {
            case "agent_start":
              set({
                isStreaming: true,
                streamingWorkspaceId: workspaceId,
                streamingState: { text: "", thinking: "" },
                statusText: "Working…",
              });
              // rerender-functional-setstate: use updater form so we don't
              // close over a stale toolExecutionsByWorkspace reference.
              set((state) => ({
                toolExecutionsByWorkspace: {
                  ...state.toolExecutionsByWorkspace,
                  [workspaceId]: {},
                },
              }));
              break;

            case "agent_end":
              set({ isStreaming: false, streamingWorkspaceId: null, statusText: "Ready" });
              void get().loadMessages(workspaceId);
              break;

            case "message_start": {
              const msg = e.message as { role?: string } | undefined;
              if (msg?.role === "assistant") {
                set({ streamingState: { text: "", thinking: "" } });
              }
              break;
            }

            case "message_update": {
              const msgEv = e.assistantMessageEvent as { type: string; delta: string } | undefined;
              if (!msgEv) break;
              if (msgEv.type === "text_delta") {
                // rerender-functional-setstate: append delta to current text
                // via updater fn to avoid stale closure on streamingState.
                set((state) => ({
                  streamingState: {
                    ...state.streamingState,
                    text: state.streamingState.text + msgEv.delta,
                  },
                  statusText: "Streaming…",
                }));
              } else if (msgEv.type === "thinking_delta") {
                set((state) => ({
                  streamingState: {
                    ...state.streamingState,
                    thinking: state.streamingState.thinking + msgEv.delta,
                  },
                }));
              }
              break;
            }

            case "tool_execution_start": {
              const toolCallId = String(e.toolCallId ?? "");
              const toolName = String(e.toolName ?? "");
              const args = (e.args ?? {}) as Record<string, unknown>;
              if (!toolCallId) break;
              set((state) => ({
                statusText: `Running ${toolName}…`,
                toolExecutionsByWorkspace: {
                  ...state.toolExecutionsByWorkspace,
                  [workspaceId]: {
                    ...state.toolExecutionsByWorkspace[workspaceId],
                    [toolCallId]: { toolCallId, toolName, args, status: "pending", output: "" },
                  },
                },
              }));
              break;
            }

            case "tool_execution_update": {
              const toolCallId = String(e.toolCallId ?? "");
              if (!toolCallId) break;
              const output = formatToolResult(
                e.partialResult as Parameters<typeof formatToolResult>[0],
              );
              set((state) => {
                const ws = state.toolExecutionsByWorkspace[workspaceId];
                const existing = ws?.[toolCallId];
                if (!existing) return {};
                return {
                  toolExecutionsByWorkspace: {
                    ...state.toolExecutionsByWorkspace,
                    [workspaceId]: {
                      ...ws,
                      [toolCallId]: { ...existing, status: "streaming", output },
                    },
                  },
                };
              });
              break;
            }

            case "tool_execution_end": {
              const toolCallId = String(e.toolCallId ?? "");
              if (!toolCallId) break;
              const isError = Boolean(e.isError);
              const output = formatToolResult(e.result as Parameters<typeof formatToolResult>[0]);
              set((state) => {
                const ws = state.toolExecutionsByWorkspace[workspaceId];
                const existing = ws?.[toolCallId];
                if (!existing) return {};
                return {
                  toolExecutionsByWorkspace: {
                    ...state.toolExecutionsByWorkspace,
                    [workspaceId]: {
                      ...ws,
                      [toolCallId]: { ...existing, status: isError ? "error" : "complete", output },
                    },
                  },
                };
              });
              break;
            }

            case "auto_compaction_start":
              set({ statusText: "Compacting context…" });
              break;

            case "auto_compaction_end":
              set({ statusText: "Context compacted" });
              void get().loadMessages(workspaceId);
              break;

            default:
              break;
          }
        },
        onError(error) {
          set({ statusText: `Subscription error: ${error.message}`, isStreaming: false });
        },
      },
    );

    // Store unsubscribe fn internally so workspace switches can cancel it.
    // Also return it so the route effect can use it as cleanup.
    const unsubscribe = () => subscription.unsubscribe();
    set({ _unsubscribe: unsubscribe });
    return unsubscribe;
  },
}));

export type { AgentMessage };
