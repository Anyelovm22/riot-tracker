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