# KiraCode

KiraCode is an opinionated coding workspace platform powered by Pi internals.

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
