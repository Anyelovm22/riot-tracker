import { api, cachedGet } from './api';

export async function fetchChampions() {
  const cached = await cachedGet('/champions', undefined, { ttlMs: 1000 * 60 * 60 });
  if (Array.isArray(cached?.champions) && cached.champions.length > 0) {
    return cached;
  }

  const { data } = await api.get('/champions');
  return data;
}

export async function fetchChampion(slug: string) {
  const cached = await cachedGet(`/champions/${slug}`, undefined, { ttlMs: 1000 * 60 * 30 });
  if (cached?.name || cached?.id) {
    return cached;
  }

  const { data } = await api.get(`/champions/${slug}`);
  return data;
}
