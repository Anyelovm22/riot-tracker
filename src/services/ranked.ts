import { api } from './api';

export async function fetchRankedOverview(params: {
  puuid: string;
  platform: string;
}) {
  const { data } = await api.get('/ranked/overview', { params });
  return data;
}