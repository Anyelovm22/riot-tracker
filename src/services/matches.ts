import { cachedGet } from './api';

export async function fetchMatchHistory(params: {
  puuid: string;
  platform: string;
  count?: number;
  all?: boolean;
  queueId?: number;
}) {
  return cachedGet('/matches/history', params, { ttlMs: 1000 * 60 * 2 });
}

export async function fetchMatchDetail(params: {
  matchId: string;
  puuid: string;
  platform: string;
}) {
  const { matchId, ...query } = params;
  return cachedGet(`/matches/${encodeURIComponent(matchId)}/detail`, query, {
    ttlMs: 1000 * 60 * 5,
  });
}
