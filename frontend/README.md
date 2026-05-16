# Pronokif — Frontend

React 19 + Vite + TypeScript (progressive). Migrated from CRA + Craco
during Sprint 2 of the A2 refactor.

## Quick start

```bash
cd frontend
npm install                 # one-time
cp .env.example .env        # then fill VITE_BACKEND_URL
npm run dev                 # http://localhost:3000
```

The backend must be running on `VITE_BACKEND_URL` (default
`http://localhost:8000`). See `../backend/README` (or run `make dev-backend`
from the repo root).

## Scripts

| Command            | What it does                                         |
| ------------------ | ---------------------------------------------------- |
| `npm run dev`      | Vite dev server on port 3000 (HMR, fast reload)      |
| `npm run build`    | `tsc --noEmit` + `vite build` -> `./build`           |
| `npm run preview`  | Serve the production bundle locally for sanity check |
| `npm test`         | Vitest single run (unit + component, jsdom)          |
| `npm run test:watch` | Vitest watch mode                                  |
| `npm run lint`     | ESLint v9 flat config across `.{js,jsx,ts,tsx}`      |
| `npm run format`   | Prettier write across `src/**`                       |
| `npm run typecheck`| `tsc -b --noEmit` (catches type errors without build)|

## TypeScript convention (Sprint 2 baseline)

- **Every new file is `.ts` or `.tsx`.** No new `.js`/`.jsx`.
- `tsconfig.json` is `strict: true` plus `noUncheckedIndexedAccess`. New
  code MUST satisfy these.
- Existing `.js`/`.jsx` files keep working through `allowJs: true`. They
  will be migrated incrementally during Sprint 3 (page-by-page refactor).
- When you touch a `.jsx` file for non-trivial work, prefer renaming it
  to `.tsx` and adding the types you need rather than leaving it loose.
- Path alias `@/` resolves to `src/` in both Vite and tsc.

## Environment variables

Vite only exposes vars prefixed `VITE_` to the bundle (browser side).
The single backend URL is `VITE_BACKEND_URL`. See `.env.example` for the
full template; copy it to `.env` (gitignored) for local dev.

If you migrated from the CRA setup: every `process.env.REACT_APP_*` is
now `import.meta.env.VITE_*`. The mapping is 1:1.

## Tests

Vitest runs in `jsdom` mode through `@testing-library/react` and
`@testing-library/jest-dom`. The smoke test in `src/main.test.tsx`
exists only to prove the toolchain is alive after refactors — replace
it with real component coverage as pages get migrated to TS.

## Lint & format

ESLint v9 flat config in `eslint.config.js` covers JS/JSX/TS/TSX.
Prettier handles formatting. A `simple-git-hooks` pre-commit runs
`lint-staged` so anything you commit is formatted and lint-clean.

To install the hook the first time:

```bash
cd frontend
npx simple-git-hooks
```

(`npm install` runs that automatically when `simple-git-hooks` is in
devDependencies, but if it didn't, the line above wires it up.)

## Why Vite (and not CRA / Next)

- CRA is unmaintained. Craco was a transitional escape hatch; both go.
- Next.js would force a routing rewrite (file-based vs the current
  `react-router-dom` setup) for no immediate product gain.
- Vite gives us instant cold-start, native ESM dev, and first-class
  TypeScript without ejecting webpack. The 3-day Sprint 2 budget covers
  the swap end to end with no regression to user-visible behavior.
