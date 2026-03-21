# Migration Plan: tRPC → oRPC

## Overview

Migrate the backend from tRPC to oRPC while restructuring to fully align with the backend architecture philosophy. This is a **complete migration**, not a gradual adoption.

**Duration Estimate:** 2-3 days for full migration

**Risk Level:** Medium — requires changing both backend and frontend API layer, but types remain consistent

---

## Current State

### Architecture Issues Identified

| Issue | Current State | Target State |
|-------|---------------|--------------|
| Projects data access | Direct DB function calls | Repository pattern |
| Repository location | `packages/db/src/workspaces/` | `packages/backend/src/features/workspaces/` |
| Router location | `packages/backend/src/routers/` | `packages/backend/src/features/*/router.ts` |
| Service layer bypass | Projects injects `db` directly | Projects injects `repository` |
| Error handling | Mixed (some typed, some `throw new Error()`) | All errors typed in contracts |
| Contract definition | None (tRPC infers from procedures) | Explicit contracts in `packages/contracts/` |

### Pending Changes (Uncommitted)

The following changes exist in the working directory and will be incorporated:

**Projects:**
- Added `deleteProject` to service, router, and DB function
- Still uses direct DB function pattern (inconsistent with workspaces)

**Workspaces:**
- Added `deleteWorkspace` to service, router, and repository
- Correctly uses repository pattern

---

## Target Architecture

```
packages/
├── contracts/                          # NEW: API contracts
│   ├── src/
│   │   ├── workspaces/
│   │   │   ├── index.ts
│   │   │   ├── workspace.contract.ts
│   │   │   └── workspace.types.ts
│   │   ├── projects/
│   │   │   ├── index.ts
│   │   │   ├── project.contract.ts
│   │   │   └── project.types.ts
│   │   ├── sessions/
│   │   ├── presets/
│   │   ├── files/
│   │   ├── extension-ui/
│   │   ├── system/
│   │   ├── index.ts                   # Root contract router
│   │   └── base.ts                    # Shared contract config
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── features/                  # Feature-first organization
│   │   │   ├── workspaces/
│   │   │   │   ├── index.ts           # Public interface
│   │   │   │   ├── router.ts          # oRPC implementation
│   │   │   │   ├── service.ts         # Orchestration
│   │   │   │   ├── repository.ts      # Data access
│   │   │   │   ├── domain.ts          # Pure rules (optional)
│   │   │   │   └── errors.ts          # Error classes
│   │   │   ├── projects/
│   │   │   │   ├── index.ts
│   │   │   │   ├── router.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── repository.ts      # NEW: Convert from DB functions
│   │   │   │   └── errors.ts
│   │   │   ├── sessions/
│   │   │   ├── presets/
│   │   │   ├── files/
│   │   │   ├── extension-ui/
│   │   │   └── system/
│   │   │
│   │   ├── shared/
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts
│   │   │   ├── context.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── http/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   └── routes.ts
│   │   │
│   │   └── index.ts
│   │
│   └── package.json
│
├── db/                                # Database infrastructure ONLY
│   ├── src/
│   │   ├── client.ts
│   │   ├── migrations/
│   │   └── schema/                    # Drizzle table definitions
│   │       ├── workspaces.ts
│   │       ├── projects.ts
│   │       └── index.ts
│   └── package.json
│
├── shared/                            # Domain schemas (Zod)
│   ├── src/
│   │   ├── schemas/
│   │   │   ├── workspace.ts
│   │   │   ├── project.ts
│   │   │   └── session.ts
│   │   └── index.ts
│   └── package.json
│
├── session-runtime/                   # Unchanged
├── native/                            # Unchanged
├── config/                            # Unchanged
├── defaults/                          # Unchanged
├── ui/                                # Unchanged
│
└── frontend/
    ├── src/
    │   ├── lib/
    │   │   ├── orpc-client.ts         # NEW: oRPC client
    │   │   └── trpc.ts                # DELETE after migration
    │   └── ...
    └── package.json
```

---

## Phase 1: Setup Contracts Package

### 1.1 Create Package Structure

