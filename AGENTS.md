# Repository Guidelines

## Project Structure & Module Organization

This repository is a TanStack Start app targeting Cloudflare Workers. Application code lives in `src/`.

- `src/routes/`: file-based route entries such as `index.tsx` and `__root.tsx`
- `src/components/`: shared React components, including `ui/` primitives
- `src/lib/`: small reusable helpers
- `src/utils/`: app-specific utilities like SEO, data helpers, and middleware
- `src/styles/`: global styles in `app.css`
- `public/`: static assets such as `site.webmanifest`

Generated files include `src/routeTree.gen.ts` and `worker-configuration.d.ts`; do not hand-edit them.

## Build, Test, and Development Commands

Use Bun for local workflows.

- `bun install`: install dependencies and regenerate Cloudflare types
- `bun run dev`: start the Vite dev server
- `bun run build`: create the production build and run `tsc --noEmit`
- `bun run preview`: preview the built app locally
- `bun run deploy`: deploy via Wrangler
- `bun run lint`: apply `oxlint` fixes and format with `oxfmt`
- `bun run lint:check`: verify lint and formatting without changing files
- `bun run format`: format the repo with `oxfmt`
- `bun run cf-typegen`: regenerate `worker-configuration.d.ts`

## Coding Style & Naming Conventions

TypeScript and React use tabs for indentation. Formatting and linting are enforced with Oxc via `.oxfmtrc.json` and `.oxlintrc.json`. Run `bun run lint` before opening a PR.

Follow existing naming patterns:

- route files: lowercase, file-based names like `index.tsx`
- React components: lowercase file names in this repo, exported PascalCase symbols
- utility modules: descriptive camel-case or lowercase names, for example `loggingMiddleware.tsx`

Prefer small modules and colocate route-specific logic near the route when practical.

## Testing Guidelines

There is no dedicated test runner configured yet. Until one is added, treat `bun run build` and `bun run lint:check` as the required validation baseline. If you add tests, keep them near the feature or under `src/` using `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines

Recent history uses short, imperative subjects such as `feat: package upgrade & add tanstack query` and `upgrade packages`. Keep commits focused and easy to scan.

Pull requests should include:

- a short description of the change and its impact
- linked issue or task reference when applicable
- screenshots or short recordings for UI changes
- confirmation that `bun run build` and `bun run lint:check` passed
