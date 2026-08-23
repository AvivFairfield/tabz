# Tabi 旅 — Japan trip ledger

An expense tracker for two friends traveling Japan. Dark Tokyo-night design with sakura petals drifting over the page (Three.js) and live currency conversion.

## What it does

- **Combined spending** up top: total, today, per-day average, days logged.
- **Currency toggle** in the header: ¥ / ₪ / $, converted with hourly ECB rates (frankfurter.app). Amounts are always entered and stored in yen.
- **A box per traveler** with their personal total broken down by category. Click the pencil next to a name to rename.
- **Side-by-side ledger** — each traveler's expenses in their own spreadsheet-style column (date, category, title, amount), with two-tap delete.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. To use it together, run it on a machine you both can reach and share the network URL that `next dev` prints (or `npm run build && npm start` for production).

## Where the data lives

Everything is stored in `data/trip.json` (created on first run, git-ignored). Back it up by copying that file. Note: this file-based store fits a self-hosted server or local use; serverless hosts (Vercel functions) have read-only disks, so deploying there would need a small database swap (e.g. Vercel KV, SQLite on a VPS, or Supabase).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · Three.js via @react-three/fiber · Motion · Phosphor icons · Geist + Geist Mono · Exchange rates from [frankfurter.app](https://frankfurter.dev) (ECB)
