# NCTB Kids Android Deployment

## Current release status

- Expo SDK 54 project configuration is valid.
- Android application ID: `com.nctbkids.app`
- Preview profile builds an installable APK.
- Production profile builds a Google Play AAB.
- Build numbers are managed remotely and auto-incremented by EAS.
- Supabase curriculum is enabled through EAS environment variables.
- Release builds do not silently replace Supabase failures with local lessons.
- Empty chapters are hidden until at least one activity is published.
- Mobile release navigation does not bundle the admin login/dashboard/content/quiz editor screens; staff content management remains in the separate web admin CMS.
- Voice Activity intentionally requests microphone permission for listen-and-repeat pronunciation practice.
- The current Voice Activity records to a local recorder URI for immediate playback/re-recording and does not contain a server upload call for the recorded voice.

## 1. Install and sign in to EAS

Run these commands from the project root:

```bash
npm install --global eas-cli
eas login
eas init
```

`eas init` creates or links the Expo project and writes its real project ID into
the app configuration. The build profiles are already defined in `eas.json`.

## 2. Add EAS environment variables

Create the following variables in both the `preview` and `production`
environments:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_USE_REMOTE_CURRICULUM=true
EXPO_PUBLIC_PRIVACY_POLICY_URL
EXPO_PUBLIC_ACCOUNT_DELETION_URL
```

These are client-side configuration values and must use EAS `plaintext`
visibility. They can be added from the Expo project dashboard under
Project settings → Environment variables or with `eas env:set`.

Verify each environment:

```bash
eas env:list --environment preview
eas env:list --environment production
```

Do not upload the local `.env` file. It is excluded by `.easignore`.

## 2.1 Verify the Supabase release migrations

The SQL currently stored in this repository is incremental SQL for the existing
NCTB Kids Supabase project. The repository does not yet contain the original
full database baseline needed to recreate every core table/type/function from a
brand-new empty Supabase project.

For the existing project, verify that the following release scripts have been
applied in this order:

```text
1. supabase/migrations/202607300001_parent_auth_foundation.sql
2. supabase/migrations/202607300002_public_curriculum_read.sql
3. supabase/migrations/STUDENT_RECOVERY_MIGRATION.sql
4. supabase/migrations/PARENT_SETS_CHILD_NAME_MIGRATION.sql
5. supabase/migrations/PARENT_LINKED_RECOVERY_MIGRATION.sql
6. supabase/migrations/202608190001_harden_parent_child_recovery.sql
7. supabase/migrations/202608190002_lock_trigger_helpers.sql
```

The application currently depends on RPCs introduced by the recovery/linking
scripts, including:

```text
restore_student_by_recovery_code(text, text)
request_parent_link_with_name(text, text)
recover_linked_child(uuid, uuid)
```

The release hardening migrations keep the same mobile API contract but add
security checks:

- anonymous child sessions cannot submit parent link requests;
- parent RPCs require a permanent parent/admin profile;
- child recovery can only attach to an anonymous child-device session;
- expired pending parent-link requests are marked expired before a replacement
  request is inserted;
- RPC execute grants are re-applied restrictively;
- database-only trigger helpers are not directly executable from client roles.

See `supabase/MIGRATION_ORDER.md` for the complete migration notes.

### Migration-history warning

Three historical scripts use legacy descriptive filenames rather than the
standard Supabase CLI timestamp migration filename format. Do not blindly run
`supabase db push`, rename historical migrations, or repair remote migration
history until the real remote schema/history has been inspected. Normalize the
migration history as a separate maintenance task once remote Supabase access is
available.

## 2.2 Run the read-only Supabase security release gate

After the migrations above are present in the real Supabase project, run:

```text
supabase/release_security_audit.sql
```

in Supabase Dashboard → SQL Editor.

The audit is read-only. Before production release, review all result sets and
investigate every section labelled `FAILURE QUERY`.

Release expectations include:

- every required public table exists and has RLS enabled;
- every public `SECURITY DEFINER` function has a fixed `search_path`;
- all app-required RPCs exist;
- sensitive RPCs are not executable by `anon` or `PUBLIC`;
- trigger helper functions are not directly executable by client roles;
- public table policies match the intended child/parent/staff access model;
- the `content-assets` Supabase Storage bucket exists if Admin CMS upload is used;
- Storage INSERT/UPDATE/DELETE policies are restricted to authorized staff/admin accounts.

Do not treat a successful SQL execution by itself as a pass. The returned
policy expressions and function privileges must match the intended release
access model.

## 3. Run release checks

```bash
npm install
npm run typecheck
npm run doctor
npm run export:android
```

All checks must pass before starting a cloud build.

## 4. Create a preview APK

```bash
npm run build:preview
```

Install the APK on at least two physical Android devices and test:

1. Fresh student creation.
2. Class and subject selection.
3. Supabase chapter list.
4. Chapter 1 and Chapter 2 activities.
5. Next-chapter unlocking.
6. App restart and lesson resume.
7. Offline/error state behavior (local lessons must not replace cloud content).
8. Parent registration, login, link request, approval, and logout.
9. A parent link request can be retried after an older pending request has expired.
10. Student recovery with Student ID + recovery code on a new anonymous child session.
11. Parent-assisted recovery of an already-linked child onto a new anonymous child session.
12. Admin CMS login with an authorized staff account and rejection of a normal parent account.
13. Admin CMS learning-asset upload to `content-assets`, if the upload feature will be used in production.
14. Privacy-policy link.
15. Account-deletion request link.
16. Voice Activity target-audio/TTS playback.
17. Microphone permission granted flow: record, stop, play the child's recording, re-record, and complete the activity.
18. Microphone permission denied flow: the app must remain usable and show a clear permission message without crashing.

## 5. Create a Google Play AAB

After preview testing passes:

```bash
npm run build:production
```

Allow EAS to create and securely manage the Android upload keystore. Preserve
access to the Expo account that owns the credentials.

## 6. Google Play testing

Create the app in Google Play Console using the same application ID:

```text
com.nctbkids.app
```

Complete the store listing, target audience, content rating, Data safety,
Families policy, privacy policy, and account-deletion URL before closed
testing. The first EAS submission profile targets the internal track:

```bash
npm run submit:android
```

After internal testing, create a closed test. New personal developer accounts
normally require at least 12 opted-in testers for 14 continuous days before
production access can be requested.

## Required before Play closed testing

- Public Privacy Policy URL hosted as a normal web page, not a PDF.
- Public account-deletion request URL.
- The same developer/entity name in the Play listing and privacy policy.
- A monitored privacy/contact email.
- Privacy policy must explain that microphone access is used for pronunciation practice and describe whether voice recordings remain on-device or are transmitted.
- In the current implementation, Voice Activity itself keeps the recording on-device for immediate playback and does not upload the recorded audio. Re-audit this if cloud speech recognition, analytics, or audio upload is added later.
- Google Play Data safety answers must reflect the full built app and all SDKs. Verify that no SDK transmits voice/audio before declaring on-device voice practice as not collected.
- Accurate Data safety answers for Supabase authentication and stored progress.
- Supabase RLS, RPC authorization, trigger-helper privileges, and Storage policy review.
- Store icon, feature graphic, phone screenshots, short description, and full description.
- Tester feedback contact and a basic test record.

## Official references

- EAS Build: https://docs.expo.dev/build/introduction/
- EAS environment variables: https://docs.expo.dev/eas/environment-variables/
- EAS Submit for Android: https://docs.expo.dev/submit/android/
- Expo Audio: https://docs.expo.dev/versions/v54.0.0/sdk/audio/
- Supabase database migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase anonymous sign-ins: https://supabase.com/docs/guides/auth/auth-anonymous
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play testing requirements:
  https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play Families policy:
  https://support.google.com/googleplay/android-developer/answer/9893335

Run `supabase/release_security_audit.sql` in the Supabase SQL Editor and review
the result before uploading the production AAB.
