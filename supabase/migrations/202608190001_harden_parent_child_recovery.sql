-- NCTB Kids release hardening
-- Tightens parent-link and child-recovery RPC authorization without changing
-- the mobile API contract.
--
-- Safe to apply after the existing parent/recovery migration scripts.

begin;

-- Parent link requests must come from a permanent parent/admin account.
-- Anonymous child sessions also use the authenticated Postgres role in
-- Supabase, so checking auth.uid() alone is not enough.
create or replace function public.request_parent_link_with_name(
  p_student_code text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_parent_user_id uuid := auth.uid();
  v_is_anonymous boolean;
  v_student_id uuid;
  v_request_id uuid;
  v_display_name text :=
    regexp_replace(
      btrim(coalesce(p_display_name, '')),
      '\s+',
      ' ',
      'g'
    );
begin
  if v_parent_user_id is null then
    raise exception 'Parent login is required.';
  end if;

  select coalesce(u.is_anonymous, false)
    into v_is_anonymous
  from auth.users u
  where u.id = v_parent_user_id;

  if coalesce(v_is_anonymous, true) then
    raise exception 'A permanent parent account is required.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_parent_user_id
      and p.role in (
        'parent'::public.app_role,
        'admin'::public.app_role
      )
  ) then
    raise exception 'This account does not have parent access.';
  end if;

  if char_length(v_display_name) < 1
     or char_length(v_display_name) > 40 then
    raise exception 'Child name must contain 1 to 40 characters.';
  end if;

  select s.id
    into v_student_id
  from public.students s
  where upper(s.student_code) =
    upper(btrim(coalesce(p_student_code, '')))
  limit 1;

  if v_student_id is null then
    raise exception 'Student ID was not found.';
  end if;

  -- Already-linked parents may update the child display name directly.
  if exists (
    select 1
    from public.student_access sa
    where sa.student_id = v_student_id
      and sa.user_id = v_parent_user_id
      and sa.access_type = 'parent'::public.student_access_type
  ) then
    update public.students
    set
      display_name = v_display_name,
      updated_at = now()
    where id = v_student_id;

    return v_student_id;
  end if;

  -- Reuse a still-active request instead of creating duplicates.
  select r.id
    into v_request_id
  from public.parent_link_requests r
  where r.student_id = v_student_id
    and r.parent_user_id = v_parent_user_id
    and r.status = 'pending'::public.link_request_status
    and r.expires_at > now()
  order by r.created_at desc
  limit 1;

  if v_request_id is not null then
    update public.parent_link_requests
    set
      requested_display_name = v_display_name,
      expires_at = now() + interval '7 days'
    where id = v_request_id;

    return v_request_id;
  end if;

  -- Important: the foundation migration has a unique partial index for one
  -- pending parent/student pair. Expired rows must be marked expired before a
  -- replacement pending request can be inserted.
  update public.parent_link_requests r
  set
    status = 'expired'::public.link_request_status,
    responded_at = now()
  where r.student_id = v_student_id
    and r.parent_user_id = v_parent_user_id
    and r.status = 'pending'::public.link_request_status
    and r.expires_at <= now();

  insert into public.parent_link_requests (
    parent_user_id,
    student_id,
    requested_display_name,
    status,
    expires_at
  )
  values (
    v_parent_user_id,
    v_student_id,
    v_display_name,
    'pending'::public.link_request_status,
    now() + interval '7 days'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$function$;

revoke all
on function public.request_parent_link_with_name(text, text)
from public, anon;

grant execute
on function public.request_parent_link_with_name(text, text)
to authenticated;

-- Student-code recovery must attach the student only to an anonymous child
-- device session, never to a permanent parent/staff account.
create or replace function public.restore_student_by_recovery_code(
  p_student_code text,
  p_recovery_code text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_is_anonymous boolean;
  v_student_id uuid;
begin
  if v_user_id is null then
    raise exception 'Login required.';
  end if;

  select coalesce(u.is_anonymous, false)
    into v_is_anonymous
  from auth.users u
  where u.id = v_user_id;

  if not coalesce(v_is_anonymous, false) then
    raise exception 'Student recovery requires an anonymous child device session.';
  end if;

  if nullif(trim(coalesce(p_student_code, '')), '') is null
     or nullif(trim(coalesce(p_recovery_code, '')), '') is null then
    raise exception 'Student ID and recovery code are required.';
  end if;

  select s.id
    into v_student_id
  from public.students s
  where upper(trim(s.student_code)) = upper(trim(p_student_code))
    and upper(trim(s.recovery_code)) = upper(trim(p_recovery_code))
  limit 1;

  if v_student_id is null then
    raise exception 'Student ID or recovery code is incorrect.';
  end if;

  delete from public.student_access sa
  where sa.user_id = v_user_id
    and sa.access_type = 'child_device'::public.student_access_type
    and sa.student_id <> v_student_id;

  delete from public.student_access sa
  where sa.student_id = v_student_id
    and sa.access_type = 'child_device'::public.student_access_type
    and sa.user_id <> v_user_id;

  insert into public.student_access (
    student_id,
    user_id,
    access_type
  )
  select
    v_student_id,
    v_user_id,
    'child_device'::public.student_access_type
  where not exists (
    select 1
    from public.student_access sa
    where sa.student_id = v_student_id
      and sa.user_id = v_user_id
      and sa.access_type = 'child_device'::public.student_access_type
  );

  return v_student_id;
end;
$function$;

revoke all
on function public.restore_student_by_recovery_code(text, text)
from public, anon;

grant execute
on function public.restore_student_by_recovery_code(text, text)
to authenticated;

-- Parent-assisted recovery may only target a real anonymous child session.
create or replace function public.recover_linked_child(
  p_student_id uuid,
  p_new_child_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_parent_user_id uuid := auth.uid();
  v_parent_is_anonymous boolean;
  v_child_is_anonymous boolean;
begin
  if v_parent_user_id is null then
    raise exception 'Parent login is required.';
  end if;

  select coalesce(u.is_anonymous, false)
    into v_parent_is_anonymous
  from auth.users u
  where u.id = v_parent_user_id;

  if coalesce(v_parent_is_anonymous, true) then
    raise exception 'A permanent parent account is required.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_parent_user_id
      and p.role in (
        'parent'::public.app_role,
        'admin'::public.app_role
      )
  ) then
    raise exception 'This account does not have parent access.';
  end if;

  if p_student_id is null
     or p_new_child_user_id is null then
    raise exception 'Student and child device information are required.';
  end if;

  if p_new_child_user_id = v_parent_user_id then
    raise exception 'Parent session cannot be used as a child device session.';
  end if;

  select coalesce(u.is_anonymous, false)
    into v_child_is_anonymous
  from auth.users u
  where u.id = p_new_child_user_id;

  if not coalesce(v_child_is_anonymous, false) then
    raise exception 'The new child device session must be anonymous.';
  end if;

  if not exists (
    select 1
    from public.student_access sa
    where sa.student_id = p_student_id
      and sa.user_id = v_parent_user_id
      and sa.access_type = 'parent'::public.student_access_type
  ) then
    raise exception 'You do not have parent access to this student.';
  end if;

  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
  ) then
    raise exception 'Student was not found.';
  end if;

  delete from public.student_access sa
  where sa.user_id = p_new_child_user_id
    and sa.access_type = 'child_device'::public.student_access_type
    and sa.student_id <> p_student_id;

  delete from public.student_access sa
  where sa.student_id = p_student_id
    and sa.access_type = 'child_device'::public.student_access_type
    and sa.user_id <> p_new_child_user_id;

  insert into public.student_access (
    student_id,
    user_id,
    access_type
  )
  select
    p_student_id,
    p_new_child_user_id,
    'child_device'::public.student_access_type
  where not exists (
    select 1
    from public.student_access sa
    where sa.student_id = p_student_id
      and sa.user_id = p_new_child_user_id
      and sa.access_type = 'child_device'::public.student_access_type
  );

  return p_student_id;
end;
$function$;

revoke all
on function public.recover_linked_child(uuid, uuid)
from public, anon;

grant execute
on function public.recover_linked_child(uuid, uuid)
to authenticated;

commit;
