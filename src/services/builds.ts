import { api } from './api';

export async function fetchBuildsByChampion(params: {
  puuid: string;
  platform: string;
  champion?: string;
}) {
  const { data } = await api.get('/builds/by-champion', { params });
  return data;
}