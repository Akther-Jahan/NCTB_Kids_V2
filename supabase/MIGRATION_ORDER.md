# NCTB Kids Supabase migration order

This repository currently contains **incremental SQL for the existing NCTB Kids Supabase project**. It does not yet contain the original full database baseline that creates every core table, enum, policy, and RPC from an empty Supabase project.

Because of that, do **not** assume `supabase db reset` can rebuild a brand-new database from this repository yet.

## Release order for the existing Supabase project

Before the Android preview/production build, verify that these scripts have been applied in this order. If a script was already applied successfully, do not blindly re-run it just to make the checklist green; verify the resulting schema/functions instead.

1. `migrations/202607300001_parent_auth_foundation.sql`
   - permanent parent profile trigger
   - parent-link indexes
   - one-pending-request guard
   - `request_parent_link(text)` authorization

2. `migrations/202607300002_public_curriculum_read.sql`
   - published curriculum RLS/read access for student devices

3. `migrations/STUDENT_RECOVERY_MIGRATION.sql`
   - recovery-code constraint/index
   - `restore_student_by_recovery_code(text, text)`

4. `migrations/PARENT_SETS_CHILD_NAME_MIGRATION.sql`
   - `requested_display_name`
   - `request_parent_link_with_name(text, text)`
   - approved-name trigger

5. `migrations/PARENT_LINKED_RECOVERY_MIGRATION.sql`
   - `recover_linked_child(uuid, uuid)`

6. `migrations/202608190001_harden_parent_child_recovery.sql`
   - blocks anonymous child sessions from acting as parents
   - requires parent/admin profile authorization for parent RPCs
   - requires child recovery targets to be anonymous child sessions
   - marks expired pending link requests as expired before inserting a replacement request
   - re-applies restrictive EXECUTE grants for the hardened RPCs

## Important legacy filename note

Three historical SQL scripts above use legacy descriptive filenames instead of the standard Supabase CLI `<timestamp>_<name>.sql` migration format. They are kept unchanged here because the existing remote database may already have been modified with these scripts manually, and renaming/replaying historical migrations without checking remote migration history can create drift.

For the current release, treat the six scripts above as an **explicit existing-project release checklist**.

## Before switching to fully CLI-managed migrations

Do this as a separate database-maintenance task with access to the real Supabase project:

1. Inspect the remote schema and `supabase_migrations.schema_migrations` history.
2. Capture/establish a reproducible baseline for the existing remote schema.
3. Normalize the three legacy migration filenames/history without replaying destructive or duplicate changes.
4. Confirm a fresh local database can be rebuilt from migrations.
5. Only then make `supabase db push` the normal production deployment path.

Do not use migration-history repair commands by guesswork. The remote schema/history must be inspected first.

## Release verification after applying migrations

Run `../supabase/release_security_audit.sql` in read-only review mode and verify at minimum:

- RLS is enabled on sensitive public tables.
- child/parent access policies match the intended roles.
- `request_parent_link_with_name(text, text)` is executable only by `authenticated`, while the function itself rejects anonymous authenticated users.
- `restore_student_by_recovery_code(text, text)` is executable only by `authenticated`, while the function itself accepts only anonymous child sessions.
- `recover_linked_child(uuid, uuid)` is executable only by `authenticated`, while the function verifies both the permanent parent and anonymous child-device identities.

Then smoke-test parent linking, expired-request retry, student recovery, and parent-assisted child recovery in the preview APK.
