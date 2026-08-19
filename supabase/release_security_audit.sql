-- NCTB Kids read-only release security audit.
-- Run in Supabase Dashboard -> SQL Editor after all release migrations.
-- This script DOES NOT alter tables, policies, functions, storage, or data.
--
-- Release rule: investigate every row returned by a section labelled
-- "FAILURE QUERY" before shipping a production AAB.

-- ============================================================================
-- 1. REQUIRED PUBLIC TABLES + RLS
-- ============================================================================

-- Full status table.
with required_tables(table_name) as (
  values
    ('profiles'),
    ('students'),
    ('student_access'),
    ('parent_link_requests'),
    ('chapters'),
    ('lesson_activities'),
    ('quiz_questions'),
    ('quiz_options'),
    ('chapter_progress'),
    ('activity_attempts'),
    ('staff_assignments'),
    ('donations')
)
select
  r.table_name,
  case when c.oid is null then false else true end as table_exists,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  coalesce(c.relforcerowsecurity, false) as rls_forced
from required_tables r
left join pg_namespace n
  on n.nspname = 'public'
left join pg_class c
  on c.relnamespace = n.oid
 and c.relname = r.table_name
 and c.relkind in ('r', 'p')
order by r.table_name;

-- FAILURE QUERY: expected zero rows.
-- A missing required table or a table with RLS disabled blocks release.
with required_tables(table_name) as (
  values
    ('profiles'),
    ('students'),
    ('student_access'),
    ('parent_link_requests'),
    ('chapters'),
    ('lesson_activities'),
    ('quiz_questions'),
    ('quiz_options'),
    ('chapter_progress'),
    ('activity_attempts'),
    ('staff_assignments'),
    ('donations')
)
select
  r.table_name,
  case
    when c.oid is null then 'MISSING_TABLE'
    when not c.relrowsecurity then 'RLS_DISABLED'
    else 'OK'
  end as finding
from required_tables r
left join pg_namespace n
  on n.nspname = 'public'
left join pg_class c
  on c.relnamespace = n.oid
 and c.relname = r.table_name
 and c.relkind in ('r', 'p')
where c.oid is null
   or not coalesce(c.relrowsecurity, false)
order by r.table_name;

-- ============================================================================
-- 2. PUBLIC TABLE POLICIES
-- ============================================================================

-- Review every policy on release-sensitive tables.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'students',
    'student_access',
    'parent_link_requests',
    'chapters',
    'lesson_activities',
    'quiz_questions',
    'quiz_options',
    'chapter_progress',
    'activity_attempts',
    'staff_assignments',
    'donations'
  )
order by tablename, policyname;

-- Highlight write policies that include anon or PUBLIC.
-- These rows are not automatically wrong, but every returned row requires
-- explicit review because learner data and staff-managed content are involved.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'students',
    'student_access',
    'parent_link_requests',
    'chapters',
    'lesson_activities',
    'quiz_questions',
    'quiz_options',
    'chapter_progress',
    'activity_attempts',
    'staff_assignments',
    'donations'
  )
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (
    'anon' = any(roles)
    or 'public' = any(roles)
  )
order by tablename, policyname;

-- ============================================================================
-- 3. SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Inspect ALL public SECURITY DEFINER functions, not just a hand-maintained
-- subset. Every one must enforce its own authorization and use a fixed
-- search_path.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname, arguments;

-- FAILURE QUERY: expected zero rows.
-- SECURITY DEFINER functions without a fixed search_path are unsafe to ship.
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and not exists (
    select 1
    from unnest(coalesce(p.proconfig, array[]::text[])) setting
    where setting like 'search_path=%'
  )
order by p.proname, arguments;

-- ============================================================================
-- 4. REQUIRED APP RPC PRESENCE
-- ============================================================================

-- RPCs used by the current mobile/parent release or required auth foundation.
with required_rpc(function_name) as (
  values
    ('create_student_profile'),
    ('complete_chapter'),
    ('request_parent_link'),
    ('request_parent_link_with_name'),
    ('respond_parent_link'),
    ('get_student_report'),
    ('restore_student_by_recovery_code'),
    ('recover_linked_child'),
    ('handle_new_auth_user'),
    ('apply_approved_parent_child_name')
)
select
  r.function_name,
  count(p.oid) as matching_overloads,
  bool_or(coalesce(p.prosecdef, false)) as has_security_definer_overload
