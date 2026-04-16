const liveSnapshotCache = new Map<string, { snapshot: any; updatedAt: number }>();

const LIVE_SNAPSHOT_TTL_MS = 1000 * 60 * 2;

export function setLiveSnapshot(key: string, snapshot: any) {
  liveSnapshotCache.set(key, {
    snapshot,
    updatedAt: Date.now(),
  });
}

export function getLiveSnapshot(key: string) {
  const cached = liveSnapshotCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.updatedAt > LIVE_SNAPSHOT_TTL_MS) {
    liveSnapshotCache.delete(key);
    return null;
  }

  return cached;
}

export function getLatestLiveSnapshot() {
  const now = Date.now();
  let latest: { snapshot: any; updatedAt: number } | null = null;

  for (const [key, value] of liveSnapshotCache.entries()) {
    if (now - value.updatedAt > LIVE_SNAPSHOT_TTL_MS) {
      liveSnapshotCache.delete(key);
      continue;
    }

    if (!latest || value.updatedAt > latest.updatedAt) {
      latest = value;
    }
  }

  return latest;
}
