import { cachedGet } from './api';

type BuildInsightsParams = {
  champion: string;
  platform: string;
  versusChampion?: string;
};

type CacheEntry = {
  data: any;
  expiresAt: number;
};

const insightsMemoryCache = new Map<string, CacheEntry>();
const inFlightInsights = new Map<string, Promise<any>>();
const INSIGHTS_TTL_MS = 1000 * 60 * 3;

function getInsightsCacheKey(params: BuildInsightsParams) {
  return `${params.platform}:${params.champion.toLowerCase()}:${(params.versusChampion || '').toLowerCase()}`;
}

function getCachedInsights(cacheKey: string) {
  const cached = insightsMemoryCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    insightsMemoryCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

export async function fetchBuildsByChampion(params: {
  puuid: string;
  platform: string;
  champion?: string;
}) {
  return cachedGet('/builds/by-champion', params, { ttlMs: 1000 * 60 * 2 });
}

export async function fetchChampionBuildInsights(params: BuildInsightsParams) {
  const cacheKey = getInsightsCacheKey(params);
  const cached = getCachedInsights(cacheKey);
  if (cached) return cached;

  const existingPromise = inFlightInsights.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const request = cachedGet('/builds/champion-insights', params, {
    ttlMs: INSIGHTS_TTL_MS,
  })
    .then((data) => {
      insightsMemoryCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + INSIGHTS_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      inFlightInsights.delete(cacheKey);
    });

  inFlightInsights.set(cacheKey, request);

  return request;
}