**Files to create:**
```
packages/contracts/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── base.ts
    └── [feature folders]
```

**package.json:**
```json
{
  "name": "@kiracode/contracts",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./workspaces": "./src/workspaces/index.ts",
    "./projects": "./src/projects/index.ts",
    "./sessions": "./src/sessions/index.ts",
    "./presets": "./src/presets/index.ts",
    "./files": "./src/files/index.ts",
    "./extension-ui": "./src/extension-ui/index.ts",
    "./system": "./src/system/index.ts"
  },
  "dependencies": {
    "@orpc/contract": "latest",
    "zod": "^3.0.0"
  }
}
```

### 1.2 Define Base Contract

**src/base.ts:**
```typescript
import { oc } from '@orpc/contract';

// Shared error definitions
export const baseErrors = {
  UNAUTHORIZED: {},
  NOT_FOUND: {},
  VALIDATION_ERROR: {},
  INTERNAL_SERVER_ERROR: {},
};

// Base contract factory
export const createBaseContract = (tag: string) =>
  oc.route({ tags: [tag] }).errors(baseErrors);
```

### 1.3 Define Feature Contracts

**src/workspaces/workspace.types.ts:**
```typescript
import { z } from 'zod';

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  cwd: z.string(),
  sessionFile: z.string(),
  presetId: z.string(),
  createdAt: z.string(),
});

export const createWorkspaceInput = z.object({
  name: z.string().min(1),
  projectId: z.string().min(1),
  cwd: z.string().optional(),
});

export const workspaceEventSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
});

// Include delete operation
export const deleteWorkspaceInput = z.object({
  workspaceId: z.string().min(1),
});
```

**src/workspaces/workspace.contract.ts:**
```typescript
import { oc } from '@orpc/contract';
import { createBaseContract } from '../base';
import {
  workspaceSchema,
  createWorkspaceInput,
  deleteWorkspaceInput,
  workspaceEventSchema,
} from './workspace.types';

const workspaceContract = createBaseContract('workspace').errors({
  SESSION_ERROR: { message: 'Failed to open workspace session' },
});

export const listWorkspaces = workspaceContract
  .route({ method: 'GET', path: '/workspaces' })
  .input(z.object({ projectId: z.string().min(1) }))
  .output(z.array(workspaceSchema));

export const createWorkspace = workspaceContract
  .route({ method: 'POST', path: '/workspaces', successStatus: 201 })
  .input(createWorkspaceInput)
  .output(workspaceSchema);

export const getWorkspace = workspaceContract
  .route({ method: 'GET', path: '/workspaces/{id}' })
  .input(z.object({ id: z.string().min(1) }))
  .output(workspaceSchema);

export const deleteWorkspace = workspaceContract
  .route({ method: 'DELETE', path: '/workspaces/{id}', successStatus: 200 })
  .input(z.object({ id: z.string().min(1) }))
  .output(workspaceSchema);

export const promptWorkspace = workspaceContract
  .route({ method: 'POST', path: '/workspaces/{workspaceId}/prompt' })
  .input(z.object({ workspaceId: z.string().min(1), message: z.string().min(1) }))
  .output(z.object({ workspaceId: z.string(), messageCount: z.number(), ok: z.literal(true) }));

export const resetWorkspaceSession = workspaceContract
  .route({ method: 'POST', path: '/workspaces/{workspaceId}/reset-session' })
  .input(z.object({ workspaceId: z.string().min(1) }))
  .output(workspaceSchema);

export const getWorkspaceMessages = workspaceContract
  .route({ method: 'GET', path: '/workspaces/{workspaceId}/messages' })
  .input(z.object({ workspaceId: z.string().min(1) }))
  .output(z.array(z.unknown()));

export const subscribeWorkspaceEvents = workspaceContract
  .route({ method: 'GET', path: '/workspaces/{workspaceId}/events' })
  .input(z.object({ workspaceId: z.string().min(1) }))
  .output(eventIterator(workspaceEventSchema)); // SSE streaming

export default {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  deleteWorkspace,
  promptWorkspace,
  resetWorkspaceSession,
  getWorkspaceMessages,
  subscribeWorkspaceEvents,
};
```

