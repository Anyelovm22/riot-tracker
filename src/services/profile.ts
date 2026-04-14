import { api } from './api';

export async function fetchProfileSummary(params: {
  gameName: string;
  tagLine: string;
  region: string;
}) {
  const { data } = await api.get('/profile/summary', { params });
  return data;
}
