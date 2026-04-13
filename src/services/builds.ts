import { api } from './api';

export async function fetchBuildsByChampion(params: {
  puuid: string;
  platform: string;
  champion?: string;
}) {
  const { data } = await api.get('/builds/by-champion', { params });
  return data;
}

export async function fetchChampionBuildInsights(params: {
  champion: string;
  platform: string;
  versusChampion?: string;
  role?: string;
}) {
  const { data } = await api.get('/builds/champion-insights', { params });
  return data;
}
