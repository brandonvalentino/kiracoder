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
npm run build
npm run typecheck
npm run lint
npm run format
```

`npm run dev` now boots the `kiracode` app entry and wires it to the backend package stub.
