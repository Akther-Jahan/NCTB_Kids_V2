# NCTB Kids Web Admin CMS

Browser-based content management app for `NCTB_Kids_V2`.

## What it does

- uses the same Supabase Auth/database as the mobile app
- admin/content-creator login
- chapter create/edit/archive
- class/subject/status filters
- no-code activity builder
- visual Story / Letter / Reading / Word Builder / Picture Choice / Flashcard / Matching / Tap / Drag / Audio / Image / Video / Quiz / Puzzle fields
- visual quiz builder with 2–6 dynamic options
- stable existing quiz option IDs during edit
- draft/published/archived statuses
- optional Supabase Storage file upload

No teacher-facing JSON editor is used.

## Setup

From the repository root:

```powershell
cd admin-web
Copy-Item .env.example .env
```

Open `.env` and set:

```text
VITE_SUPABASE_URL=<same value as EXPO_PUBLIC_SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<same value as EXPO_PUBLIC_SUPABASE_ANON_KEY>
```

Then:

```powershell
npm install
npm run dev
```

Vite will print a browser URL such as `http://localhost:5173`.

## Storage upload

File upload defaults to a Supabase Storage bucket named:

```text
content-assets
```

If that bucket/policies do not exist yet, the form will show an upload error but still allows a public URL to be pasted. Configure:

```text
VITE_SUPABASE_STORAGE_BUCKET=<your bucket>
```

when storage is ready.

## Security

The web app uses the public anon key plus the signed-in admin/content-creator session. Your Supabase RLS policies remain the security boundary. Never put a service-role key in this web app.
