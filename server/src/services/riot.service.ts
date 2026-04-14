import axios from 'axios';
import { env } from '../config/env';

type MemoryCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryCacheEntry<any>>();

function getCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T, ttlMs: number) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

const DDRAGON_VERSION_TTL_MS = 1000 * 60 * 30; // 30 min
const DDRAGON_DATA_TTL_MS = 1000 * 60 * 60 * 6; // 6 horas
const regionalClusters: Record<string, string> = {
  la1: 'americas',
  la2: 'americas',
  na1: 'americas',
  br1: 'americas',
  euw1: 'europe',
  eun1: 'europe',
  tr1: 'europe',
  ru: 'europe',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
  ph2: 'sea',
  sg2: 'sea',
  th2: 'sea',
  tw2: 'sea',
  vn2: 'sea',
};

function normalizePlatform(platform: string) {
  return String(platform || '')
    .trim()
    .toLowerCase();
}

function getPlatformBase(platform: string) {
  return `https://${normalizePlatform(platform)}.api.riotgames.com`;
}

function getRegionalBase(platform: string) {
  const normalized = normalizePlatform(platform);
  const cluster = regionalClusters[normalized];

  if (!cluster) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return `https://${cluster}.api.riotgames.com`;
}

function riotClient(baseURL: string) {
  return axios.create({
    baseURL,
    headers: {
      'X-Riot-Token': env.RIOT_API_KEY,
    },
    timeout: 15000,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value?: string) {
  if (!value) return 0;

  const seconds = Number(value);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }

  const date = new Date(value).getTime();
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return 0;
}

async function riotGetWithRetry<T>(
  client: ReturnType<typeof riotClient>,
  url: string,
  config?: Record<string, any>,
  retries = 4
) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.get<T>(url, config);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const retryAfterHeader = error?.response?.headers?.['retry-after'];
      const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
      const isRetriable = status === 429 || status >= 500;

      if (!isRetriable || attempt >= retries - 1) {
        throw error;
      }

      const baseDelay = status === 429 ? 1600 : 900;
      const backoff = baseDelay * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 450);

      await sleep(Math.max(retryAfterMs, backoff + jitter));
    }
  }

  throw new Error('Retry attempts exhausted');
}

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  platform: string
) {
  const client = riotClient(getRegionalBase(platform));
  return riotGetWithRetry<any>(
    client,
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    undefined,
    4
  );
}

export async function getSummonerByPuuid(puuid: string, platform: string) {
  const client = riotClient(getPlatformBase(platform));
  return riotGetWithRetry<any>(
    client,
    `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
    undefined,
    4
  );
}

export async function getLeagueEntriesBySummonerId(
  summonerId: string,
  platform: string
) {
  const client = riotClient(getPlatformBase(platform));
  return riotGetWithRetry<any[]>(
    client,
    `/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`,
    undefined,
    4
  );
}


export async function getSummonerBySummonerId(summonerId: string, platform: string) {
  const client = riotClient(getPlatformBase(platform));
  return riotGetWithRetry<any>(
    client,
    `/lol/summoner/v4/summoners/${encodeURIComponent(summonerId)}`,
    undefined,
    4
  );
}

export async function getLeagueEntriesByPuuid(puuid: string, platform: string) {
  const client = riotClient(getPlatformBase(platform));
  return riotGetWithRetry<any[]>(
    client,
    `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
    undefined,
    4
  );
}

export async function getEliteLeagueEntries(
  platform: string,
  queue = 'RANKED_SOLO_5x5',
  tier = 'CHALLENGER',
  division = 'I',
  page = 1
) {
  const client = riotClient(getPlatformBase(platform));
  return riotGetWithRetry<any[]>(
    client,
    `/lol/league-exp/v4/entries/${encodeURIComponent(queue)}/${encodeURIComponent(tier)}/${encodeURIComponent(division)}`,
    {
      params: { page },
    },
    4
  );
}

export async function getActiveGameBySummonerId(
  summonerId: string,
  platform: string
) {
  const client = riotClient(getPlatformBase(platform));
  return riotGetWithRetry<any>(
    client,
    `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(summonerId)}`,
    undefined,
    3
  );
}