**src/projects/project.types.ts:**
```typescript
import { z } from 'zod';

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const createProjectInput = z.object({
  name: z.string().min(1),
});
```

**src/projects/project.contract.ts:**
```typescript
import { oc } from '@orpc/contract';
import { createBaseContract } from '../base';
import { projectSchema, createProjectInput } from './project.types';

const projectContract = createBaseContract('project');

export const listProjects = projectContract
  .route({ method: 'GET', path: '/projects' })
  .output(z.array(projectSchema));

export const createProject = projectContract
  .route({ method: 'POST', path: '/projects', successStatus: 201 })
  .input(createProjectInput)
  .output(projectSchema);

export const getProject = projectContract
  .route({ method: 'GET', path: '/projects/{id}' })
  .input(z.object({ id: z.string().min(1) }))
  .output(projectSchema);

export const deleteProject = projectContract
  .route({ method: 'DELETE', path: '/projects/{id}', successStatus: 200 })
  .input(z.object({ id: z.string().min(1) }))
  .output(projectSchema);

export default {
  listProjects,
  createProject,
  getProject,
  deleteProject,
};
```

### 1.4 Create Root Contract Export

**src/index.ts:**
```typescript
import workspaces from './workspaces';
import projects from './projects';
// ... other features

export const appContract = {
  workspaces,
  projects,
  // ... other features
};

export default appContract;

// Re-export individual contracts for direct imports
export * from './workspaces';
export * from './projects';
```

---

## Phase 2: Refactor Backend Features

### 2.1 Workspaces Feature (Already Close to Target)

**Current files:**
- `features/workspaces/workspace-service.ts` ✓
- `features/workspaces/workspace-types.ts` ✓
- `features/workspaces/workspace-errors.ts` ✓
- `db/workspaces/workspace-repository.ts` → **MOVE** to feature

**Tasks:**
1. Move `packages/db/src/workspaces/workspace-repository.ts` → `packages/backend/src/features/workspaces/repository.ts`
2. Move `packages/db/src/workspaces/types.ts` (repository types) → `packages/backend/src/features/workspaces/repository.ts` (inline or separate)
3. Create `packages/backend/src/features/workspaces/router.ts` (oRPC implementation)
4. Update `index.ts` to export public interface

**Move repository:**
```typescript
// features/workspaces/repository.ts
import type { Database } from '@kiracode/db';
import { workspaces } from '@kiracode/db/schema';
import { eq, desc } from 'drizzle-orm';

export type WorkspaceRecord = {
  id: string;
  projectId: string;
  name: string;
  cwd: string;
  sessionFile: string;
  presetId: string;
  createdAt: string;
};

export type WorkspaceRepository = {
  findById: (id: string) => Promise<WorkspaceRecord | null>;
  findByProject: (projectId: string) => Promise<WorkspaceRecord[]>;
  create: (workspace: NewWorkspace) => Promise<WorkspaceRecord>;
  updateSessionFile: (id: string, sessionFile: string) => Promise<WorkspaceRecord>;
  delete: (id: string) => Promise<WorkspaceRecord | undefined>;
};

export function createWorkspaceRepository(db: Database): WorkspaceRepository {
  return {
    async findById(id) {
      const rows = await db.select()
        .from(workspaces)
        .where(eq(workspaces.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async findByProject(projectId) {
      return db.select()
        .from(workspaces)
        .where(eq(workspaces.projectId, projectId))
        .orderBy(desc(workspaces.createdAt));
    },

    async create(workspace) {
      const [row] = await db.insert(workspaces).values(workspace).returning();
      return row;
    },

    async updateSessionFile(id, sessionFile) {
      const [row] = await db
        .update(workspaces)
        .set({ sessionFile })
        .where(eq(workspaces.id, id))
        .returning();
      if (!row) throw new WorkspaceNotFoundError(id);
      return row;
    },

    async delete(id) {
      const workspace = await this.findById(id);
      if (!workspace) return undefined;

      await db.delete(workspaces).where(eq(workspaces.id, id));
      return workspace;
    },
  };
}
```

