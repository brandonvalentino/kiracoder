import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function RefreshIcon() {
  return (
    <svg
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      fill="currentColor"
      height="8"
      viewBox="0 0 8 8"
      width="8"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}
    >
      <path d="M2 1l4 3-4 3z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="18"
    >
      <line x1="3" x2="21" y1="6" y2="6" />
      <line x1="3" x2="21" y1="12" y2="12" />
      <line x1="3" x2="21" y1="18" y2="18" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      fill="none"
      height="12"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="12"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Custom context menu ─────────────────────────────────────────────
// Radix ContextMenu has fundamental limitations: each Root is fully
// uncontrolled (no `open` prop) and independent instances can't
// coordinate to enforce "one menu at a time".  Instead of fighting
// Radix, we implement a lightweight custom context menu that gives us
// full control over positioning, open state, and dismiss behavior.

type ContextTarget =
  | { type: "project"; projectId: string; projectName: string }
  | { type: "workspace"; workspaceId: string; projectId: string };

function SidebarContextMenu({
  target,
  position,
  onClose,
  onDeleteProject,
  onDeleteWorkspace,
}: {
  target: ContextTarget;
  position: { x: number; y: number };
  onClose: () => void;
  onDeleteProject: (id: string, name: string) => void;
  onDeleteWorkspace: (workspaceId: string, projectId: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or blur
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleScroll() {
      onClose();
    }
    // Use a microtask so the menu doesn't immediately close from the
    // same pointerdown that triggered the contextmenu event.
    queueMicrotask(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  // Adjust position to avoid going off-screen
  const style: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: 300,
  };

  return (
    <div
      ref={menuRef}
      className="min-w-48 overflow-hidden rounded-2xl bg-popover p-1 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 animate-in fade-in-0 zoom-in-95"
      style={style}
    >
      {target.type === "project" && (
        <button
          className="relative flex w-full cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive outline-hidden select-none hover:bg-destructive/10 focus:bg-destructive/10"
          onClick={() => {
            onDeleteProject(target.projectId, target.projectName);
            onClose();
          }}
        >
          Delete Project
        </button>
      )}
      {target.type === "workspace" && (
        <button
          className="relative flex w-full cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive outline-hidden select-none hover:bg-destructive/10 focus:bg-destructive/10"
          onClick={() => {
            onDeleteWorkspace(target.workspaceId, target.projectId);
            onClose();
          }}
        >
          Delete Workspace
        </button>
      )}
    </div>
  );
}

// ── Icon button (shared in sidebar header) ──────────────────────────
function IconBtn({
  children,
  active,
  spinning,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  spinning?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border-none p-0 transition-all duration-[var(--duration)]${
        spinning ? " animate-[spin_0.5s_ease]" : ""
      }`}
      style={{
        background: active ? "var(--bg-glass-active)" : "transparent",
        color: active ? "var(--text-secondary)" : "var(--text-dim)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-glass-hover)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? "var(--bg-glass-active)"
          : "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = active
          ? "var(--text-secondary)"
          : "var(--text-dim)";
      }}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const projects = useAppStore((s) => s.projects);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const workspacesByProject = useAppStore((s) => s.workspacesByProject);
  const healthStatus = useAppStore((s) => s.healthStatus);
  const statusText = useAppStore((s) => s.statusText);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const bootstrapped = useAppStore((s) => s.bootstrapped);

  const loadWorkspaces = useAppStore((s) => s.loadWorkspaces);
  const createProject = useAppStore((s) => s.createProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const createWorkspace = useAppStore((s) => s.createWorkspace);
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace);
  const selectProject = useAppStore((s) => s.selectProject);
  const selectWorkspace = useAppStore((s) => s.selectWorkspace);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [refreshing, setRefreshing] = useState(false);

  // Alert dialog state
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Custom context menu state
  const [ctxMenu, setCtxMenu] = useState<{
    target: ContextTarget;
    position: { x: number; y: number };
  } | null>(null);

  // New project form
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const newProjectInputRef = useRef<HTMLInputElement>(null);

  // New workspace form
  const [newWorkspaceForProject, setNewWorkspaceForProject] = useState<
    string | null
  >(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspacePath, setWorkspacePath] = useState("");
  const newWorkspaceInputRef = useRef<HTMLInputElement>(null);

  // Derived status indicator class
  const indicatorStatus = isStreaming
    ? "streaming"
    : healthStatus === "ok"
      ? "connected"
      : "disconnected";

  useEffect(() => {
    if (bootstrapped) return;
    void useAppStore.getState().loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showNewProject) {
      setTimeout(() => newProjectInputRef.current?.focus(), 50);
    }
  }, [showNewProject]);

  useEffect(() => {
    if (newWorkspaceForProject) {
      setTimeout(() => newWorkspaceInputRef.current?.focus(), 50);
    }
  }, [newWorkspaceForProject]);

  function toggleProject(id: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRefresh() {
    setRefreshing(true);
    await useAppStore.getState().loadProjects();
    setTimeout(() => setRefreshing(false), 600);
  }

  async function handleCreateProject() {
    if (!projectName.trim()) return;
    const project = await createProject(projectName.trim());
    setProjectName("");
    setShowNewProject(false);
    await loadWorkspaces(project.id);
  }

  async function handleCreateWorkspace() {
    if (!newWorkspaceForProject || !workspaceName.trim()) return;
    const result = await createWorkspace({
      cwd: workspacePath.trim() || undefined,
      name: workspaceName.trim(),
      projectId: newWorkspaceForProject,
    });
    setWorkspaceName("");
    setWorkspacePath("");
    setNewWorkspaceForProject(null);
    selectWorkspace(result.workspace.id);
    await navigate({
      to: "/workspaces/$workspaceId",
      params: { workspaceId: result.workspace.id },
    });
  }

  async function handleDeleteProjectConfirm() {
    if (!itemToDelete) return;
    const snapshot = itemToDelete;
    setItemToDelete(null);
    await deleteProject(snapshot.id);
    if (activeProjectId === snapshot.id) {
      navigate({ to: "/" });
    }
  }

  function handleDeleteWorkspaceDirect(workspaceId: string, projectId: string) {
    void deleteWorkspace(workspaceId, projectId).then(() => {
      if (activeWorkspaceId === workspaceId) void navigate({ to: "/" });
    });
  }

  // Handle right-click on sidebar items via native contextmenu event
  function handleSidebarContextMenu(e: React.MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-ctx-project], [data-ctx-workspace]",
    );
    if (!el) return; // Right-clicked empty area — use browser default

    e.preventDefault();

    if (el.dataset.ctxProject) {
      setCtxMenu({
        target: {
          type: "project",
          projectId: el.dataset.ctxProject,
          projectName: el.dataset.ctxName ?? "",
        },
        position: { x: e.clientX, y: e.clientY },
      });
    } else if (el.dataset.ctxWorkspace) {
      setCtxMenu({
        target: {
          type: "workspace",
          workspaceId: el.dataset.ctxWorkspace,
          projectId: el.dataset.ctxProjectid ?? "",
        },
        position: { x: e.clientX, y: e.clientY },
      });
    }
  }

  // Sidebar input shared styles
  const sidebarInputStyle: React.CSSProperties = {
    background: "var(--bg-glass-strong)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    fontFamily: "inherit",
  };

  return (
    /* app-layout: full-viewport flex row */
    <div className="relative flex h-screen overflow-hidden" style={{ height: "100dvh" }}>
      <AlertDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{itemToDelete?.name}</strong>? All workspaces inside it
              will also be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteProjectConfirm()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom context menu — rendered as a portal-like fixed element */}
      {ctxMenu && (
        <SidebarContextMenu
          target={ctxMenu.target}
          position={ctxMenu.position}
          onClose={() => setCtxMenu(null)}
          onDeleteProject={(id, name) => setItemToDelete({ id, name })}
          onDeleteWorkspace={handleDeleteWorkspaceDirect}
        />
      )}

      {/* ── Left sidebar ─────────────────────────────── */}
      {/* sidebar: fixed-width panel with frosted glass */}
      <div
        ref={sidebarRef}
        className="relative z-[100] flex flex-col border-r transition-[margin-left] duration-300"
        id="sidebar"
        style={{
          width: "var(--sidebar-width)",
          minWidth: "var(--sidebar-width)",
          background: "var(--sidebar-bg)",
          backdropFilter: "blur(var(--blur-heavy)) saturate(1.5)",
          WebkitBackdropFilter: "blur(var(--blur-heavy)) saturate(1.5)",
          borderColor: "var(--border)",
          marginLeft: sidebarOpen ? 0 : "calc(var(--sidebar-width) * -1)",
          // Mobile override applied via inline media
        }}
        onContextMenu={handleSidebarContextMenu}
      >
        {/* sidebar-header */}
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-3.5">
          {/* sidebar-brand */}
          <span
            className="text-[16px] font-bold tracking-[-0.01em] opacity-90"
            style={{ color: "var(--text-primary)" }}
          >
            KiraCode
          </span>
          {/* sidebar-header-actions */}
          <div className="flex gap-0.5">
            <IconBtn
              spinning={refreshing}
              onClick={() => void handleRefresh()}
              title="Refresh"
            >
              <RefreshIcon />
            </IconBtn>
            <IconBtn
              active={showNewProject}
              onClick={() => {
                setShowNewProject((v) => !v);
                setNewWorkspaceForProject(null);
              }}
              title="New project"
            >
              <PlusIcon size={13} />
            </IconBtn>
          </div>
        </div>

        {/* New project form */}
        {showNewProject && (
          <div
            className="flex shrink-0 flex-col gap-1.5 border-b px-3 pb-3 pt-2.5"
            style={{
              background: "var(--bg-glass)",
              borderColor: "var(--border)",
            }}
          >
            <input
              ref={newProjectInputRef}
              className="w-full rounded-[var(--radius-md)] px-2.5 py-[7px] text-[12px] outline-none transition-all placeholder:text-[var(--text-dim)] focus:border-[var(--border-hover)] focus:bg-[var(--bg-glass-hover)]"
              style={sidebarInputStyle}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateProject();
                if (e.key === "Escape") {
                  setShowNewProject(false);
                  setProjectName("");
                }
              }}
              placeholder="Project name…"
              value={projectName}
            />
            <button
              className="self-end cursor-pointer rounded-[var(--radius-md)] border px-3 py-[5px] text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                background: "var(--bg-glass-active)",
                borderColor: "var(--border-hover)",
                color: "var(--text-secondary)",
                fontFamily: "inherit",
              }}
              disabled={!projectName.trim()}
              onClick={() => void handleCreateProject()}
              type="button"
            >
              Create
            </button>
          </div>
        )}

        {/* session-list: scrollable project/workspace tree */}
        <div
          className="flex-1 overflow-y-auto py-2 pb-4"
          style={{ scrollbarWidth: "none" }}
        >
          {projects.length === 0 ? (
            /* session-empty */
            <div
              className="flex flex-col items-center gap-2.5 px-5 py-10 text-center text-[12px]"
              style={{ color: "var(--text-dim)" }}
            >
              {bootstrapped ? (
                <>
                  <span>No projects yet.</span>
                  <button
                    className="cursor-pointer border-none bg-none p-0 text-[12px] transition-colors hover:text-[var(--text-primary)]"
                    style={{ background: "none", color: "var(--text-secondary)", fontFamily: "inherit" }}
                    onClick={() => setShowNewProject(true)}
                    type="button"
                  >
                    Create your first project →
                  </button>
                </>
              ) : (
                "Loading…"
              )}
            </div>
          ) : (
            projects.map((project) => {
              const workspaces = workspacesByProject[project.id] ?? [];
              const isCollapsed = collapsedProjects.has(project.id);
              const isActive = project.id === activeProjectId;
              const isAddingWorkspace = newWorkspaceForProject === project.id;

              return (
                /* project-group */
                <div className="mb-1" key={project.id}>
                  {/* project-header */}
                  <div
                    className="group relative mx-1.5 flex cursor-pointer select-none items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 transition-colors hover:bg-[var(--bg-glass)]"
                    data-ctx-project={project.id}
                    data-ctx-name={project.name}
                    onClick={async () => {
                      selectProject(project.id);
                      if (!workspacesByProject[project.id]) {
                        await loadWorkspaces(project.id);
                      }
                      toggleProject(project.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") toggleProject(project.id);
                    }}
                  >
                    {/* project-chevron */}
                    <span
                      className="flex shrink-0 items-center opacity-50"
                      style={{ color: "var(--text-dim)" }}
                    >
                      <ChevronIcon expanded={!isCollapsed} />
                    </span>
                    {/* project-name */}
                    <span
                      className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold"
                      style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      {project.name}
                    </span>
                    {/* project-count */}
                    <span
                      className="shrink-0 rounded-[10px] border px-1.5 py-px text-[10px] font-medium leading-[1.4] transition-opacity group-hover:opacity-0 group-hover:pointer-events-none"
                      style={{
                        color: "var(--text-dim)",
                        background: "var(--bg-glass)",
                        borderColor: "var(--border)",
                      }}
                    >
                      {workspaces.length}
                    </span>
                    {/* project-add-btn */}
                    <button
                      className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] border-none bg-transparent p-0 opacity-0 transition-all group-hover:opacity-100 hover:!bg-[var(--bg-glass-hover)] hover:!text-[var(--text-secondary)] hover:!opacity-100"
                      style={{ color: "var(--text-dim)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectProject(project.id);
                        if (!workspacesByProject[project.id])
                          void loadWorkspaces(project.id);
                        setNewWorkspaceForProject(
                          isAddingWorkspace ? null : project.id,
                        );
                        setWorkspaceName("");
                        setWorkspacePath("");
                        setShowNewProject(false);
                        if (isCollapsed) toggleProject(project.id);
                      }}
                      title="Add workspace"
                      type="button"
                    >
                      <PlusIcon size={10} />
                    </button>
                  </div>

                  {/* Workspace list + optional new-workspace form */}
                  {!isCollapsed && (
                    /* project-sessions */
                    <div className="flex flex-col gap-px pt-0.5">
                      {isAddingWorkspace && (
                        /* workspace-create-form */
                        <div
                          className="flex flex-col gap-1.5 border-t px-3 pb-2.5 pt-2 pl-6"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            borderColor: "var(--border)",
                            marginBottom: 2,
                          }}
                        >
                          <input
                            ref={newWorkspaceInputRef}
                            className="w-full rounded-[var(--radius-md)] px-2.5 py-[7px] text-[12px] outline-none transition-all placeholder:text-[var(--text-dim)]"
                            style={sidebarInputStyle}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleCreateWorkspace();
                              if (e.key === "Escape") setNewWorkspaceForProject(null);
                            }}
                            placeholder="Workspace name…"
                            value={workspaceName}
                          />
                          <input
                            className="w-full rounded-[var(--radius-md)] px-2.5 py-[7px] text-[12px] outline-none transition-all placeholder:text-[var(--text-dim)]"
                            style={sidebarInputStyle}
                            onChange={(e) => setWorkspacePath(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleCreateWorkspace();
                              if (e.key === "Escape") setNewWorkspaceForProject(null);
                            }}
                            placeholder="Folder path (optional)"
                            value={workspacePath}
                          />
                          <button
                            className="self-end cursor-pointer rounded-[var(--radius-md)] border px-3 py-[5px] text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-35"
                            style={{
                              background: "var(--bg-glass-active)",
                              borderColor: "var(--border-hover)",
                              color: "var(--text-secondary)",
                              fontFamily: "inherit",
                            }}
                            disabled={!workspaceName.trim()}
                            onClick={() => void handleCreateWorkspace()}
                            type="button"
                          >
                            Create
                          </button>
                        </div>
                      )}

                      {workspaces.length === 0 && !isAddingWorkspace ? (
                        /* workspace-empty */
                        <div
                          className="px-3 py-1.5 pl-[26px] text-[11px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          No workspaces
                        </div>
                      ) : null}

                      {workspaces.map((workspace) => {
                        const isWsActive = workspace.id === activeWorkspaceId;
                        const wsStatus =
                          useAppStore.getState().workspaceStatuses[workspace.id];
                        const isBroken = wsStatus?.type === "broken";
                        return (
                          /* session-item */
                          <Link
                            key={workspace.id}
                            className="mx-1.5 flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 py-[7px] pl-[26px] no-underline transition-all hover:bg-[var(--bg-glass)]"
                            style={{
                              color: "inherit",
                              background: isWsActive ? "var(--bg-glass-active)" : undefined,
                            }}
                            data-ctx-workspace={workspace.id}
                            data-ctx-projectid={project.id}
                            onClick={() => selectWorkspace(workspace.id)}
                            params={{ workspaceId: workspace.id }}
                            title={workspace.cwd || undefined}
                            to="/workspaces/$workspaceId"
                          >
                            {/* session-icon */}
                            <span
                              className="flex shrink-0 items-center"
                              style={{
                                color: isBroken
                                  ? "var(--error)"
                                  : isWsActive
                                    ? "var(--accent-text)"
                                    : "var(--text-dim)",
                                opacity: isWsActive && !isBroken ? 0.7 : 1,
                              }}
                            >
                              {isBroken ? (
                                <svg
                                  fill="currentColor"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  width="12"
                                >
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                  <line
                                    stroke="white"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                    x1="12"
                                    x2="12"
                                    y1="9"
                                    y2="13"
                                  />
                                  <line
                                    stroke="white"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                    x1="12"
                                    x2="12.01"
                                    y1="17"
                                    y2="17"
                                  />
                                </svg>
                              ) : (
                                <FolderIcon />
                              )}
                            </span>
                            {/* session-info */}
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                              {/* session-title */}
                              <span
                                className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium"
                                style={{
                                  color: isBroken
                                    ? "var(--error)"
                                    : isWsActive
                                      ? "var(--text-primary)"
                                      : "var(--text-secondary)",
                                  opacity: isBroken ? 0.8 : 1,
                                }}
                              >
                                {workspace.name}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile overlay — hidden on desktop */}
      <div
        className="fixed inset-0 z-[99] hidden"
        id="sidebar-overlay"
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(8px)",
          // shown on mobile when sidebar is open
          display: !sidebarOpen ? "block" : "none",
          opacity: !sidebarOpen ? 1 : 0,
          pointerEvents: !sidebarOpen ? "auto" : "none",
        }}
        onClick={() => setSidebarOpen(true)}
      />

      {/* ── Main area ──────────────────────────────── */}
      {/* main: flex column, fills remaining space */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* header: frosted top bar */}
        <div
          className="z-10 flex min-h-11 shrink-0 items-center justify-between border-b px-4 py-2"
          style={{
            background: "var(--header-bg)",
            backdropFilter: "blur(40px) saturate(1.5)",
            WebkitBackdropFilter: "blur(40px) saturate(1.5)",
            borderColor: "var(--border)",
          }}
        >
          {/* header-left */}
          <div className="flex items-center gap-2.5">
            {/* sidebar-toggle */}
            <button
              className="flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border-none bg-transparent p-1.5 transition-all hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]"
              id="sidebar-toggle"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => setSidebarOpen((v) => !v)}
              title="Toggle sidebar"
              type="button"
            >
              <MenuIcon />
            </button>

            {/* status indicator */}
            <div
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--text-dim)" }}
            >
              {/* status-indicator dot */}
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-400${
                  indicatorStatus === "streaming"
                    ? " animate-[pulse_1.5s_infinite]"
                    : indicatorStatus === "connected"
                      ? " animate-[connectPop_0.4s_var(--spring)]"
                      : ""
                }`}
                id="status-indicator"
                style={{
                  background:
                    indicatorStatus === "connected"
                      ? "var(--success)"
                      : indicatorStatus === "streaming"
                        ? "var(--accent)"
                        : indicatorStatus === "disconnected"
                          ? "var(--error)"
                          : "var(--text-dim)",
                  boxShadow:
                    indicatorStatus === "connected"
                      ? "0 0 8px rgba(52, 211, 153, 0.5)"
                      : indicatorStatus === "streaming"
                        ? "0 0 12px var(--accent-glow)"
                        : indicatorStatus === "disconnected"
                          ? "0 0 8px rgba(248, 113, 113, 0.4)"
                          : "none",
                }}
              />
              <span id="status-text">
                {isStreaming ? "Working…" : statusText}
              </span>
            </div>
          </div>

          {/* header-right */}
          <div className="flex items-center gap-2.5">
            {/* settings-btn */}
            <button
              className="flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border-none bg-transparent p-1.5 transition-all hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]"
              id="settings-btn"
              style={{ color: "var(--text-secondary)" }}
              title="Settings"
              type="button"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>

        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  );
}
