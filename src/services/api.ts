import axios from 'axios';

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL;

  if (configured && configured.trim()) {
    return normalizeBaseUrl(configured.trim());
  }

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { hostname, origin } = window.location;

  if (hostname.endsWith('.onrender.com')) {
    const serviceName = hostname.replace('.onrender.com', '');
    const normalizedServiceName = serviceName.replace(/-\d+$/, '');
    return `https://${normalizedServiceName}.onrender.com/api`;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api';
  }

  return `${origin}/api`;
}

const apiBaseUrl = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: apiBaseUrl,
});

type CacheEnvelope<T> = {
  savedAt: number;
  expiresAt: number;
  data: T;
};

type CachedGetOptions = {
  ttlMs?: number;
};

const memoryCache = new Map<string, CacheEnvelope<unknown>>();
const inFlightRequests = new Map<string, Promise<any>>();
const DEFAULT_TTL_MS = 1000 * 30;

function buildCacheKey(url: string, params?: Record<string, unknown>) {
  const normalizedParams = params
    ? Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([a], [b]) => a.localeCompare(b))
    : [];

  return `${url}::${JSON.stringify(normalizedParams)}`;
}

function readPersistentCache<T>(cacheKey: string): CacheEnvelope<T> | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`riot-http-cache:${cacheKey}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(`riot-http-cache:${cacheKey}`);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writePersistentCache<T>(cacheKey: string, payload: CacheEnvelope<T>) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`riot-http-cache:${cacheKey}`, JSON.stringify(payload));
  } catch {
    // ignora errores de storage
  }
}

export async function cachedGet<T = any>(
  url: string,
  params?: Record<string, unknown>,
  options?: CachedGetOptions
) {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const cacheKey = buildCacheKey(url, params);
  const fromMemory = memoryCache.get(cacheKey) as CacheEnvelope<T> | undefined;

  if (fromMemory && Date.now() <= fromMemory.expiresAt) {
    return fromMemory.data;
  }

  const fromStorage = readPersistentCache<T>(cacheKey);
  if (fromStorage) {
    memoryCache.set(cacheKey, fromStorage);
    return fromStorage.data;
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = api
    .get<T>(url, { params })
    .then(({ data }) => {
      const payload: CacheEnvelope<T> = {
        savedAt: Date.now(),
        expiresAt: Date.now() + ttlMs,
        data,
      };

      memoryCache.set(cacheKey, payload);
      writePersistentCache(cacheKey, payload);
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, request);
  return request;
}
