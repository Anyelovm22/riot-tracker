type LivePushEntry = {
  key: string;
  snapshot?: any;
  allGameData?: any;
  updatedAt: number;
  source?: string;
};

const livePushCache = new Map<string, LivePushEntry>();

export function saveLivePushEntry(input: {
  key: string;
  snapshot?: any;
  allGameData?: any;
  source?: string;
}) {
  const key = String(input.key || '').trim();
  if (!key) return null;

  const entry: LivePushEntry = {
    key,
    snapshot: input.snapshot,
    allGameData: input.allGameData,
    source: input.source,
    updatedAt: Date.now(),
  };

  livePushCache.set(key, entry);
  return entry;
}

export function getLivePushEntry(key: string, maxAgeMs: number) {
  const safeKey = String(key || '').trim();
  if (!safeKey) return null;

  const entry = livePushCache.get(safeKey);
  if (!entry) return null;

  const ageMs = Date.now() - entry.updatedAt;
  if (ageMs > maxAgeMs) {
    return null;
  }

  return {
    ...entry,
    ageMs,
  };
}