**Create router:**
```typescript
// features/workspaces/router.ts
import { implement } from '@orpc/server';
import workspaceContract from '@kiracode/contracts/workspaces';
import type { AppContext } from '../../shared/context';

const router = implement(workspaceContract).$context<AppContext>();

export const listWorkspaces = router.listWorkspaces
  .handler(async ({ context, input }) => {
    return context.workspaceService.listWorkspaces(input.projectId);
  });

export const createWorkspace = router.createWorkspace
  .handler(async ({ context, input }) => {
    return context.workspaceService.createWorkspace(input);
  });

export const deleteWorkspace = router.deleteWorkspace
  .handler(async ({ context, input, errors }) => {
    const workspace = await context.workspaceService.deleteWorkspace(input.id);
    if (!workspace) throw errors.NOT_FOUND();
    return workspace;
  });

export const promptWorkspace = router.promptWorkspace
  .handler(async ({ context, input }) => {
    return context.workspaceService.promptWorkspace(input.workspaceId, input.message);
  });

export const resetWorkspaceSession = router.resetWorkspaceSession
  .handler(async ({ context, input }) => {
    return context.workspaceService.resetWorkspaceSession(input.workspaceId);
  });

export const getWorkspaceMessages = router.getWorkspaceMessages
  .handler(async ({ context, input }) => {
    return context.workspaceService.getMessages(input.workspaceId);
  });

export const subscribeWorkspaceEvents = router.subscribeWorkspaceEvents
  .handler(async function* ({ context, input, signal }) {
    yield* context.workspaceService.subscribeToWorkspaceEvents(input.workspaceId, signal);
  });

export default {
  listWorkspaces,
  createWorkspace,
  deleteWorkspace,
  promptWorkspace,
  resetWorkspaceSession,
  getWorkspaceMessages,
  subscribeWorkspaceEvents,
};
```

**Update public interface:**
```typescript
// features/workspaces/index.ts
export { createWorkspaceService, type WorkspaceService, type WorkspaceServiceDeps } from './service';
export { createWorkspaceRepository, type WorkspaceRepository, type WorkspaceRecord } from './repository';
export { WorkspaceNotFoundError, WorkspaceSessionOpenError } from './errors';
export { default as workspaceRouter } from './router';
```

### 2.2 Projects Feature (Needs Repository Pattern)

**Current files:**
- `features/projects/project-service.ts` — **MODIFY** to use repository
- `features/projects/types.ts` — **MODIFY** to add repository types
- `db/projects/*.ts` — **CONSOLIDATE** into repository

**Tasks:**
1. Create `features/projects/repository.ts` (consolidate DB functions)
2. Update `features/projects/service.ts` to inject repository
3. Create `features/projects/router.ts`
4. Create `features/projects/errors.ts`
5. Update `index.ts`

**Create repository:**
```typescript
// features/projects/repository.ts
import type { Database } from '@kiracode/db';
import { projects } from '@kiracode/db/schema';
import { eq, desc } from 'drizzle-orm';

export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: string;
};

export type ProjectRepository = {
  findById: (id: string) => Promise<ProjectRecord | null>;
  findAll: () => Promise<ProjectRecord[]>;
  create: (project: NewProject) => Promise<ProjectRecord>;
  delete: (id: string) => Promise<ProjectRecord | undefined>;
};

export function createProjectRepository(db: Database): ProjectRepository {
  return {
    async findById(id) {
      const rows = await db.select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async findAll() {
      return db.select()
        .from(projects)
        .orderBy(desc(projects.createdAt));
    },

    async create(project) {
      const [row] = await db.insert(projects).values(project).returning();
      return row;
    },

    async delete(id) {
      const project = await this.findById(id);
      if (!project) return undefined;

      await db.delete(projects).where(eq(projects.id, id));
      return project;
    },
  };
}
```

