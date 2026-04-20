# Supabase Schema Authority

This repo currently has **partial Supabase authority**, not a full schema baseline.

## What Is Authoritative Today

- For the specific objects defined in tracked SQL under `supabase/migrations/`, the repo is authoritative for those migration slices.
- For any schema surface **not** represented by tracked migrations, the live production database remains the real authority.
- This repo should **not** be treated as sufficient to recreate the full production schema from scratch.

## What Is Represented In This Repo

Tracked migrations currently present under `supabase/migrations/`:

- `2026_04_16_complete_unit_sale_patch.sql`
  - patches `public.complete_unit_sale(...)`
  - preserves `units.price`
  - writes final sale value into `units.sale_price`
  - records `unit_history` on sale completion
- `2026_04_17_reporting_sale_facts_phase_1.sql`
  - creates/replaces `public.reporting_sale_facts`
  - creates/replaces `public.reporting_get_sale_metrics(...)`
- `2026_04_17_reporting_sale_facts_phase_2.sql`
  - creates/replaces `public.reporting_get_sale_monthly_series(...)`
  - creates/replaces `public.reporting_get_sale_typology_breakdown(...)`

Also present:

- `src/lib/database.types.ts`
  - generated TypeScript database contract
  - used by runtime code for typed Supabase client, table, and RPC access
  - useful as an application contract, but **not** schema authority by itself

## What Is Not Represented Yet

- no full initial schema baseline
- no complete migration history for pre-existing tables, views, policies, triggers, constraints, indexes, or grants
- no guarantee that every production object is versioned locally
- no guarantee that repo SQL alone fully describes or reproduces the live database

Until a real baseline is captured, the authority model is split:

- tracked migrations are authoritative for the objects they explicitly define
- the live production database is authoritative for everything else

## How To Handle Future Migrations

- add forward-only migrations for real database changes
- keep each migration narrow and named for the actual change
- do not pretend patch migrations add up to a complete baseline when they do not
- if changing an object that is not already represented locally, verify the live definition first and then encode the intended delta explicitly
- do not rewrite migration history casually

## How To Treat `database.types.ts`

- treat it as a generated consumer contract for application code
- regenerate it after approved schema or RPC changes
- commit it when runtime typing needs to match the current database surface
- do not treat it as proof of full schema completeness
- if it disagrees with tracked SQL or known live database behavior, investigate the mismatch instead of trusting the file blindly

## What Should Not Be Committed Casually

- `supabase/config.toml` is currently untracked
  - treat it as local/operator configuration unless it is separately reviewed and intentionally adopted
- `supabase/seed.sql` is currently untracked
  - treat it as high-impact and potentially destructive
  - do not treat it as canonical setup, safe bootstrap data, or routine commit material until separately reviewed

Config and seed changes should be reviewed as their own slice, not bundled casually with normal migration work.

## Safe Workflow For Future Supabase Changes

1. Determine whether the object already has tracked migration authority in this repo.
2. If it does, add a new forward migration for the change.
3. If it does not, verify the live production definition first, then add a migration that captures the intended delta without claiming a full baseline.
4. Regenerate `src/lib/database.types.ts` after the schema change is finalized.
5. Review any `supabase/config.toml` or `supabase/seed.sql` change separately and with elevated caution.

Current rule of thumb: use the repo as authority for the specific tracked migration slices it contains, and use the live production database as authority for the rest.
