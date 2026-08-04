# NCTB Kids — Interactive Baseline + Phase 1 Auth

This package is a repaired Expo 54 project and includes the first complete interactive learning slice:

**Class 1 → Bangla → আমার পরিচয়**

## What is implemented

- Complete Expo project entry/config files
- Offline-first student creation when Supabase is not configured
- Cloud student creation remains available when `.env` is configured
- 13-step interactive lesson
- Bangla text-to-speech
- Tap-to-discover learning cards
- NCTB textbook page viewer
- Flashcards that require every card to be viewed
- Listening comprehension activity
- Matching game
- Guided speaking practice without microphone recording
- Five quiz questions with retry and hints
- Activity completion gates
- Automatic lesson step persistence and resume
- Score-based 1–3 star result
- `পরিচয় বিশেষজ্ঞ` badge
- Next chapter unlock
- Local progress persistence
- Real parent registration and login
- Persistent parent session restore
- Email confirmation support
- Forgot-password email and in-app password reset
- Parent/child Student ID link approval
- Role-checked parent-link security migration

## Run the project

```bash
npm install
npx expo start -c
```

Then press `a` to open Android or scan the QR code with Expo Go.

## Supabase setup

Release builds load chapters and activities from Supabase. If Supabase
configuration or permission is missing, the app shows a visible error instead
of silently displaying the sample lessons from `curriculum.ts`.

For cloud curriculum:

1. Copy `.env.example` to `.env`.
2. Add the public Supabase URL and anon key.
3. Restart Expo with cache cleared.
4. Run the SQL migrations in `supabase/migrations` in filename order.

For parent authentication, password reset, and secure child linking, complete
the steps in `PHASE1_SETUP.md`.

```bash
npx expo start -c
```

To intentionally test the sample local curriculum during development, set:

```text
EXPO_PUBLIC_USE_REMOTE_CURRICULUM=false
```

## Test checklist

1. Clear Expo app data once before first test.
2. Select Class 1.
3. Open Bangla.
4. Open `আমার পরিচয়`.
5. Complete all 13 activities.
6. During speaking practice, confirm each word after saying it aloud.
7. Close the app during a lesson and reopen it; the same step should resume.
8. Complete the final quiz and confirm:
   - score screen appears,
   - badge appears,
   - points are added,
   - Chapter 2 unlocks.

## Important

Do not copy `node_modules` from an older project. Run `npm install` in this folder so the dependencies match Expo SDK 54.
