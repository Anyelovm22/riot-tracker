import { api } from './api';

export async function fetchMatchHistory(params: {
  puuid: string;
  platform: string;
  count?: number;
  all?: boolean;
  queueId?: number;
}) {
  const { data } = await api.get('/matches/history', { params });
  return data;
}

export async function fetchMatchDetail(params: {
  matchId: string;
  puuid: string;
  platform: string;
}) {
  const { matchId, ...query } = params;
  const { data } = await api.get(`/matches/${encodeURIComponent(matchId)}/detail`, {
    params: query,
  });
  return data;
}
