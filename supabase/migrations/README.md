# Supabase migration history

The 26 timestamped migrations before `20261017100000_atomic_finance_transactions.sql` were restored from the SQL statements recorded for those versions in `supabase_migrations.schema_migrations`. Their filenames preserve the exact remote version/name pairs; do not edit an already-applied migration in place.

This restores the timestamp inventory used by `supabase migration list` / `supabase db push`. It is **not yet a verified clean-install baseline**: the earliest recorded migrations alter pre-existing `dugsiga_*` tables, so the original base schema predates this migration ledger. A blank `supabase db reset` has not been verified and may fail until that base schema is captured separately.

Before deploying the staged finance migration:

1. Run `supabase migration list --linked` and confirm the local and remote timestamps match for all 26 recorded migrations.
2. Run `supabase db push --linked --dry-run` and confirm that only `20261017100000_atomic_finance_transactions.sql` is pending.
3. Test the finance migration on a non-production database, then apply it before deploying code that calls its RPCs.

Never run `supabase db reset --linked` against production. The current phase branch has not applied the staged finance migration to the live project.
