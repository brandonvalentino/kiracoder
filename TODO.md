# KiraCode TODO

Living checklist for turning the current prototype into a fully working, production-ready local app.

## Current status

KiraCode already has a working foundation:

- monorepo with Turborepo
- TypeScript across app/packages
- Oxlint + Oxfmt configured
- local backend runner in `apps/web`
- backend package with tRPC API
- frontend package with React + Vite + TanStack Router + Zustand
- Tau-inspired shell/layout ported into React
- Pi SDK-backed workspace session creation
- Pi-compatible session files written to `~/.kiracode/sessions`
- backend can serve the built frontend
- split dev mode (`dev:backend`, `dev:frontend`, `dev:full`)

---

## Done

### Architecture / repo
- [x] Create monorepo structure with `apps/*` and `packages/*`
- [x] Add Turborepo workspace orchestration
- [x] Add TypeScript baseline config
- [x] Add Oxlint and Oxfmt
- [x] Preserve old Tau code in `apps/tau-legacy`
- [x] Scaffold core packages:
  - [x] `@kiracode/backend`
  - [x] `@kiracode/frontend`
  - [x] `@kiracode/session-runtime`
  - [x] `@kiracode/config`
  - [x] `@kiracode/db`
  - [x] `@kiracode/native`
  - [x] `@kiracode/shared`
  - [x] `@kiracode/ui`
  - [x] `@kiracode/defaults`

### Backend / runtime
- [x] Create backend app context
- [x] Add in-memory project/workspace persistence layer stub
- [x] Add workspace creation flow
- [x] Add Pi SDK session bootstrap with `createAgentSession()`
- [x] Store session files under `~/.kiracode/sessions`
- [x] Add runtime manager for loading/disposal of sessions
- [x] Add tRPC setup and app router
- [x] Add backend procedures for:
  - [x] `system.health`
  - [x] `projects.create`
  - [x] `projects.list`
  - [x] `workspaces.create`
  - [x] `workspaces.list`
  - [x] `workspaces.messages`
  - [x] `workspaces.prompt`
  - [x] `workspaces.events`
- [x] Add backend HTTP server
- [x] Serve built frontend from backend

### Frontend
- [x] Set up Vite React frontend package
- [x] Add TanStack Router
- [x] Add Zustand store
- [x] Add Tau-inspired shell layout in React
- [x] Add project/workspace sidebar
- [x] Add workspace route
- [x] Add chat view
- [x] Add basic UI primitives (button/input/card/etc.)
- [x] Add tRPC client integration
- [x] Add frontend subscription handling for workspace events

### DX / workflows
- [x] Add backend-only dev script
- [x] Add frontend-only dev script
- [x] Add combined full-stack dev script
- [x] Document current dev commands in `README.md`

---

## What looks done but isn't

These exist in code but are **not actually working end-to-end**.

### Pi workspace integration
The wiring is present (frontend → tRPC → SDK) but has never been tested against a real provider:
- [ ] `workspaces.prompt` calls `session.prompt()` via the Pi SDK, but has **never been run against a real model** — will fail if auth or model config is missing
- [ ] **No streaming in the UI** — `promptWorkspace` blocks until the full response is done, then calls `loadMessages`; no tokens appear while the model is thinking
- [ ] Event subscription pipeline exists but has **not been tested in real conditions** — event types from Pi SDK are not yet mapped to meaningful UI states

### Persistence
- [x] Projects and workspaces now persist to LibSQL at `~/.kiracode/app.db`
- [x] Session files survive backend restart and are lazily reopened on first access
- [x] Missing/corrupt session file surfaces as a typed tRPC error (`PRECONDITION_FAILED`)

### Workspace lifecycle
- [x] Workspace re-open works — DB row → `openWorkspaceSession` on demand
- [x] Concurrent reopen requests coalesce into a single in-flight promise
- [ ] **Idle session disposal is not implemented**

### Folder picker
- [ ] `packages/native/src/pick-folder.ts` returns `process.env.KIRACODE_FOLDER || process.cwd()` — it is a stub, not a real dialog

---

## In progress / partial

These exist and are partially correct but need finishing.

### Frontend UX
- [x] Broken workspace state: missing/corrupt session shows recovery screen with "Create new session"
- [x] Workspace errors caught in `loadMessages`, `promptWorkspace`, and subscription `onError`
- [x] Error boundaries wrap the workspace route and main outlet
- [ ] Subscription reconnect on page refresh is not reliable
- [ ] Event rendering shows raw event type strings, not useful UI
- [ ] Chat messages render as plain `<pre>` blocks, not formatted markdown
- [ ] Loading/empty/error states missing in other parts of the UI (sidebar, project list, etc.)
- [ ] Mobile/responsive behavior is untested

---

## Must do for a production-ready v1

### 1. Storage and app state
- [x] Implement LibSQL in `@kiracode/db` (local file mode, upgrade-ready to Turso)
- [x] Store projects persistently
- [x] Store workspaces persistently (including `session_file` reference)
- [ ] Store app-level metadata:
  - [ ] tags
  - [ ] favorites
  - [ ] defaults package version history
  - [ ] runtime state snapshots
- [ ] Add durable settings file handling under `~/.kiracode/`

