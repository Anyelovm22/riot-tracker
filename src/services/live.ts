import { cachedGet } from './api';

export type LiveGameResponse = {
  activeGame: any | null;
  warning?: string;
  debug?: any;
};

export async function fetchLiveGame(params: {
  puuid: string;
  platform: string;
}): Promise<LiveGameResponse> {
  return cachedGet('/live/current', params, { ttlMs: 1000 * 8 });
}
