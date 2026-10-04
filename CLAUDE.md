# CLAUDE.md — gxg (Mystery Box blog)

Astro 5 static blog, English (`SITE_LANG = "en"`), deployed to Cloudflare Pages on push to `main`.

## Commands
- `npm ci` — install
- `npm run build` — OG images (satori/resvg) → `astro build` → Pagefind index. This is the check: it must pass before any PR.
- `npm run dev` — local server

## Layout
- `src/content/posts/*.md` — posts; frontmatter validated by `src/content.config.ts` (title, description, pubDate, category, tags, draft, takeaways, news).
- `src/components/SEO.astro` — meta/OG/JSON-LD. `src/consts.ts` — site config.
- `scripts/` — AI post pipeline (Gemini), R2 upload, OG generation, IndexNow. `scripts/lib/` shared helpers (same pipeline exists in the `soitool` repo).
- `src/content/posts/sheet-*.md` are generated from Google Sheet and gitignored.

## Rules
- New/AI-written posts must be `draft: true` until the owner reviews them.
- Posts should be English to match the site language.
- Never commit `.env`, keys, or generated `dist/`, `public/og/`.