**Update service:**
```typescript
// features/projects/service.ts
import type { ProjectRepository, ProjectRecord } from './repository';

export type ProjectServiceDeps = {
  repository: ProjectRepository;
  createId: () => string;
  now: () => string;
};

export type ProjectService = {
  createProject: (name: string) => Promise<ProjectRecord>;
  getProject: (projectId: string) => Promise<ProjectRecord | null>;
  listProjects: () => Promise<ProjectRecord[]>;
  deleteProject: (projectId: string) => Promise<ProjectRecord | undefined>;
};

export function createProjectService(deps: ProjectServiceDeps): ProjectService {
  return {
    async createProject(name) {
      return deps.repository.create({
        id: deps.createId(),
        name: name.trim(),
        createdAt: deps.now(),
      });
    },

    async getProject(projectId) {
      return deps.repository.findById(projectId);
    },

    async listProjects() {
      return deps.repository.findAll();
    },

    async deleteProject(projectId) {
      return deps.repository.delete(projectId);
    },
  };
}
```

**Create router:**
```typescript
// features/projects/router.ts
import { implement } from '@orpc/server';
import projectContract from '@kiracode/contracts/projects';
import type { AppContext } from '../../shared/context';

const router = implement(projectContract).$context<AppContext>();

export const listProjects = router.listProjects
  .handler(async ({ context }) => {
    return context.projectService.listProjects();
  });

export const createProject = router.createProject
  .handler(async ({ context, input }) => {
    return context.projectService.createProject(input.name);
  });

export const getProject = router.getProject
  .handler(async ({ context, input, errors }) => {
    const project = await context.projectService.getProject(input.id);
    if (!project) throw errors.NOT_FOUND();
    return project;
  });

export const deleteProject = router.deleteProject
  .handler(async ({ context, input, errors }) => {
    const project = await context.projectService.deleteProject(input.id);
    if (!project) throw errors.NOT_FOUND();
    return project;
  });

export default {
  listProjects,
  createProject,
  getProject,
  deleteProject,
};
```

### 2.3 Other Features

Apply same pattern to:
- `sessions/`
- `presets/`
- `files/`
- `extension-ui/`
- `system/`

Most of these are stubs currently. Create minimal contracts and routers.

---

## Phase 3: HTTP Layer

### 3.1 Update Shared Context

```typescript
// backend/src/shared/context.ts
import type { WorkspaceService } from '../features/workspaces';
import type { ProjectService } from '../features/projects';

export type AppContext = {
  workspaceService: WorkspaceService;
  projectService: ProjectService;
  // ... other services
};

export async function createAppContext(): Promise<AppContext> {
  // ... existing setup code
}
```

### 3.2 Create Feature Router Aggregation

```typescript
// backend/src/features/router.ts
import workspacesRouter from './workspaces/router';
import projectsRouter from './projects/router';
import sessionsRouter from './sessions/router';
import presetsRouter from './presets/router';
import filesRouter from './files/router';
import extensionUiRouter from './extension-ui/router';
import systemRouter from './system/router';

export default {
  workspaces: workspacesRouter,
  projects: projectsRouter,
  sessions: sessionsRouter,
  presets: presetsRouter,
  files: filesRouter,
  extensionUi: extensionUiRouter,
  system: systemRouter,
};
```

### 3.3 Update HTTP App

```typescript
// backend/src/http/app.ts
import { Hono } from 'hono';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import router from '../features/router';
import type { AppContext } from '../shared/context';

const handler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: { title: 'KiraCode API', version: '1.0.0' },
        servers: [{ url: '/rpc' }],
      },
    }),
  ],
});

export function createHonoApp(context: AppContext) {
  const app = new Hono();

  // CORS, etc.

  // Mount oRPC
  app.use('/rpc/*', async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: '/rpc',
      context,
    });

    if (matched) {
      return c.newResponse(response.body, response);
    }

    await next();
  });

  // OpenAPI spec endpoint
  app.get('/openapi.json', async (c) => {
    const spec = await handler.generateSpec();
    return c.json(spec);
  });

  // Frontend serving...

  return app;
}
```

---

## Phase 4: Frontend Migration

### 4.1 Create oRPC Client

