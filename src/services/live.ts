import { api } from './api';

export type LiveGameResponse = {
  activeGame: any | null;
  warning?: string;
  debug?: any;
};

export async function fetchLiveGame(params: {
  puuid: string;
  platform: string;
}): Promise<LiveGameResponse> {
  const { data } = await api.get('/live/current', { params });
  return data;
}