# Repository Guidelines

## Project Overview

**Alkisah** is an AI-powered children's story generator for Indonesian families. It creates personalized stories (450-600 words + illustrations) featuring a child's name, age, and chosen theme.

### What It Does

- **Story Generation**: Uses AI to generate custom children's stories with personalized characters and narratives
- **Illustrations**: Auto-generates 4 matching illustrations for each story
- **Voice Narration**: ElevenLabs integration for natural Indonesian voice reading
- **Freemium Model**: 3 free stories/day; premium unlock (Rp7,000 via Mayar) enables full audio + public sharing
- **Public Library**: Users can share stories publicly; browsable by anyone without login
- **Shareable Links**: Public stories get short URLs (`/s/[slug]`) for easy sharing

### Target Users

Parents of children aged 3-10, teachers, grandparents, and parenting content creators.

## Project Structure & Module Organization

This repo is a TanStack Start app deployed to Cloudflare Workers. Keep application code in `src/`.

- `src/routes/`: file-based routes such as `index.tsx`, `create.tsx`, and auth callback routes.
- `src/components/`: shared UI and layout pieces; reusable primitives live in `src/components/ui/`.
- `src/features/`: server-facing story, media, and provider logic.
- `src/db/`: Drizzle schema and D1 database access.
- `src/lib/` and `src/utils/`: small helpers and app utilities.
- `src/styles/`: global CSS.
- `public/`: static assets such as `site.webmanifest`.
- `drizzle/`: generated SQL migrations and metadata.

Do not hand-edit generated files like `src/routeTree.gen.ts` or `worker-configuration.d.ts`.

## Build, Test, and Development Commands

Use Bun for local workflows.

- `bun install`: install dependencies and refresh Cloudflare types.
- `bun run dev`: start the Vite dev server.
- `bun run build`: production build plus `tsc --noEmit`.
- `bun run preview`: preview the built app locally.
- `bun run lint`: apply `oxlint` fixes and format with `oxfmt`.
- `bun run lint:check`: verify lint and formatting without changes.
- `bun run db:generate`: generate Drizzle migrations into `drizzle/`.
- `bun run db:migrate:local`: apply pending D1 migrations locally.
- `bun run db:migrate:remote`: apply pending D1 migrations remotely.

## Coding Style & Naming Conventions

TypeScript and React files use tabs for indentation. Follow existing naming patterns:

- route files: lowercase, file-based names such as `sign-in.tsx`
- component files: lowercase filenames with exported PascalCase components
- utilities: descriptive lowercase or camel-case names

Formatting and linting are enforced with Oxc (`oxlint`, `oxfmt`). Keep modules small and colocate feature logic when practical.

## Testing Guidelines

There is no dedicated test runner yet. Treat `bun run build` and `bun run lint:check` as the required validation baseline. If you add tests, place them near the feature under `src/` using `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects, often sentence case, for example `Update dependencies and add R2 configuration to worker types`. Keep commits focused and readable.

PRs should include a short summary, linked issue or task when relevant, screenshots for UI changes, and confirmation that `bun run build` passed. Note any required env vars, D1 migrations, or Cloudflare config changes in the PR description.
