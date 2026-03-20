## Problem Statement

KiraCode’s backend currently uses a custom Node HTTP server wrapped around the existing tRPC router. The current implementation works as a prototype, but the HTTP layer is not organized like a production-ready server foundation for a packaged local app. It mixes transport routing, CORS behavior, static asset serving, SPA fallback handling, and lifecycle concerns in one place.

From the user and developer perspective, this creates unnecessary fragility in the backend shell. The core problem is not that tRPC itself is wrong; the problem is that the surrounding HTTP server composition is too manual and too low-level for the level of stability and maintainability expected from a packaged local app.

The team wants the backend HTTP shell to be cleaner, easier to evolve, and more confidently testable without changing the existing tRPC API contract or expanding scope into unrelated backend features like persistence.

## Solution

Refactor the backend HTTP shell to use Hono as the outer server composition layer while preserving the existing tRPC router, endpoint shape, client behavior, startup contract, and local Node runtime model.

The new HTTP foundation should:
- keep tRPC exactly as-is from the frontend and CLI perspective
- preserve the `/trpc` endpoint and existing client usage patterns
- move HTTP concerns like middleware, CORS, static serving, and SPA fallback into a clearer routing/composition model
- separate application composition from server lifecycle responsibilities
- add smoke coverage for critical server behaviors so the backend shell is validated as production-ready within its scoped responsibilities

This PRD intentionally limits scope to the HTTP/server shell. It does not attempt to solve broader backend readiness problems such as persistence, workspace rehydration, or transport redesign.

## User Stories

1. As a KiraCode developer, I want the backend HTTP layer to be composed through a framework instead of manual request branching, so that the server is easier to understand and maintain.
2. As a KiraCode developer, I want to keep the existing tRPC router intact, so that I can improve server structure without rewriting procedures.
3. As a KiraCode frontend developer, I want the existing typed tRPC client contract to keep working unchanged, so that the refactor does not force client rewrites.
4. As a KiraCode CLI developer, I want the CLI API client to keep working unchanged, so that backend refactoring does not break local tools.
5. As a KiraCode user, I want the app to continue talking to the same `/trpc` backend endpoint, so that the application behaves the same after the refactor.
6. As a KiraCode user, I want the backend to continue serving the built frontend, so that packaged local app behavior remains consistent.
7. As a KiraCode developer, I want CORS behavior to be handled by framework middleware, so that request policy is easier to reason about and less error-prone.
8. As a KiraCode developer, I want static asset serving to be handled through a clearer delivery layer, so that frontend asset behavior is not mixed into transport logic.
9. As a KiraCode developer, I want SPA fallback behavior to be defined intentionally, so that browser routes continue to work predictably.
10. As a KiraCode developer, I want application composition and server start/stop logic separated, so that lifecycle code is easier to test and evolve.
11. As a KiraCode maintainer, I want the outer server shell to be more production-like, so that packaging and shipping the local app feels less prototype-grade.
12. As a KiraCode maintainer, I want the backend startup contract to remain stable, so that callers depending on `url`, `apiUrl`, and `port` continue to function.
13. As a KiraCode maintainer, I want runtime disposal during server shutdown to remain correct, so that open runtimes are cleaned up consistently.
14. As a KiraCode developer, I want a clean place to add future non-tRPC HTTP endpoints later, so that the backend can grow without another transport rewrite.
15. As a KiraCode developer, I want route ownership to be clearer, so that it is obvious which code handles API traffic versus frontend delivery.
16. As a KiraCode developer, I want local request policy to be defined in one place, so that CORS and related HTTP behavior are not scattered.
17. As a KiraCode developer, I want the backend shell to be testable through external behavior, so that confidence does not depend on manual inspection.
18. As a KiraCode maintainer, I want smoke tests for tRPC routing, so that the transport mount is validated after refactors.
19. As a KiraCode maintainer, I want smoke tests for static files and SPA fallback, so that packaged frontend delivery remains reliable.
20. As a KiraCode maintainer, I want a smoke test for subscriptions that observes a real workspace event end-to-end, so that the riskiest preserved transport behavior is explicitly covered.
21. As a KiraCode user, I want subscription behavior to remain unchanged from the client perspective, so that the workspace event stream does not regress during the refactor.
22. As a KiraCode developer, I want the HTTP shell refactor to avoid changing persistence or runtime behavior, so that the work stays focused and low-risk.
23. As a KiraCode maintainer, I want this refactor to preserve the local Node runtime model, so that packaged app assumptions do not shift unexpectedly.
24. As a KiraCode developer, I want the server foundation to be clearer even if broader backend issues still exist, so that future production-readiness work can build on a cleaner base.
25. As a KiraCode reviewer, I want the refactor to be scoped narrowly to server-shell responsibilities, so that changes are easier to reason about and verify.
26. As a KiraCode developer, I want the backend shell to feel less like custom infrastructure glue and more like a deliberate application foundation, so that ongoing maintenance cost stays low.
27. As a KiraCode user, I want startup, API routing, frontend delivery, and event subscriptions to continue working after the refactor, so that the app remains stable during backend modernization.
28. As a KiraCode maintainer, I want the server-shell refactor to establish a testing pattern for HTTP smoke tests, so that future transport changes can be validated quickly.
29. As a KiraCode developer, I want the backend composition to support future middleware or endpoint additions without restructuring the server again, so that the app can evolve incrementally.
30. As a KiraCode team member, I want this PRD to explicitly avoid overstating the impact of Hono, so that the refactor is understood as server-foundation work rather than a full backend readiness solution.

