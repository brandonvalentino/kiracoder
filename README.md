# KiraCode

KiraCode is an opinionated coding workspace platform powered by Pi internals.

## Quick Start (Recommended)

This project uses [Mise](https://mise.jdx.dev) for dependency management. New developers can get started with:

```bash
# Install mise (if not already installed)
curl https://mise.run | sh

# Install all required tools with correct versions
mise install

# Full setup: install dependencies and verify
mise run setup
```

### Mise Tasks

| Task | Description |
|------|-------------|
| `mise run setup` | Full setup for new developers |
| `mise run dev` | Start development servers |
| `mise run build` | Build all packages and apps |
| `mise run typecheck` | Run TypeScript type checking |
| `mise run lint` | Lint all code with oxlint |
| `mise run format:fix` | Auto-format all code |
| `mise run test` | Run all tests |
| `mise run clean` | Clean build artifacts |
| `mise run reset` | Complete reset and reinstall |

Run `mise tasks ls` to see all available tasks.

## Environment Variables

KiraCode uses [t3-env](https://github.com/t3-oss/t3-env) for type-safe environment variable validation. Variables are validated at startup with Zod schemas.

### Required Variables

Create a `.env` file in the project root:

```env
# Backend server port (defaults to 3141 if not set)
KIRACODE_PORT=3141

# Frontend API URL (Vite exposes VITE_* vars to the client)
VITE_KIRACODE_API_URL=http://127.0.0.1:3141/trpc
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KIRACODE_PORT` | No | `3141` | Port for the backend server |
| `VITE_KIRACODE_API_URL` | Yes | — | Full URL to the tRPC API endpoint |

### Usage in Code

```typescript
// Backend/App (server-only)
import { env } from "./env.ts";
const port = env.KIRACODE_PORT; // number, validated

// Frontend (client-safe)
import { env } from "../env.ts";
const apiUrl = env.VITE_KIRACODE_API_URL; // string, validated URL
```

The validation ensures:
- Missing required vars throw clear errors at startup
- Invalid URLs are caught before runtime issues
- Server vars can't accidentally leak to client bundles

## Manual Setup (Alternative)

If you prefer not to use Mise, ensure you have:
- Node.js 22+ (LTS recommended)
- pnpm 10.8.1+

Then run:
```bash
pnpm install
pnpm typecheck  # verify setup
```

## Workspace layout

- `apps/web` — runnable app entrypoint
- `apps/tau-legacy` — archived Tau mirror code from the pre-monorepo era
- `packages/*` — KiraCode libraries and internal packages

## Tooling

- Turborepo
- TypeScript
- Oxlint
- Oxfmt

## Commands

```bash
pnpm install
pnpm dev
pnpm dev:backend
pnpm dev:frontend
pnpm dev:full
pnpm build
pnpm typecheck
pnpm lint
pnpm format
```

### Dev modes

- `pnpm dev:backend` starts the local backend on `http://127.0.0.1:3141`
- `pnpm dev:frontend` starts the Vite frontend on `http://127.0.0.1:5173`
- `pnpm dev:full` runs both together for frontend HMR against the live backend
