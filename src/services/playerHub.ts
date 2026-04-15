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
    matches: any | null;
    ranked: any | null;
    live: any | null;
    analytics: any | null;
  };
  overview: HubOverview;
};

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

export async function fetchPlayerHubData(input: SearchInput): Promise<HubResult> {
  const profile = await fetchProfileSummary(input);
  const puuid = profile?.account?.puuid;
  const platform = profile?.resolvedPlatform;

  const requests = await Promise.allSettled([
    fetchMatchHistory({ puuid, platform, count: 20 }),
    fetchRankedOverview({ puuid, platform }),
    fetchLiveGame({ puuid, platform }),
    fetchAnalyticsSummary({ puuid, platform, queue: 'all' }),
  ]);

  const matches = requests[0].status === 'fulfilled' ? requests[0].value : null;
  const ranked = requests[1].status === 'fulfilled' ? requests[1].value : null;
  const live = requests[2].status === 'fulfilled' ? requests[2].value : null;
  const analytics = requests[3].status === 'fulfilled' ? requests[3].value : null;

  const modulesReady = [matches, ranked, live, analytics].filter(Boolean).length;
  const overview = computeOverview(matches?.matches, puuid, modulesReady);

  return {
    profile,
    modules: {
      matches,
      ranked,
      live,
      analytics,
    },
    overview,
  };
}
