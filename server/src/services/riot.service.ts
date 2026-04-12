import axios from 'axios';
import { env } from '../config/env';

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

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  platform: string
) {
  const client = riotClient(getRegionalBase(platform));

  const { data } = await client.get(
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );

  return data;
}

export async function getSummonerByPuuid(puuid: string, platform: string) {
  const client = riotClient(getPlatformBase(platform));

  const { data } = await client.get(
    `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`
  );

  return data;
}

export async function getLeagueEntriesBySummonerId(
  summonerId: string,
  platform: string
) {
  const client = riotClient(getPlatformBase(platform));

  const { data } = await client.get(
    `/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`
  );

  return data;
}

export async function getActiveGameBySummonerId(
  summonerId: string,
  platform: string
) {
  const client = riotClient(getPlatformBase(platform));

  const { data } = await client.get(
    `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(summonerId)}`
  );

  return data;
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

  const { data } = await client.get(
    `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`
  );

  return data;
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
  endTime?: number
) {
  const client = riotClient(getRegionalBase(platform));

  const params: Record<string, number> = { start, count };

  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;

  const { data } = await client.get(
    `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
    { params }
  );

  return data;
}

export async function getMatchById(matchId: string, platform: string) {
  const client = riotClient(getRegionalBase(platform));

  const { data } = await client.get(
    `/lol/match/v5/matches/${encodeURIComponent(matchId)}`
  );

  return data;
}

export async function getLatestDdragonVersion() {
  const { data } = await axios.get(
    'https://ddragon.leagueoflegends.com/api/versions.json',
    { timeout: 15000 }
  );

  return data[0];
}

export async function getChampionList() {
  const version = await getLatestDdragonVersion();

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
    { timeout: 15000 }
  );

  return {
    version,
    champions: Object.values(data.data),
  };
}

export async function getChampionById(championId: string) {
  const version = await getLatestDdragonVersion();

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${encodeURIComponent(championId)}.json`,
    { timeout: 15000 }
  );

  return data.data[championId];
}

export async function getItemData() {
  const version = await getLatestDdragonVersion();

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`,
    { timeout: 15000 }
  );

  return { version, items: data.data };
}

export async function getSummonerSpellData() {
  const version = await getLatestDdragonVersion();

  const { data } = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`,
    { timeout: 15000 }
  );

  return { version, spells: data.data };
}