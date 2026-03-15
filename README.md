# Alkisah

**AI-powered children's story generator for Indonesian families.**

Create personalized stories featuring your child's name, age, and chosen theme — complete with illustrations and natural Indonesian voice narration.

[alkisah.id](https://alkisah.id)

## What It Does

- **Personalized Story Generation** — Creates unique 450-600 word stories featuring the child's name, age, and theme
- **AI Illustrations** — Auto-generates 4 matching illustrations for each story
- **Voice Narration** — Natural Indonesian voice reading via ElevenLabs
- **Freemium Model** — 3 free stories per day; unlock premium (full audio + public sharing) for Rp7,000 via Mayar
- **Public Library** — Browse stories shared publicly by other users
- **Shareable Links** — Public stories get short URLs (`/s/[slug]`) for easy sharing

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start/) with React
- **Styling**: TailwindCSS + Shadcn/ui + Framer Motion
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: Clerk
- **AI**: Cloudflare Workers AI (`@cf/zai-org/glm-4.7-flash` for text, `@cf/leonardo/lucid-origin` for images)
- **Voice**: ElevenLabs API
- **Payments**: Mayar
- **Hosting**: Cloudflare Workers
- **Lint/Format**: Oxc (`oxlint` + `oxfmt`)
- **Package Manager**: Bun

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Run linting and formatting
bun run lint

# Database migrations
bun run db:generate     # Generate migrations
bun run db:migrate:local   # Apply locally
bun run db:migrate:remote  # Apply to production
```

## Project Structure

- `src/routes/` — File-based routes (TanStack Router)
- `src/components/` — Shared UI components
- `src/features/` — Story, media, and provider logic
- `src/db/` — Drizzle schema and D1 database access
- `drizzle/` — Generated SQL migrations

## Environment Variables

Copy `.env.example` and fill in:

```env
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ELEVENLABS_API_KEY=
MAYAR_API_KEY=
MAYAR_WEBHOOK_SECRET=
```

## License

Private — All rights reserved.
