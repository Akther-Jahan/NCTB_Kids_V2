declare const process: {
  env: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_USE_REMOTE_CURRICULUM?: string;
    EXPO_PUBLIC_PRIVACY_POLICY_URL?: string;
    EXPO_PUBLIC_ACCOUNT_DELETION_URL?: string;
    EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL?: string;
  };
};

export const env = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  USE_REMOTE_CURRICULUM:
    process.env.EXPO_PUBLIC_USE_REMOTE_CURRICULUM !== 'false',
  PRIVACY_POLICY_URL:
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '',
  ACCOUNT_DELETION_URL:
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? '',
  PASSWORD_RESET_REDIRECT_URL:
    process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL ??
    'nctbkids://reset-password',
};

export const isBackendConfigured = Boolean(env.API_BASE_URL);
export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