### 2. Workspace lifecycle
- [ ] Make workspace creation fully UI-driven
- [ ] Implement native folder picker in `@kiracode/native`
- [x] Implement workspace re-open from saved DB records
- [x] Reload existing Pi session files via SDK on demand (lazy, via `ensureWorkspaceRuntime`)
- [ ] Dispose idle workspaces from memory
- [x] Rehydrate unloaded workspaces on access
- [x] Prevent duplicate runtimes for the same workspace

### 3. Prompting and event streaming
- [ ] Confirm tRPC subscription behavior is robust under real prompts
- [ ] Surface assistant streaming in the UI, not just final messages
- [ ] Render tool execution start/update/end events
- [ ] Render compaction/retry events
- [ ] Handle prompt abort/cancel
- [ ] Add optimistic composer state while prompt is running
- [ ] Add reconnect/resubscribe behavior if frontend refreshes

### 4. Session features expected from the product spec
- [ ] Implement branch/tree navigation UI for Pi session trees
- [ ] Implement workspace/session rename support
- [ ] Implement full-text search across workspaces
- [ ] Implement tags and favorites
- [ ] Implement JSONL export from UI
- [ ] Show workspace/session runtime status badges
- [ ] Track and display context/model/thinking metadata where appropriate

### 5. Extension compatibility
- [ ] Implement extension UI bridge for supported methods:
  - [ ] `select`
  - [ ] `confirm`
  - [ ] `input`
  - [ ] `editor`
  - [ ] `notify`
  - [ ] `setStatus`
  - [ ] `setWidget`
- [ ] Fail loudly for unsupported extension UI APIs
- [ ] Test with real extensions loaded through the SDK
- [ ] Decide how bundled defaults package extensions surface in the web UI

### 6. Defaults package and resource loading
- [ ] Implement actual KiraCode defaults package contents
- [ ] Load defaults package automatically in the runtime
- [ ] Enforce precedence: project > app > user
- [ ] Ignore Pi themes in runtime/resource pipeline
- [ ] Track defaults package compatibility/version drift

### 7. Frontend polish
- [ ] Replace current minimal components with fuller shadcn-style component set where needed
- [ ] Add dedicated pages/routes for:
  - [ ] project overview
  - [ ] workspace chat
  - [ ] settings
  - [ ] search
- [ ] Improve typography, spacing, and chat rendering to match Tau quality
- [ ] Add markdown rendering for assistant messages
- [ ] Add image attachment previews
- [ ] Add file preview panel
- [ ] Add diff rendering for edits/tool results
- [ ] Add keyboard shortcuts where useful

### 8. Native/local integrations
- [ ] Implement real native folder picker
- [ ] Implement open/reveal in system file manager
- [ ] Add browser auto-open for local app startup
- [ ] Normalize behavior across macOS/Linux/Windows where possible

### 9. Error handling and resilience
- [x] Add structured backend error handling (typed workspace errors → tRPC codes)
- [x] Add frontend error boundaries (workspace route + main outlet)
- [x] Handle corrupted/missing session files gracefully (broken workspace UI + recovery action)
- [ ] Handle missing auth/model configuration gracefully
- [ ] Handle backend unavailable state in frontend
- [ ] Add runtime logging and diagnostic logs under `~/.kiracode/logs`

### 10. Testing
- [x] Add smoke tests for backend API (tRPC routing, static delivery, lifecycle, events)
- [x] Add smoke tests for persistence contract (projects/workspaces survive DB recreation)
- [x] Add smoke tests for tRPC error codes (`NOT_FOUND`, `PRECONDITION_FAILED`)
- [x] Add smoke test for duplicate runtime guard
- [ ] Add smoke tests for session runtime lifecycle (requires real Pi SDK)
- [ ] Add smoke tests for frontend boot + routing
- [ ] Add a basic end-to-end test for:
  - [ ] create project
  - [ ] create workspace
  - [ ] send prompt
  - [ ] receive response/events

### 11. Packaging and release
- [ ] Decide final publish shape for `kiracode`
- [ ] Make `npx kiracode` install/run path smooth
- [ ] Add startup update check UI with changelog
- [ ] Add version reporting in app/settings
- [ ] Ensure frontend build runs as part of release flow
- [ ] Make the backend serve frontend reliably from packaged installs

---

## Nice-to-have after v1
- [ ] Auto-open browser on startup
- [ ] Better port management for dev scripts
- [ ] Session search index in SQLite
- [ ] Native file preview improvements
- [ ] Improved settings UI
- [ ] Agent presets UI
- [ ] Cost/token usage dashboard
- [ ] Mobile-specific UI polish
- [ ] Cloud-ready organization/project model groundwork

---

## Suggested next priorities

To get to a state where the app actually works end-to-end, in order:

1. ~~**LibSQL persistence**~~ ✅ done
2. ~~**Verify prompt end-to-end**~~ ✅ working (prompt + streaming confirmed)
3. **Native folder picker** — replace the `cwd` stub so workspace creation is actually usable
4. **Markdown rendering + chat polish** — messages are currently `<pre>` blocks; streaming is wired but needs visual polish
5. **Auth/model error handling** — surface missing auth or unavailable model gracefully instead of crashing the session
6. **Subscription reconnect** — if the frontend refreshes mid-session, the event subscription should re-attach cleanly
7. **Event-to-UI mapping** — map Pi SDK event types to useful status indicators beyond the current typing indicator
8. **Idle session disposal** — evict runtimes from memory after a period of inactivity
9. **Branch tree + search + rename/export**
10. **Extension UI bridge**
11. **Release packaging and update flow**