```typescript
// frontend/src/lib/orpc-client.ts
import contract from '@kiracode/contracts';
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';

const link = new OpenAPILink(contract, {
  url: '/rpc',
  headers: () => ({
    // Add auth headers if needed
  }),
});

export const client = createORPCClient<ContractRouterClient<typeof contract>>(link);

// Export typed client
export type ApiClient = typeof client;
```

### 4.2 Update Frontend Features

Replace tRPC hooks with oRPC client calls:

**Before (tRPC):**
```typescript
const projects = trpc.projects.list.useQuery();
const create = trpc.projects.create.useMutation();
```

**After (oRPC with TanStack Query):**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/orpc-client';

function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => client.projects.listProjects(),
  });
}

function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => client.projects.createProject({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}
```

### 4.3 Remove tRPC

1. Delete `frontend/src/lib/trpc.ts`
2. Delete `frontend/src/lib/trpc-error.ts`
3. Remove tRPC dependencies from `package.json`
4. Add oRPC dependencies

---

## Phase 5: Cleanup

### 5.1 Remove Old Files

**Delete from backend:**
- `backend/src/routers/` (entire folder)
- `backend/src/trpc.ts`
- `backend/src/services/` (stubs)

**Delete from db:**
- `db/src/projects/` (moved to feature repository)
- `db/src/workspaces/` (moved to feature repository)
- `db/src/repos/` (stubs)

**Keep in db:**
- `db/src/client.ts`
- `db/src/migrations/`
- `db/src/schema/`

### 5.2 Update Exports

```typescript
// db/src/index.ts
export { createDatabase, type Database } from './client.ts';
export { runMigrations } from './migrations.ts';
export * from './schema/index.ts';  // Table definitions only
```

### 5.3 Update Dependencies

**backend/package.json:**
```json
{
  "dependencies": {
    "@orpc/server": "latest",
    "@orpc/openapi": "latest",
    "@orpc/zod": "latest",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

**frontend/package.json:**
```json
{
  "dependencies": {
    "@orpc/client": "latest",
    "@orpc/openapi-client": "latest",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

---

## Migration Order

### Recommended Sequence

1. **Phase 1.1-1.4:** Create contracts package (no breaking changes)
2. **Phase 2.1:** Migrate workspaces feature (most complete, serves as template)
3. **Phase 2.2:** Migrate projects feature (demonstrates repository conversion)
4. **Phase 3:** Update HTTP layer (switch to oRPC handler)
5. **Phase 4.1:** Create oRPC client (parallel with Phase 3)
6. **Phase 4.2-4.3:** Update frontend, remove tRPC
7. **Phase 5:** Cleanup

### Rollback Strategy

Each phase is committed separately. If issues arise:
1. Revert to previous commit
2. tRPC code remains functional until Phase 5 cleanup
3. Contracts package is additive, can be removed without impact

---

## Testing Strategy

### Per-Phase Testing

**After Phase 1:** Type-check contracts compile
**After Phase 2:** Unit tests for services/repositories
**After Phase 3:** Backend integration tests (oRPC endpoints)
**After Phase 4:** E2E tests (frontend → backend)

### Manual Testing Checklist

- [ ] List projects
- [ ] Create project
- [ ] Delete project
- [ ] List workspaces for project
- [ ] Create workspace
- [ ] Delete workspace
- [ ] Prompt workspace
- [ ] Reset workspace session
- [ ] Subscribe to workspace events (SSE)

---

## Open Questions

1. **Streaming:** oRPC uses SSE for streaming. Current tRPC uses WebSocket subscriptions. Verify `subscribeWorkspaceEvents` works with oRPC's `eventIterator`.

2. **Error handling on frontend:** oRPC errors are structured differently. Update error handling in frontend.

3. **OpenAPI spec exposure:** Decide whether to expose `/openapi.json` publicly or keep internal.

---

## Success Criteria

- [ ] All features migrated to oRPC
- [ ] Repository pattern consistent across all features
- [ ] Contracts package provides type-safe API
- [ ] Frontend calls backend via oRPC client
- [ ] No tRPC dependencies remaining
- [ ] OpenAPI spec generated automatically
- [ ] All tests passing
- [ ] Manual testing checklist complete