## Implementation Decisions

- Hono will replace only the outer custom HTTP shell; the existing tRPC router and procedures remain intact.
- The `/trpc` endpoint will be preserved exactly.
- Existing typed client usage in both the frontend and CLI will be preserved.
- Existing subscription behavior from the client perspective will be preserved.
- The backend startup contract will remain stable, including the returned backend URL, API URL, and port fields.
- The backend will continue serving the built frontend for packaged/local app scenarios.
- The runtime environment remains Node-based and local-first.
- The refactor will be organized around six deep modules:
  - HTTP App Composer
  - tRPC Transport Mount
  - Frontend Asset Delivery
  - HTTP Policy / CORS
  - Server Lifecycle
  - Server Smoke Test Harness
- The HTTP App Composer will own route ordering and application assembly.
- The tRPC Transport Mount will encapsulate mounting the existing router into Hono while preserving external behavior.
- The Frontend Asset Delivery module will encapsulate static asset delivery, the missing-build response, and SPA fallback behavior.
- The HTTP Policy / CORS module will encapsulate local request policy and avoid handwritten header logic in the main server composition path.
- The Server Lifecycle module will own startup, shutdown, and runtime cleanup behavior.
- The Server Smoke Test Harness will verify externally visible HTTP behavior rather than implementation details.
- Smoke coverage will include:
  - tRPC route mounting and request handling
  - static asset and SPA fallback behavior
  - server lifecycle startup/shutdown behavior
  - a subscription smoke test at the S2 level: observe a real workspace event end-to-end
- No new product-level backend features will be introduced as part of this work.
- No API redesign, no client rewrite, and no transport redesign will be included.
- If framework behavior differs from the current shell in small internal ways, external behavior still takes precedence for compatibility.
- The PRD should frame this work as a production-ready HTTP foundation improvement, not as a complete solution to all backend production-readiness gaps.

## Testing Decisions

- Good tests should validate external behavior and stable contracts, not internal implementation details or specific framework wiring.
- Tests should assert observable results such as reachable routes, preserved endpoint behavior, correct frontend asset responses, and successful lifecycle cleanup.
- The following modules should be tested:
  - HTTP App Composer
  - tRPC Transport Mount
  - Frontend Asset Delivery
  - HTTP Policy / CORS
  - Server Lifecycle
  - Server Smoke Test Harness
- The subscription test should validate a real event path end-to-end rather than a mocked internal callback chain.
- The test strategy should favor smoke-style coverage of production-critical paths over brittle framework-specific unit tests.
- There is currently little or no established prior art for backend/server smoke testing in this codebase, so this work should define the initial pattern for server-level verification.
- Where possible, tests should exercise the app through HTTP requests and stable startup/shutdown interfaces.
- Subscription verification should be limited to the agreed S2 scope: confirm that a real workspace event can be observed end-to-end, without expanding scope into reconnect/recovery guarantees.

## Out of Scope

- Changing tRPC procedures or router shape
- Changing frontend API client shape or usage
- Changing CLI API client shape or usage
- Changing the `/trpc` endpoint
- Replacing tRPC with Hono-native RPC or REST routes
- Changing subscription transport design
- Persistence or database work
- Workspace/session rehydration work
- Broader runtime lifecycle redesign outside the server-shell boundary
- Auth, model, or provider behavior changes
- Structured logging improvements beyond what is necessary for the scoped refactor
- New product endpoints such as `/health`, unless separately approved later
- Packaging, release, or distribution work outside preserving current packaged app behavior
- Claims that this refactor alone makes the full backend production-ready in every dimension

## Further Notes

- This work is intentionally narrow: it improves the HTTP foundation around the backend without attempting to solve unrelated backend maturity gaps.
- The primary value of Hono in this PRD is cleaner composition, clearer middleware/static routing, and a more testable server shell.
- The success criterion is not that the architecture is different; it is that the external behavior stays stable while the HTTP layer becomes cleaner and better verified.
- Because the app target is a packaged local end-user experience, preserving frontend delivery behavior is part of the contract.
- Because subscriptions are the riskiest preserved transport path in the current codebase, they require explicit smoke coverage in this refactor even though transport semantics are not being redesigned.
