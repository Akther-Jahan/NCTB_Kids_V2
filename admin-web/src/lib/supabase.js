import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url || "https://offline-placeholder.supabase.co",
  anonKey || "offline-placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "nctb-kids-web-admin-auth-v1",
    },
  },
);

export const storageBucket =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "content-assets";
