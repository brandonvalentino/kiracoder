import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";

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

function PlusIcon() {
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
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      fill="none"
      height="8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
      viewBox="0 0 10 6"
      width="10"
    >
      <path d="M2 1l4 3-4 3z" fill="currentColor" stroke="none" />
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

  // rerender-defer-reads: these functions are only used inside callbacks /
  // event handlers, never during render — read via getState() at call time
  // so they don't add to the component's subscription surface.
  // (Individual subscriptions below are only for values used in JSX.)
  const loadWorkspaces = useAppStore((s) => s.loadWorkspaces);
  const createProject = useAppStore((s) => s.createProject);
  const createWorkspace = useAppStore((s) => s.createWorkspace);
  const selectProject = useAppStore((s) => s.selectProject);
  const selectWorkspace = useAppStore((s) => s.selectWorkspace);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspacePath, setWorkspacePath] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Status indicator class
  const indicatorClass = isStreaming
    ? "status-indicator streaming"
    : healthStatus === "ok"
      ? "status-indicator connected"
      : "status-indicator";

  useEffect(() => {
    // advanced-init-once: guard against React Strict Mode double-invoke.
    // rerender-defer-reads: read loadProjects at call time via getState()
    // — it's only used inside this callback, not for rendering.
    if (bootstrapped) return;
    void useAppStore.getState().loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount — bootstrapped becoming true prevents double load

  function toggleProject(id: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
    await loadWorkspaces(project.id);
  }

  async function handleCreateWorkspace() {
    if (!activeProjectId || !workspaceName.trim()) return;
    const result = await createWorkspace({
      cwd: workspacePath.trim() || undefined,
      name: workspaceName.trim(),
      projectId: activeProjectId,
    });
    setWorkspaceName("");
    setWorkspacePath("");
    selectWorkspace(result.workspace.id);
    await navigate({
      to: "/workspaces/$workspaceId",
      params: { workspaceId: result.workspace.id },
    });
  }

  return (
    <div className="app-layout">
      {/* ── Left sidebar ─────────────────────────────── */}
      <div className={`sidebar${sidebarOpen ? "" : " collapsed"}`} id="sidebar">
        <div className="sidebar-header">
          {/* Logo / brand */}
          <div className="mode-toggle">
            <span
              className="mode-link active"
              style={{ width: 36, height: 32, fontWeight: 700, fontSize: 15 }}
            >
              K
            </span>
          </div>

          <input
            className="sidebar-search-input"
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateProject();
            }}
            placeholder="New project…"
            value={projectName}
          />

          <div className="sidebar-actions">
            <button
              className={`icon-btn${refreshing ? " spinning" : ""}`}
              onClick={() => void handleRefresh()}
              title="Refresh"
              type="button"
            >
              <RefreshIcon />
            </button>
            {projectName.trim() ? (
              <button
                className="icon-btn"
                onClick={() => void handleCreateProject()}
                title="Create project"
                type="button"
              >
                <PlusIcon />
              </button>
            ) : null}
          </div>
        </div>

        {/* Session / workspace list */}
        <div className="session-list">
          {projects.length === 0 ? (
            <div className="session-loading">
              {bootstrapped ? "No projects yet. Create one above." : "Loading…"}
            </div>
          ) : (
            projects.map((project) => {
              const workspaces = workspacesByProject[project.id] ?? [];
              const isCollapsed = collapsedProjects.has(project.id);
              const isActive = project.id === activeProjectId;

              return (
                <div className="project-group" key={project.id}>
                  <div
                    className={`project-header${isCollapsed ? " collapsed" : ""}${isActive ? " favourites-header" : ""}`}
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
                    <span className="chevron">
                      <ChevronIcon expanded={!isCollapsed} />
                    </span>
                    {project.name}
                    <span className="project-count">{workspaces.length}</span>
                  </div>

                  <div className={`project-sessions${isCollapsed ? " collapsed" : ""}`}>
                    {/* Workspace creation row — only shown when project is active */}
                    {isActive && !isCollapsed ? (
                      <div
                        style={{
                          padding: "4px 8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <input
                          className="sidebar-search-input"
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleCreateWorkspace();
                          }}
                          placeholder="New workspace…"
                          style={{ fontSize: 11 }}
                          value={workspaceName}
                        />
                        <input
                          className="sidebar-search-input"
                          onChange={(e) => setWorkspacePath(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleCreateWorkspace();
                          }}
                          placeholder="Folder path (optional)"
                          style={{ fontSize: 11 }}
                          value={workspacePath}
                        />
                        {workspaceName.trim() ? (
                          <button
                            className="icon-btn"
                            onClick={() => void handleCreateWorkspace()}
                            style={{ alignSelf: "flex-end" }}
                            title="Create workspace"
                            type="button"
                          >
                            <PlusIcon />
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {workspaces.map((workspace) => {
                      const isWsActive = workspace.id === activeWorkspaceId;
                      return (
                        <Link
                          className={`session-item${isWsActive ? " active" : ""}`}
                          key={workspace.id}
                          onClick={() => selectWorkspace(workspace.id)}
                          params={{ workspaceId: workspace.id }}
                          to="/workspaces/$workspaceId"
                        >
                          <div className="session-title-row">
                            <span className="session-title">{workspace.name}</span>
                          </div>
                          <div className="session-meta">{workspace.cwd}</div>
                        </Link>
                      );
                    })}

                    {workspaces.length === 0 && !isCollapsed ? (
                      <div
                        style={{
                          padding: "8px 12px",
                          fontSize: 11,
                          color: "var(--text-dim)",
                        }}
                      >
                        No workspaces yet
                      </div>
                    ) : null}
                  </div>
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
        {/* Header */}
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
            <button className="settings-btn" id="settings-btn" title="Settings" type="button">
              <SettingsIcon />
            </button>
          </div>
        </div>

        {/* Content (routed) */}
        <Outlet />
      </div>
    </div>
  );
}