/**
 * Fallback experimental path:
 * en algunos entornos/respuestas el flujo con summoner.id no está viniendo como se espera.
 * Probamos directo con PUUID para evitar romper live cuando summoner-v4 no trae id.
 */
export async function getActiveGameByPuuid(
  puuid: string,
  platform: string
) {
  const client = riotClient(getPlatformBase(platform));
  return riotGetWithRetry<any>(
    client,
    `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`,
    undefined,
    3
  );
}

export async function getLiveGameSmart(puuid: string, platform: string) {
  let summoner: any = null;
  let lastError: any = null;

  try {
    summoner = await getSummonerByPuuid(puuid, platform);
  } catch (error: any) {
    lastError = error;
  }

  if (summoner?.id) {
    try {
      const activeGame = await getActiveGameBySummonerId(summoner.id, platform);

      return {
        activeGame,
        debug: {
          strategy: 'summonerId',
          platform,
          summoner,
        },
      };
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        throw error;
      }
      lastError = error;
    }
  }

  try {
    const activeGame = await getActiveGameByPuuid(puuid, platform);

    return {
      activeGame,
      debug: {
        strategy: 'puuid',
        platform,
        summoner,
      },
    };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return {
        activeGame: null,
        debug: {
          strategy: summoner?.id ? 'summonerId_then_puuid_404' : 'puuid_404',
          platform,
          summoner,
          detail: error?.response?.data || null,
        },
      };
    }

    throw error;
  }
}

// ==========================================
// MATCH HISTORY
// ==========================================
export async function getMatchIdsByPuuid(
  puuid: string,
  platform: string,
  count = 20,
  start = 0,
  startTime?: number,
  endTime?: number,
  queue?: number,
  type?: 'ranked' | 'normal' | 'tourney' | 'tutorial'
) {
  const client = riotClient(getRegionalBase(platform));

  const params: Record<string, number> = { start, count };

  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  if (queue) params.queue = queue;
  if (type) (params as any).type = type;

  return riotGetWithRetry<string[]>(
    client,
    `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
    { params },
    5
  );
}

export async function getMatchById(matchId: string, platform: string) {
  const client = riotClient(getRegionalBase(platform));
  return riotGetWithRetry<any>(
    client,
    `/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
    undefined,
    5
  );
}

export async function getMatchTimelineById(matchId: string, platform: string) {
  const client = riotClient(getRegionalBase(platform));
  return riotGetWithRetry<any>(
    client,
    `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`,
    undefined,
    4
  );
}

export async function getLatestDdragonVersion() {
  const cached = getCache<string>('ddragon:version');
  if (cached) return cached;

  const { data } = await axios.get(
    'https://ddragon.leagueoflegends.com/api/versions.json',
    { timeout: 15000 }
  );

  const version = data[0];
  setCache('ddragon:version', version, DDRAGON_VERSION_TTL_MS);
  return version;
}

export async function getChampionList() {
  const cached = getCache<any>('ddragon:champion-list');
  if (cached) return cached;
  const version = await getLatestDdragonVersion();

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
    { timeout: 15000 }
  );

  const payload = {
      version,
    champions: Object.values(data.data),
  };
  setCache('ddragon:champion-list', payload, DDRAGON_DATA_TTL_MS);
  return payload;
}

export async function getChampionById(championId: string) {
  const version = await getLatestDdragonVersion();
  const cacheKey = `ddragon:champion:${version}:${championId}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${encodeURIComponent(championId)}.json`,
    { timeout: 15000 }
  );

  const payload = data.data[championId];
  setCache(cacheKey, payload, DDRAGON_DATA_TTL_MS);
  return payload;
}

export async function getItemData() {
  const cached = getCache<any>('ddragon:item-data');
  if (cached) return cached;

  const version = await getLatestDdragonVersion();

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`,
    { timeout: 15000 }
  );

  const payload = { version, items: data.data };
  setCache('ddragon:item-data', payload, DDRAGON_DATA_TTL_MS);
  return payload;
}

export async function getSummonerSpellData() {
  const cached = getCache<any>('ddragon:summoner-spells');
  if (cached) return cached;

  const version = await getLatestDdragonVersion();

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`,
    { timeout: 15000 }
  );

  const payload = { version, spells: data.data };
  setCache('ddragon:summoner-spells', payload, DDRAGON_DATA_TTL_MS);
  return payload;
}
