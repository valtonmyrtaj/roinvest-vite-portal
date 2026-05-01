# Roinvest / Selesta Living Project Memory

Last updated: 2026-05-01

This note exists so future Codex sessions can quickly recover the project state without relying only on chat history.

## Current Product State

- App: Selesta Living / UF Partners portal.
- Repo: `roinvest-vite-portal`.
- Production branch: `main`.
- Live domain: `https://selestaliving.app`.
- Hosting: Vercel, connected to GitHub `main`.
- Frontend: Vite + React + Tailwind CSS.
- Backend/data/auth: Supabase.
- Primary UI language: Albanian.

## Launch State

- Vercel SPA routing is configured through `vercel.json`.
- Supabase Auth URL configuration was updated for:
  - `https://selestaliving.app`
  - `https://selestaliving.app/**`
  - Vercel app URL variants
  - local `http://localhost:5173` variants
- Browser metadata is branded as `Selesta Living`.
- Login page is localized in Albanian and lands users on `/overview`.
- Domain SSL/configuration was validated after setup.

## Access Model

- `sales_director`: full app access and write permissions.
- `cfo`: approved read-only access to `overview`, `sales`, `units`, and `reports`.
- `investor`: approved limited access to the same read-only surface.
- Payment/reservation/data writes remain restricted to `sales_director`.
- Approved portal access is gated through `public.approved_users`.
- CFO role support exists in app code and live Supabase constraint.
- A CFO user was added live in Supabase Auth and `approved_users` on 2026-05-01. Do not commit private user email details into repo notes.

## Supabase Hardening

- Anonymous access to app-owned business tables and RPCs was removed.
- RLS gates app data behind approved authenticated users.
- Writes are restricted through RLS to Sales Director users.
- Relevant migrations:
  - `supabase/migrations/2026_05_01_launch_access_hardening.sql`
  - `supabase/migrations/2026_05_01_approved_users_cfo_role.sql`

## Branding Assets

- Full horizontal logo: `public/selesta-living-full.png`
- Blue transparent mark: `public/selesta-logo-blue.png`
- White transparent mark: `public/selesta-logo-white.png`
- Light favicon: `public/selesta-favicon-32.png`
- Dark favicon: `public/selesta-favicon-white-32.png`
- Do not wrap logos in visible rectangles or badge backgrounds unless the user explicitly asks.
- Browser tab/favicon treatment should remain separate from the in-app logo lockup.

## UI State

- Desktop dashboard keeps the fixed sidebar.
- Mobile layout has a sticky top header and bottom navigation.
- Page gutters are responsive: tight on phone, restored at desktop breakpoints.
- Overview hero/KPI section stacks on small screens.
- Bell/avatar menus are constrained to phone width.

## Working Rules For Future Sessions

- Keep UI text in Albanian unless requested otherwise.
- Do not start or restart the dev server unless the user explicitly approves.
- Prefer small, reviewable, file-targeted diffs.
- Preserve desktop behavior when doing mobile polish.
- Avoid backend/schema changes unless the task requires them.
- Never commit secrets, passwords, anon/service keys, or local machine settings.
- `.claude/settings.local.json` may appear modified locally; treat it as unrelated local settings unless the user asks.

## Standard Validation

Run before committing app changes:

```bash
npm run build
npm run lint
git diff --check
```
