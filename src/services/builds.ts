import { api } from './api';

type BuildInsightsParams = {
  champion: string;
  platform: string;
  queue?: 'solo' | 'flex';
  versusChampion?: string;
  role?: string;
  rank?: string;
  patch?: string;
};

const INSIGHTS_TTL_MS = 1000 * 60 * 30;

function getInsightsCacheKey(params: BuildInsightsParams, view: 'summary' | 'details') {
  return [
    params.platform,
    params.champion.toLowerCase(),
    (params.versusChampion || '').toLowerCase(),
    (params.queue || 'solo').toLowerCase(),
    (params.role || 'ALL').toLowerCase(),
    (params.rank || 'ALL').toLowerCase(),
    (params.patch || 'latest').toLowerCase(),
    view,
  ].join(':');
}

async function fetchChampionBuildInsightsByView(params: BuildInsightsParams, view: 'summary' | 'details') {
  const endpoint = view === 'summary' ? '/builds/champion-summary' : '/builds/champion-details';
  const { data } = await api.get(endpoint, {
    params: {
      ...params,
      _ts: Date.now(),
      _view: view,
      _key: getInsightsCacheKey(params, view),
      _ttl: INSIGHTS_TTL_MS,
    },
  });
  return data;
}

export function fetchChampionBuildSummary(params: BuildInsightsParams) {
  return fetchChampionBuildInsightsByView(params, 'summary');
}

export function fetchChampionBuildInsights(params: BuildInsightsParams) {
  return fetchChampionBuildInsightsByView(params, 'details');
}
