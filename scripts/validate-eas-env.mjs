const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_USE_REMOTE_CURRICULUM",
  "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
  "EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL",
];

const failures = [];

function value(name) {
  return String(process.env[name] ?? "").trim();
}

function looksPlaceholder(input) {
  const normalized = input.toLowerCase();
  return [
    "your_project",
    "your_public",
    "your_public_site",
    "placeholder",
    "change_me",
    "example.com",
  ].some((token) => normalized.includes(token));
}

function requireHttps(name) {
  const input = value(name);
  if (!input) return;

  try {
    const url = new URL(input);
    if (url.protocol !== "https:") {
      failures.push(`${name} must use https://`);
    }
  } catch {
    failures.push(`${name} must be a valid URL`);
  }
}

for (const name of required) {
  const input = value(name);
  if (!input) {
    failures.push(`${name} is missing`);
    continue;
  }

  if (looksPlaceholder(input)) {
    failures.push(`${name} still contains a placeholder value`);
  }
}

requireHttps("EXPO_PUBLIC_SUPABASE_URL");
requireHttps("EXPO_PUBLIC_PRIVACY_POLICY_URL");
requireHttps("EXPO_PUBLIC_ACCOUNT_DELETION_URL");

const optionalApiBaseUrl = value("EXPO_PUBLIC_API_BASE_URL");
if (optionalApiBaseUrl) {
  try {
    const url = new URL(optionalApiBaseUrl);
    if (url.protocol !== "https:") {
      failures.push("EXPO_PUBLIC_API_BASE_URL must use https:// when configured");
    }
  } catch {
    failures.push("EXPO_PUBLIC_API_BASE_URL must be a valid URL when configured");
  }
}

if (value("EXPO_PUBLIC_USE_REMOTE_CURRICULUM") !== "true") {
  failures.push("EXPO_PUBLIC_USE_REMOTE_CURRICULUM must be exactly true for release builds");
}

if (
  value("EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL") !==
  "nctbkids://reset-password"
) {
  failures.push(
    "EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL must be nctbkids://reset-password for this release",
  );
}

if (failures.length > 0) {
  console.error("\nNCTB Kids release environment check failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error("\nFix the selected EAS environment before building.\n");
  process.exit(1);
}

console.log("NCTB Kids release environment check passed.");
