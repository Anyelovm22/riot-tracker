import { cachedGet } from './api';

export async function fetchChampions() {
  return cachedGet('/champions', undefined, { ttlMs: 1000 * 60 * 60 * 6 });
}

export async function fetchChampion(slug: string) {
  return cachedGet(`/champions/${slug}`, undefined, { ttlMs: 1000 * 60 * 60 });
}
