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
- Demo admin, demo donation, and demo leaderboard routes are excluded from the release navigator.
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

Before building, run both migrations in order:

```text
supabase/migrations/202607300001_parent_auth_foundation.sql
supabase/migrations/202607300002_public_curriculum_read.sql
```

The second migration grants read-only access to published learning content.
Draft and archived content remains private.

Do not upload the local `.env` file. It is excluded by `.easignore`.

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
8. Parent registration, login, link request, and logout.
9. Privacy-policy link.
10. Account-deletion request link.
11. Voice Activity target-audio/TTS playback.
12. Microphone permission granted flow: record, stop, play the child's recording, re-record, and complete the activity.
13. Microphone permission denied flow: the app must remain usable and show a clear permission message without crashing.

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
- Google Play Data safety answers must reflect the full built app and all SDKs. Google Play defines data as collected when it is transmitted off-device; therefore verify that no SDK transmits voice/audio before declaring on-device voice practice as not collected.
- Accurate Data safety answers for Supabase authentication and stored progress.
- Supabase RLS and RPC authorization review.
- Store icon, feature graphic, phone screenshots, short description, and full
  description.
- Tester feedback contact and a basic test record.

## Official references

- EAS Build: https://docs.expo.dev/build/introduction/
- EAS environment variables: https://docs.expo.dev/eas/environment-variables/
- EAS Submit for Android: https://docs.expo.dev/submit/android/
- Expo Audio: https://docs.expo.dev/versions/v54.0.0/sdk/audio/
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play testing requirements:
  https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play Families policy:
  https://support.google.com/googleplay/android-developer/answer/9893335

Run `supabase/release_security_audit.sql` in the Supabase SQL Editor and review
the result before uploading the production AAB.
