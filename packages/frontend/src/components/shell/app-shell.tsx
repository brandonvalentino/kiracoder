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

  const indicatorClass = isStreaming
    ? "status-indicator streaming"
    : healthStatus === "ok"
      ? "status-indicator connected"
      : "status-indicator";

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

  return (
    <div className="app-layout">
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
      <div
        ref={sidebarRef}
        className={`sidebar${sidebarOpen ? "" : " collapsed"}`}
        id="sidebar"
        onContextMenu={handleSidebarContextMenu}
      >
        {/* Sidebar header */}
        <div className="sidebar-header">
          <span className="sidebar-brand">KiraCode</span>
          <div className="sidebar-header-actions">
            <button
              className={`icon-btn${refreshing ? " spinning" : ""}`}
              onClick={() => void handleRefresh()}
              title="Refresh"
              type="button"
            >
              <RefreshIcon />
            </button>
            <button
              className={`icon-btn${showNewProject ? " active" : ""}`}
              onClick={() => {
                setShowNewProject((v) => !v);
                setNewWorkspaceForProject(null);
              }}
              title="New project"
              type="button"
            >
              <PlusIcon size={13} />
            </button>
          </div>
        </div>

        {/* New project form */}
        {showNewProject && (
          <div className="sidebar-create-form">
            <input
              ref={newProjectInputRef}
              className="sidebar-input"
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
              className="sidebar-create-btn"
              disabled={!projectName.trim()}
              onClick={() => void handleCreateProject()}
              type="button"
            >
              Create
            </button>
          </div>
        )}

        {/* Project / workspace list */}
        <div className="session-list">
          {projects.length === 0 ? (
            <div className="session-empty">
              {bootstrapped ? (
                <>
                  <span>No projects yet.</span>
                  <button
                    className="session-empty-cta"
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
                <div className="project-group" key={project.id}>
                  {/* Project header row */}
                  <div
                    className={`project-header${isActive ? " active" : ""}`}
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
                    <span className="project-chevron">
                      <ChevronIcon expanded={!isCollapsed} />
                    </span>
                    <span className="project-name">{project.name}</span>
                    <span className="project-count">{workspaces.length}</span>
                    <button
                      className="project-add-btn"
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
                    <div className="project-sessions">
                      {isAddingWorkspace && (
                        <div className="sidebar-create-form workspace-create-form">
                          <input
                            ref={newWorkspaceInputRef}
                            className="sidebar-input"
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                void handleCreateWorkspace();
                              if (e.key === "Escape") {
                                setNewWorkspaceForProject(null);
                              }
                            }}
                            placeholder="Workspace name…"
                            value={workspaceName}
                          />
                          <input
                            className="sidebar-input"
                            onChange={(e) => setWorkspacePath(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                void handleCreateWorkspace();
                              if (e.key === "Escape") {
                                setNewWorkspaceForProject(null);
                              }
                            }}
                            placeholder="Folder path (optional)"
                            value={workspacePath}
                          />
                          <button
                            className="sidebar-create-btn"
                            disabled={!workspaceName.trim()}
                            onClick={() => void handleCreateWorkspace()}
                            type="button"
                          >
                            Create
                          </button>
                        </div>
                      )}

                      {workspaces.length === 0 && !isAddingWorkspace ? (
                        <div className="workspace-empty">No workspaces</div>
                      ) : null}

                      {workspaces.map((workspace) => {
                        const isWsActive = workspace.id === activeWorkspaceId;
                        const wsStatus =
                          useAppStore.getState().workspaceStatuses[
                            workspace.id
                          ];
                        const isBroken = wsStatus?.type === "broken";
                        return (
                          <Link
                            key={workspace.id}
                            className={`session-item${isWsActive ? " active" : ""}`}
                            data-ctx-workspace={workspace.id}
                            data-ctx-projectid={project.id}
                            onClick={() => selectWorkspace(workspace.id)}
                            params={{ workspaceId: workspace.id }}
                            title={workspace.cwd || undefined}
                            to="/workspaces/$workspaceId"
                          >
                            <span
                              className="session-icon"
                              style={
                                isBroken
                                  ? { color: "var(--error)" }
                                  : undefined
                              }
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
                            <div className="session-info">
                              <span
                                className="session-title"
                                style={
                                  isBroken
                                    ? {
                                        color: "var(--error)",
                                        opacity: 0.8,
                                      }
                                    : undefined
                                }
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

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${!sidebarOpen ? " visible" : ""}`}
        id="sidebar-overlay"
        onClick={() => setSidebarOpen(true)}
      />

      {/* ── Main area ──────────────────────────────── */}
      <div className="main">
        <div className="header">
          <div className="header-left">
            <button
              className="sidebar-toggle"
              id="sidebar-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              title="Toggle sidebar"
              type="button"
            >
              <MenuIcon />
            </button>

            <div className="status">
              <span className={indicatorClass} id="status-indicator" />
              <span className="status-text" id="status-text">
                {isStreaming ? "Working…" : statusText}
              </span>
            </div>
          </div>

          <div className="header-right">
            <div
              className="pill"
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                color: "var(--text-dim)",
                display: pathname.startsWith("/workspaces/") ? "none" : "none",
              }}
            >
              {pathname}
            </div>
            <button
              className="settings-btn"
              id="settings-btn"
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