from required_rpc r
left join pg_namespace n
  on n.nspname = 'public'
left join pg_proc p
  on p.pronamespace = n.oid
 and p.proname = r.function_name
group by r.function_name
order by r.function_name;

-- FAILURE QUERY: expected zero rows.
-- Missing RPCs mean the deployed database does not match the current app.
with required_rpc(function_name) as (
  values
    ('create_student_profile'),
    ('complete_chapter'),
    ('request_parent_link'),
    ('request_parent_link_with_name'),
    ('respond_parent_link'),
    ('get_student_report'),
    ('restore_student_by_recovery_code'),
    ('recover_linked_child'),
    ('handle_new_auth_user'),
    ('apply_approved_parent_child_name')
)
select r.function_name as missing_function
from required_rpc r
where not exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = r.function_name
)
order by r.function_name;

-- ============================================================================
-- 5. RPC EXECUTE PRIVILEGES
-- ============================================================================

-- Show app-facing execute grants.
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'create_student_profile',
    'complete_chapter',
    'request_parent_link',
    'request_parent_link_with_name',
    'respond_parent_link',
    'get_student_report',
    'restore_student_by_recovery_code',
    'recover_linked_child',
    'handle_new_auth_user',
    'apply_approved_parent_child_name'
  )
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by routine_name, grantee;

-- FAILURE QUERY: expected zero rows.
-- None of these sensitive RPCs/trigger helpers should be executable by the
-- unauthenticated anon role or PUBLIC. Supabase anonymous-auth users use the
-- authenticated database role and are restricted inside the hardened RPCs.
select
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'create_student_profile',
    'complete_chapter',
    'request_parent_link',
    'request_parent_link_with_name',
    'respond_parent_link',
    'get_student_report',
    'restore_student_by_recovery_code',
    'recover_linked_child',
    'handle_new_auth_user',
    'apply_approved_parent_child_name'
  )
  and grantee in ('anon', 'PUBLIC')
order by routine_name, grantee;

-- Trigger helpers should not be directly executable by the app role either.
-- FAILURE QUERY: expected zero rows for authenticated.
select
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'handle_new_auth_user',
    'apply_approved_parent_child_name'
  )
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by routine_name, grantee;

-- ============================================================================
-- 6. SUPABASE STORAGE USED BY ADMIN CMS
-- ============================================================================

-- The web CMS uploads learning assets to content-assets and then uses a public
-- URL. Confirm the bucket exists and deliberately review whether it is public.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'content-assets'
   or name = 'content-assets';

-- FAILURE QUERY: expected exactly zero rows if the CMS is going to be used.
-- If this returns content-assets, the required bucket is missing.
select 'content-assets' as missing_bucket
where not exists (
  select 1
  from storage.buckets
  where id = 'content-assets'
     or name = 'content-assets'
);

-- Review object policies. Public read access may be intentional because the
-- mobile app consumes learning media, but INSERT/UPDATE/DELETE must be limited
-- to authorized staff/admin accounts by policy.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- Highlight storage write policies that directly name anon/PUBLIC.
-- Returned rows require review before release.
select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (
    'anon' = any(roles)
    or 'public' = any(roles)
  )
order by policyname;

-- ============================================================================
-- 7. FINAL HUMAN REVIEW REMINDERS
-- ============================================================================

-- This audit intentionally cannot prove authorization correctness from SQL
-- metadata alone. Before production release, inspect the returned policy
-- expressions and SECURITY DEFINER function bodies and verify:
--   * published curriculum is readable by learner sessions;
--   * draft/archived curriculum is not publicly readable;
--   * child progress is limited to the correct child/parent relationship;
--   * parent-link RPCs reject anonymous child sessions;
--   * recovery RPCs enforce the intended anonymous-child/permanent-parent roles;
--   * admin/content_creator is required for CMS content writes and storage uploads;
--   * no service-role key is present in a client/mobile/web bundle.
