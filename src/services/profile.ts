import { cachedGet } from './api';

export async function fetchProfileSummary(params: {
  gameName: string;
  tagLine: string;
  region: string;
}) {
  return cachedGet('/profile/summary', params, { ttlMs: 1000 * 60 * 10 });
}
