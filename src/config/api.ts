import * as SecureStore from 'expo-secure-store';
import { env } from './env';

const ACCESS_TOKEN_KEY = 'nctb_kids_access_token';

export const tokenStorage = {
  async getToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async setToken(token: string) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  async removeToken() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },
};

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const buildUrl = (path: string) => {
  if (!env.API_BASE_URL) {
    throw new ApiError('API base URL is missing. Set EXPO_PUBLIC_API_BASE_URL in your .env file.');
  }

  const cleanBase = env.API_BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth) {
    const token = await tokenStorage.getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : 'Request failed';

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export function apiGet<T>(path: string, auth = true) {
  return apiRequest<T>(path, {
    method: 'GET',
    auth,
  });
}

export function apiPost<T>(path: string, body?: unknown, auth = true) {
  return apiRequest<T>(path, {
    method: 'POST',
    body,
    auth,
  });
}