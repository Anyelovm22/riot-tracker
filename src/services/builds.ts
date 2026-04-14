import { cachedGet } from './api';

type BuildInsightsParams = {
  champion: string;
  platform: string;
  versusChampion?: string;
  role?: string;
  rank?: string;
  patch?: string;
};

type CacheEntry = {
  data: any;
  expiresAt: number;
};

const insightsMemoryCache = new Map<string, CacheEntry>();
const inFlightInsights = new Map<string, Promise<any>>();
const INSIGHTS_TTL_MS = 1000 * 60 * 30;

function getInsightsCacheKey(params: BuildInsightsParams, view: 'summary' | 'details') {
  return [
    params.platform,
    params.champion.toLowerCase(),
    (params.versusChampion || '').toLowerCase(),
    (params.role || 'ALL').toLowerCase(),
    (params.rank || 'ALL').toLowerCase(),
    (params.patch || 'latest').toLowerCase(),
    view,
  ].join(':');
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

async function fetchChampionBuildInsightsByView(params: BuildInsightsParams, view: 'summary' | 'details') {
  const cacheKey = getInsightsCacheKey(params, view);
  const cached = getCachedInsights(cacheKey);
  if (cached) return cached;

  const existingPromise = inFlightInsights.get(cacheKey);
  if (existingPromise) return existingPromise;

  const endpoint = view === 'summary' ? '/builds/champion-summary' : '/builds/champion-details';

  const request = cachedGet(endpoint, params, { ttlMs: INSIGHTS_TTL_MS })
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

export function fetchChampionBuildSummary(params: BuildInsightsParams) {
  return fetchChampionBuildInsightsByView(params, 'summary');
}

export function fetchChampionBuildInsights(params: BuildInsightsParams) {
  return fetchChampionBuildInsightsByView(params, 'details');
}
