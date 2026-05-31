# Pronokif — Frontend

React 19 + Vite + TypeScript. Le front sert l'app utilisateur PWA et le back-office admin (`/admin`) de PronoKif.

Etat courant : v0.4.2, production `https://pronokif.eu`, smoke final valide le 31 mai 2026.

## Quick start

```bash
cd frontend
npm ci --legacy-peer-deps   # one-time
cp .env.example .env        # then fill VITE_BACKEND_URL
npm run dev                 # http://localhost:3000
```

The backend must be running on `VITE_BACKEND_URL` (default `http://localhost:8000`).
For production, `VITE_BACKEND_URL` points to `https://pronokif.eu`.

## Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Vite dev server on port 3000 (HMR, fast reload)       |
| `npm run build`      | `tsc --noEmit` + `vite build` -> `./build`            |
| `npm run preview`    | Serve the production bundle locally for sanity check  |
| `npm test`           | Vitest single run (unit + component, jsdom)           |
| `npm run test:watch` | Vitest watch mode                                     |
| `npm run lint`       | ESLint v9 flat config across `.{js,jsx,ts,tsx}`       |
| `npm run format`     | Prettier write across `src/**`                        |
| `npm run typecheck`  | `tsc -b --noEmit` (catches type errors without build) |

## Surfaces principales

- App utilisateur : auth, onboarding, ligues, pronostics, courses, profils, classements.
- Back-office : `src/pages/admin-bo`, onglets dashboard, users, predictions, races, media, legal/PWA, settings, DevOps, roadmap, changelog.
- Branding runtime : `src/lib/branding.tsx`, alimente les variables CSS theme depuis `/api/settings/branding`.
- Version runtime : `src/lib/appVersion.ts`, expose le footer admin et le changelog.
- Recherche profonde : `src/components/search` pour l'app et `src/pages/admin-bo/AdminDeepSearch.tsx` pour le BO.

## TypeScript convention

- **Every new file is `.ts` or `.tsx`.** No new `.js`/`.jsx`.
- `tsconfig.json` is `strict: true` plus `noUncheckedIndexedAccess`. New
  code MUST satisfy these.
- Existing `.js`/`.jsx` files keep working through `allowJs: true`. New code should stay in TS/TSX.
- When you touch a `.jsx` file for non-trivial work, prefer renaming it
  to `.tsx` and adding the types you need rather than leaving it loose.
- Path alias `@/` resolves to `src/` in both Vite and tsc.

## Environment variables

Vite only exposes vars prefixed `VITE_` to the bundle (browser side).
The backend URL is `VITE_BACKEND_URL`. `VITE_APP_VERSION` can override the fallback version displayed in the admin footer. See `.env.example` for the full template; copy it to `.env` (gitignored) for local dev.

If you migrated from the CRA setup: every `process.env.REACT_APP_*` is
now `import.meta.env.VITE_*`. The mapping is 1:1.

## Tests

Vitest runs in `jsdom` mode through `@testing-library/react` and `@testing-library/jest-dom`.
Le dernier run complet connu : 31 fichiers, 159 tests passes.

```bash
npx vitest run --coverage --coverage.reporter=text --coverage.thresholds.statements=20
```

Les suites couvrent notamment le parcours pronostics multi-etapes, les circuits interactifs, les entity tokens, l'auth, le routing, le profil et plusieurs surfaces admin.

## Lint & format

ESLint v9 flat config in `eslint.config.js` covers JS/JSX/TS/TSX.
Prettier handles formatting. Husky/lint-staged format and lint staged TS/TSX files before commit.

To install the hook the first time:

```bash
cd frontend
npx simple-git-hooks
```

(`npm install` runs that automatically when `simple-git-hooks` is in
devDependencies, but if it didn't, the line above wires it up.)

## Smoke release front

```bash
npm run typecheck
npm run lint
npm run build
```

Routes critiques a verifier au navigateur apres deploy :

- `/`
- `/mentions-legales`
- `/admin/auth`
- `/admin/settings` hors session admin : doit rediriger vers `/admin/auth`, sans 404.

## Why Vite (and not CRA / Next)

- CRA is unmaintained. Craco was a transitional escape hatch; both go.
- Next.js would force a routing rewrite (file-based vs the current
  `react-router-dom` setup) for no immediate product gain.
- Vite gives us instant cold-start, native ESM dev, and first-class
  TypeScript without ejecting webpack. The 3-day Sprint 2 budget covers
  the swap end to end with no regression to user-visible behavior.
