import { api } from './api';

export async function fetchChampions() {
  const { data } = await api.get('/champions');
  return data;
}

export async function fetchChampion(slug: string) {
  const { data } = await api.get(`/champions/${slug}`);
  return data;
}