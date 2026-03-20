# Issue Drafts — Refactor backend HTTP shell to Hono

Parent PRD: `docs/prds/refactor-backend-http-shell-to-hono.md`

---

## 1) Introduce Hono-backed backend app composer

**Type:** AFK  
**Blocked by:** None - can start immediately

### What to build

Create the new Hono-based application composition entrypoint for the backend while preserving current external behavior. This slice should introduce the top-level app assembly structure that will own route ordering and middleware composition, without yet changing the tRPC contract from the caller perspective.

Reference the parent PRD sections:
- Solution
- Implementation Decisions
- Testing Decisions

### Acceptance criteria

- [ ] A Hono-based backend app composition layer exists and is the clear place where HTTP routes and middleware are assembled.
- [ ] The new composition layer is organized so API transport, frontend delivery, and HTTP policy can be owned by separate modules.
- [ ] No external behavior is intentionally changed in this slice beyond introducing the new composition structure.

### User stories addressed

- User story 1
- User story 10
- User story 14
- User story 15
- User story 24
- User story 25
- User story 26

---

## 2) Mount existing tRPC router into Hono at `/trpc`

**Type:** AFK  
**Blocked by:** Blocked by issue 1

### What to build

Mount the existing tRPC router into the Hono application so that frontend and CLI callers continue using the same typed API contract at the same `/trpc` endpoint. The goal is to preserve queries, mutations, and subscription-facing behavior from the client perspective while changing only the outer HTTP shell.

Reference the parent PRD sections:
- Solution
- Implementation Decisions
- Out of Scope

### Acceptance criteria

- [ ] The existing tRPC router is mounted inside Hono at the preserved `/trpc` endpoint.
- [ ] Frontend and CLI callers can continue using the same typed tRPC client contract without required call-site changes.
- [ ] The backend startup contract continues to expose an `apiUrl` pointing at the preserved tRPC endpoint shape.

### User stories addressed

- User story 2
- User story 3
- User story 4
- User story 5
- User story 12
- User story 18
- User story 21

---

## 3) Move local HTTP policy and CORS into Hono middleware

**Type:** AFK  
**Blocked by:** Blocked by issue 1

### What to build

Move the current local HTTP request policy and CORS handling into dedicated Hono middleware so these behaviors are no longer implemented through handwritten response-branching logic in the main server shell.

Reference the parent PRD sections:
- Solution
- Implementation Decisions
- Out of Scope

### Acceptance criteria

- [ ] Local request policy and CORS behavior are expressed through dedicated Hono middleware.
- [ ] The preserved development and packaged-app origin behavior continues to work from the client perspective.
- [ ] HTTP policy logic is separated from tRPC transport and frontend asset delivery responsibilities.

### User stories addressed

- User story 7
- User story 16
- User story 25

---

## 4) Migrate frontend asset delivery and SPA fallback to Hono

**Type:** AFK  
**Blocked by:** Blocked by issue 1

### What to build

Move built frontend delivery, missing-build behavior, static asset serving, and SPA fallback routing into the Hono-based server composition while preserving packaged local app behavior.

Reference the parent PRD sections:
- Solution
- Implementation Decisions
- Further Notes

### Acceptance criteria

- [ ] The backend continues to serve the built frontend for packaged/local app usage.
- [ ] Static asset responses, the missing-build experience, and SPA fallback routing are preserved through the new Hono-based delivery layer.
- [ ] Frontend delivery responsibilities are clearly separated from API transport responsibilities.

### User stories addressed

- User story 6
- User story 8
- User story 9
- User story 27

---

## 5) Finalize Hono server lifecycle and remove obsolete shell

**Type:** AFK  
**Blocked by:** Blocked by issues 1, 2, and 4

### What to build

Complete the cutover to the Hono-backed server path while preserving the backend lifecycle contract. This includes startup/shutdown behavior, runtime disposal, and removal of the obsolete standalone custom HTTP shell so the codebase has a single production-oriented server path.

Reference the parent PRD sections:
- Solution
- Implementation Decisions
- Out of Scope
- Further Notes

### Acceptance criteria

- [ ] Backend startup and shutdown behavior preserve the existing external contract, including returned `url`, `apiUrl`, and `port` fields.
- [ ] Runtime cleanup on server stop remains correct after the Hono cutover.
- [ ] Obsolete standalone shell code is removed or fully retired so the Hono-based path is the clear server implementation.

### User stories addressed

- User story 10
- User story 11
- User story 12
- User story 13
- User story 23
- User story 24
- User story 25
- User story 26
- User story 29
- User story 30

---

## 6) Add smoke tests for API routing, static delivery, lifecycle, and subscriptions

**Type:** AFK  
**Blocked by:** Blocked by issues 2, 3, 4, and 5

### What to build

Add smoke coverage for the production-critical backend shell behaviors preserved by this refactor. Tests should validate the system through external behavior, including tRPC routing, frontend asset delivery, startup/shutdown lifecycle, and an S2-level subscription path where a real workspace event can be observed end-to-end.

Reference the parent PRD sections:
- Testing Decisions
- Implementation Decisions
- Further Notes

### Acceptance criteria

- [ ] Smoke coverage verifies preserved `/trpc` routing behavior through the new Hono-backed shell.
- [ ] Smoke coverage verifies static asset serving and SPA fallback behavior.
- [ ] Smoke coverage verifies startup/shutdown lifecycle behavior and stable server contract.
- [ ] Smoke coverage includes an S2 subscription test that observes a real workspace event end-to-end without expanding scope into reconnect/recovery semantics.

### User stories addressed

- User story 17
- User story 18
- User story 19
- User story 20
- User story 21
- User story 27
- User story 28
