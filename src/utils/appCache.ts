const CACHE_KEYS = {
  profile: 'riot-profile-summary',
  matches: 'riot-matches-cache',
  rankedOverview: 'riot-ranked-overview-cache',
  rankedHistory: 'riot-ranked-history-cache',
  live: 'riot-live-cache',
  builds: 'riot-builds-cache',
};

type CacheEnvelope<T> = {
  savedAt: number;
  data: T;
};

export function saveCache<T>(key: keyof typeof CACHE_KEYS, value: T) {
  try {
    const payload: CacheEnvelope<T> = {
      savedAt: Date.now(),
      data: value,
    };

    localStorage.setItem(CACHE_KEYS[key], JSON.stringify(payload));
  } catch {
    // no romper la UI por cache
  }
}

export function readCache<T>(key: keyof typeof CACHE_KEYS): T | null {
  try {
    const raw = localStorage.getItem(CACHE_KEYS[key]);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    return parsed?.data ?? null;
  } catch {
    localStorage.removeItem(CACHE_KEYS[key]);
    return null;
  }
}

export function readCacheMeta(key: keyof typeof CACHE_KEYS) {
  try {
    const raw = localStorage.getItem(CACHE_KEYS[key]);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<unknown>;
    return { savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function clearModuleCache() {
  Object.values(CACHE_KEYS).forEach((key) => localStorage.removeItem(key));
}