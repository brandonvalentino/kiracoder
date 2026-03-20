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

## Manual Setup (Alternative)

If you prefer not to use Mise, ensure you have:
- Node.js 22+ (LTS recommended)
- npm 11.6.2+

Then run:
```bash
npm install
npm run typecheck  # verify setup
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
npm install
npm run dev
npm run dev:backend
npm run dev:frontend
npm run dev:full
npm run build
npm run typecheck
npm run lint
npm run format
```

### Dev modes

- `npm run dev:backend` starts the local backend on `http://127.0.0.1:3141`
- `npm run dev:frontend` starts the Vite frontend on `http://127.0.0.1:5173`
- `npm run dev:full` runs both together for frontend HMR against the live backend
