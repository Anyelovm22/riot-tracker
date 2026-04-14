import { cachedGet } from './api';

export async function fetchRankedOverview(params: {
  puuid: string;
  platform: string;
}) {
  return cachedGet('/ranked/overview', params, { ttlMs: 1000 * 60 * 2 });
}
