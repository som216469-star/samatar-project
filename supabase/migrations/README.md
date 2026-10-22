# Supabase migration history

The 26 pre-existing timestamped migrations were restored from the SQL statements recorded for those versions in `supabase_migrations.schema_migrations`. Their filenames preserve the exact remote version/name pairs. The two earlier unversioned duplicate files were removed.

The atomic finance migration was reviewed, exercised in a rollback-only transaction against the production schema, and then applied through the Supabase migration tool on 2026-10-21. Supabase recorded it as version `20261021173729`; the committed file is therefore `20261021173729_atomic_finance_transactions.sql`. Do not rename or edit an already-applied migration in place.

The repository now matches all 27 version/name records currently returned by the project. This is not yet a verified clean-install baseline: the earliest recorded migrations alter pre-existing `dugsiga_*` tables, so an empty-database `supabase db reset` has not been verified and may fail until the original base schema is captured separately.

Before future database changes:
1. Create and review a versioned migration first.
2. Test it on a non-production database when available; do not create a paid Supabase branch without confirming its cost.
3. Verify local/remote migration status and preview pending changes with `supabase migration list --linked` and `supabase db push --linked --dry-run` before applying.
4. Never run `supabase db reset --linked` against production.

The current finance RPCs exist in the live project. The application code calling them remains isolated in the Phase One pull request until the final deployment preflight is complete.
