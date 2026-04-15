import { fetchAnalyticsSummary } from './analytics';
import { fetchLiveGame } from './live';
import { fetchMatchHistory } from './matches';
import { fetchProfileSummary } from './profile';
import { fetchRankedOverview } from './ranked';

type SearchInput = {
  gameName: string;
  tagLine: string;
  region: string;
};

type QueueParticipant = {
  puuid?: string;
  championName?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  win?: boolean;
};

type HubOverview = {
  totalMatches: number;
  winRate: number;
  avgKda: number;
  topChampion: string;
  modulesReady: number;
  modulesTotal: number;
};

type HubResult = {
  profile: any;
  modules: {
    matches: { ok: boolean; data: any | null; error?: string };
    ranked: { ok: boolean; data: any | null; error?: string };
    live: { ok: boolean; data: any | null; error?: string };
    analytics: { ok: boolean; data: any | null; error?: string };
  };
  overview: HubOverview;
  errors: string[];
};

type HubCacheEnvelope = {
  savedAt: number;
  data: HubResult;
};

const HUB_CACHE_TTL_MS = 1000 * 60;
const hubCache = new Map<string, HubCacheEnvelope>();
const hubInFlight = new Map<string, Promise<HubResult>>();

function buildHubCacheKey(input: SearchInput) {
  return [
    String(input.region || '').trim().toLowerCase(),
    String(input.gameName || '').trim().toLowerCase(),
    String(input.tagLine || '').trim().toLowerCase(),
  ].join(':');
}

function getHubFromCache(cacheKey: string) {
  const cached = hubCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.savedAt > HUB_CACHE_TTL_MS) {
    hubCache.delete(cacheKey);
    return null;
  }
  return cached.data;
}

function getMyParticipants(matches: any[] | undefined, puuid: string) {
  if (!Array.isArray(matches)) return [];

  return matches
    .map((match) =>
      match?.info?.participants?.find((participant: QueueParticipant) => participant?.puuid === puuid)
    )
    .filter(Boolean) as QueueParticipant[];
}

function computeOverview(matches: any[] | undefined, puuid: string, moduleCount: number): HubOverview {
  const participants = getMyParticipants(matches, puuid);
  const totalMatches = participants.length;

  if (!totalMatches) {
    return {
      totalMatches: 0,
      winRate: 0,
      avgKda: 0,
      topChampion: 'N/A',
      modulesReady: moduleCount,
      modulesTotal: 4,
    };
  }

  const wins = participants.filter((item) => item.win).length;
  const kills = participants.reduce((acc, item) => acc + (item.kills ?? 0), 0);
  const deaths = participants.reduce((acc, item) => acc + (item.deaths ?? 0), 0);
  const assists = participants.reduce((acc, item) => acc + (item.assists ?? 0), 0);

  const championCount = new Map<string, number>();
  participants.forEach((item) => {
    const key = item.championName || 'Unknown';
    championCount.set(key, (championCount.get(key) ?? 0) + 1);
  });

  const topChampion = [...championCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return {
    totalMatches,
    winRate: (wins / totalMatches) * 100,
    avgKda: (kills + assists) / Math.max(1, deaths),
    topChampion,
    modulesReady: moduleCount,
    modulesTotal: 4,
  };
}

async function computePlayerHubData(input: SearchInput): Promise<HubResult> {
  const profile = await fetchProfileSummary(input);
  const puuid = profile?.account?.puuid;
  const platform = profile?.resolvedPlatform;
  if (!puuid || !platform) {
    throw new Error('No se pudo resolver puuid/plataforma para este Riot ID');
  }

  const requests = await Promise.allSettled([
    fetchMatchHistory({ puuid, platform, count: 20 }),
    fetchRankedOverview({ puuid, platform }),
    fetchLiveGame({ puuid, platform }),
    fetchAnalyticsSummary({ puuid, platform, queue: 'all' }),
  ]);

  const matches = requests[0].status === 'fulfilled'
    ? { ok: true, data: requests[0].value }
    : { ok: false, data: null, error: String(requests[0].reason?.message || 'No se pudo cargar matches') };
  const ranked = requests[1].status === 'fulfilled'
    ? { ok: true, data: requests[1].value }
    : { ok: false, data: null, error: String(requests[1].reason?.message || 'No se pudo cargar ranked') };
  const live = requests[2].status === 'fulfilled'
    ? { ok: true, data: requests[2].value }
    : { ok: false, data: null, error: String(requests[2].reason?.message || 'No se pudo cargar live') };
  const analytics = requests[3].status === 'fulfilled'
    ? { ok: true, data: requests[3].value }
    : { ok: false, data: null, error: String(requests[3].reason?.message || 'No se pudo cargar analytics') };

  const modulesReady = [matches, ranked, live, analytics].filter((module) => module.ok).length;
  const overview = computeOverview(matches.data?.matches, puuid, modulesReady);
  const errors = [matches, ranked, live, analytics]
    .filter((module) => !module.ok && module.error)
    .map((module) => module.error as string);

  return {
    profile,
    modules: {
      matches,
      ranked,
      live,
      analytics,
    },
    overview,
    errors,
  };
}

export async function fetchPlayerHubData(input: SearchInput): Promise<HubResult> {
  const cacheKey = buildHubCacheKey(input);
  const cached = getHubFromCache(cacheKey);
  if (cached) return cached;

  const running = hubInFlight.get(cacheKey);
  if (running) return running;

  const request = computePlayerHubData(input)
    .then((result) => {
      hubCache.set(cacheKey, {
        savedAt: Date.now(),
        data: result,
      });
      return result;
    })
    .finally(() => {
      hubInFlight.delete(cacheKey);
    });

  hubInFlight.set(cacheKey, request);
  return request;
}
