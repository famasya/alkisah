# Alkisah

**Tagline:** Buat cerita anak custom dalam 10 detik + suara ElevenLabs yang hidup. Bayar sekali Rp5.000, share ke publik, dan masuk ke perpustakaan cerita anak Indonesia.

## 1. Overview & Tujuan

Aplikasi web sederhana untuk orang tua membuat cerita anak personal menggunakan AI.  
Setelah generate, user bayar Rp5.000 sekali untuk unlock full experience (suara + share publik).  
Fokus: vibe magical-pastel, UX seamless, ElevenLabs voice streaming, integrasi Mayar payment, dan edge performance via Cloudflare D1.

**Model Monetisasi**

- Gratis: maksimal 3 generate/hari (text + gambar + voice basic atau preview pendek)
- Paid: Rp5.000 per cerita (one-time) → unlock:
  - Suara ElevenLabs full (Naya/Meraki dll.)
  - Download MP3
  - Toggle share ke publik
  - Masuk ke Public Library

**Target User**  
Orang tua anak 3–10 tahun, guru TK/SD, kakek/nenek, content creator parenting.

## 2. Core Features

### Gratis Tier

- Generate cerita (text 450–600 kata + 4 ilustrasi)
- Preview voice (Web Speech API atau ElevenLabs short clip)
- Rate limit: 3/hari per user

### Paid Tier (Rp5.000/cerita – one-off via Mayar)

- Full ElevenLabs voice streaming + MP3 download
- Toggle "Jadikan Publik"
- Generate short public link (ceritaku.id/s/[slug])
- Tambah ke Public Library (jika public)

### Public Library (/library)

- Halaman publik (no login required)
- Tampilkan cerita yang di-set public
- Grid card: cover image, judul, tema, usia, views count
- Sort: terbaru / paling populer (views)
- Infinite scroll atau pagination sederhana
- Klik → baca full text + dengar suara ElevenLabs

### Tambahan

- Share button: copy link, WA, IG story template
- Views counter (increment saat dibuka dari public link)
- Animasi buku berbalik (Framer Motion)
- Dark mode otomatis di mode "Baca Malam"

## 3. User Flow Utama

1. Landing page → "Buat Cerita Sekarang"
2. /create → isi form:
   - Nama anak
   - Usia (3–10)
   - Tema (dropdown + custom)
3. Klik Generate →
   - Kalau kuota gratis tersisa → generate langsung
   - Kalau habis → modal "Unlock cerita ini Rp5.000" → "Bayar Sekarang"
4. Bayar → redirect Mayar payment link (Rp5.000)
5. Sukses (via webhook) → unlock cerita, generate full voice, kembali ke halaman cerita
6. Di halaman cerita:
   - Baca text + swipe gambar
   - Tombol "Dengar Cerita" (ElevenLabs streaming)
   - Toggle "Publik" → generate slug & link share
7. /library → browse cerita publik

## 4. Tech Stack

| Komponen         | Pilihan Teknologi                        | Alasan                               |
| ---------------- | ---------------------------------------- | ------------------------------------ |
| Styling          | Tailwind + Shadcn/ui + Framer Motion     | Cepat, animasi buku berbalik mudah   |
| Database         | **Cloudflare D1** (SQLite serverless)    | Edge reads cepat, gratis tier besar  |
| ORM              | Drizzle ORM                              | Type-safe, migrations mudah          |
| Auth             | Supabase Auth (magic link) atau NextAuth | Sederhana, cukup untuk user tracking |
| AI Text          | Openrouter grok fast 4.1                 | Prompt kuat untuk cerita anak        |
| Image Generation | bytedance-seed/seedream-4.5 (openrouter) | Cepat & murah (~0.01$/gambar)        |
| Voice            | ElevenLabs (eleven_multilingual_v2)      | Suara Indonesia natural, streaming   |
| Payment          | Mayar API (payment link one-time)        | Integrasi utama kompetisi            |
| Hosting          | Cloudflare                               | Deploy cepat, custom domain mudah    |
| Tambahan Lib     | react-hot-toast, date-fns, lucide-react  | UX polish                            |

## 5. Database Schema (D1 + Drizzle)

```ts
// src/db/schema.ts
import { sqliteTable, text, integer, boolean } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
	id: text("id").primaryKey(),
	userId: text("user_id").unique().notNull(),
	dailyGenerates: integer("daily_generates").default(0),
	lastReset: integer("last_reset", { mode: "timestamp" }),
});

export const stories = sqliteTable("stories", {
	id: text("id").primaryKey(), // uuid atau nanoid
	userId: text("user_id"), // nullable jika public anonymous
	title: text("title").notNull(),
	content: text("content").notNull(),
	age: integer("age").notNull(),
	theme: text("theme").notNull(),
	images: text("images", { mode: "json" }).$type<string[]>().notNull(),
	audioUrl: text("audio_url"),
	isPaid: boolean("is_paid").default(false).notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	publicSlug: text("public_slug").unique(),
	viewsCount: integer("views_count").default(0).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

## 6. API Routes Utama (/app/api/...)

- `/generate-story` → POST (text generation)
- `/generate-image` → POST (4 gambar via Replicate)
- `/elevenlabs/stream` → POST (streaming audio)
- `/mayar/create-link` → POST (buat payment link Rp5.000)
- `/mayar/webhook` → POST (unlock cerita setelah payment success)
- `/stories/public` → GET (list cerita publik untuk /library)
- `/stories/[slug]` → GET (view public story tanpa auth)

## 7. ElevenLabs Integration

Voice rekomendasi:

- Naya-TaleCrafter-ID (female storyteller)
- Meraki-Indonesian-Warm

Generate audio hanya setelah paid (hemat credit).

## 8. Mayar Payment Flow (One-Off)

- Amount: 5000 IDR
- Description: "Unlock Cerita Anak: [Judul]"
- Redirect URL: kembali ke cerita + ?payment=success
- Webhook: update is_paid = true, generate audio, save audio_url

## 9. Deployment & Env Variables

- Env penting:
  ```
  DATABASE_URL=libsql://[token]@[host]/ceritaku-db
  ELEVENLABS_API_KEY=...
  REPLICATE_API_TOKEN=...
  MAYAR_API_KEY=...
  NEXT_PUBLIC_URL=https://ceritaku.vercel.app
  ```
