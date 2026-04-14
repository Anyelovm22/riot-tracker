import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  getChampionList,
  getEliteLeagueEntries,
  getItemData,
  getMatchById,
  getMatchIdsByPuuid,
  getSummonerBySummonerId,
} from '../services/riot.service';

type CachedInsight = {
  expiresAt: number;
  payload: ChampionInsightsPayload;
};

type ProMatch = {
  matchId: string;
  gameCreation: number;
  gameDuration: number;
  queueId: number;
  proPlayer: string;
  leaguePoints: number;
  rankTier: string;
  role: string;
  win: boolean;
  opponentChampion: string;
  patch: string;
  items: number[];
  primaryStyle: number;
  subStyle: number;
  keystone: number;
};

type ItemAggregate = {
  itemId: number;
  name: string;
  games: number;
  wins: number;
  winRate: number;
  popularity: number;
  sampleQualified: boolean;
};

type ChampionInsightsPayload = {
  champion: string;
  region: string;
  patch: string;
  rank: string;
  role: string;
  versusChampion: string | null;
  requestedVersusChampion: string | null;
  sampleSize: number;
  eligibleGames: number;
  winRate: number;
  pickRate: number;
  minSampleSize: number;
  appliedFallback?: boolean;
  fallbackReason?: string;
  overview: {
    primaryBuild: {
      games: number;
      winRate: number;
      items: Array<{ itemId: number; name: string }>;
      coreItems: Array<{ itemId: number; name: string }>;
    } | null;
    skillOrder: string[];
    topRunes: Array<{
      primaryStyle: number;
      subStyle: number;
      keystone: number;
      games: number;
      winRate: number;
    }>;
  };
  itemStats: {
    bySlot: {
      starter: ItemAggregate[];
      core1: ItemAggregate[];
      core2: ItemAggregate[];
      core3: ItemAggregate[];
      situational: ItemAggregate[];
    };
    mostBought: ItemAggregate[];
    bestWinRate: ItemAggregate[];
  };
  builds: {
    mostPopular: Array<{
      games: number;
      wins: number;
      winRate: number;
      popularity: number;
      sampleQualified: boolean;
      items: Array<{ itemId: number; name: string }>;
    }>;
    bestPerformance: Array<{
      games: number;
      wins: number;
      winRate: number;
      popularity: number;
      sampleQualified: boolean;
      items: Array<{ itemId: number; name: string }>;
    }>;
  };
  secondary: {
    matchups: Array<{ championName: string; games: number; wins: number; winRate: number }>;
    counters: Array<{ championName: string; games: number; wins: number; winRate: number }>;
    itemAlternatives: ItemAggregate[];
    trendByMinute: {
      labels: string[];
      values: number[];
      percentages: number[];
    };
  };
  charts: {
    buildWinrate: {
      labels: string[];
      values: number[];
      percentages: number[];
      trend: number[];
    };
    roleDistribution: {
      labels: string[];
      values: number[];
      percentages: number[];
    };
  };
  proMatches: ProMatch[];
  cacheMeta: {
    generatedAt: string;
  };
};

const championInsightsCache = new Map<string, CachedInsight>();
const championInsightsInFlight = new Map<string, Promise<{ status: number; payload: ChampionInsightsPayload | { message: string } }>>();
const INSIGHTS_CACHE_TTL_MS = 1000 * 60 * 30;
const MATCH_FETCH_CONCURRENCY = 15;
const TOP_PLAYERS_LIMIT = 40;
const MATCH_IDS_PER_PLAYER = 12;
const TARGET_PRO_MATCHES = 60;
const MIN_SAMPLE_SIZE = 8;

const matchIdsCache = new Map<string, { expiresAt: number; value: string[] }>();
const matchPayloadCache = new Map<string, { expiresAt: number; value: any }>();
const MATCH_DATA_TTL_MS = 1000 * 60 * 15;
const summonerPuuidCache = new Map<string, { expiresAt: number; value: string | null }>();

const championInsightsCachePath = path.join(process.cwd(), 'server', 'src', 'data', 'championInsightsCache.json');
let persistentCacheLoaded = false;

function normalizeCacheToken(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function normalizeChampionName(name: string) {
  return normalizeCacheToken(name);
}

function normalizePatch(gameVersion: string) {
  const parts = String(gameVersion || '').split('.');
  if (parts.length < 2) return 'unknown';
  return `${parts[0]}.${parts[1]}`;
}

function getInsightCacheKey(champion: string, platform: string, versusChampion: string, role: string, rank: string, patch: string) {
  return [platform, normalizeCacheToken(champion), normalizeCacheToken(versusChampion), normalizeCacheToken(role), normalizeCacheToken(rank), normalizeCacheToken(patch)].join(':');
}

function loadPersistentInsightCache() {
  if (persistentCacheLoaded) return;
  persistentCacheLoaded = true;

  try {
    if (!fs.existsSync(championInsightsCachePath)) return;
    const raw = fs.readFileSync(championInsightsCachePath, 'utf-8');
    const parsed = JSON.parse(raw || '{}') as Record<string, CachedInsight>;
    const now = Date.now();

    for (const [key, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry.expiresAt !== 'number' || entry.expiresAt <= now) continue;
      championInsightsCache.set(key, entry);
    }
  } catch {
    // ignore cache restore errors
  }
}

function persistInsightCache() {
  try {
    fs.mkdirSync(path.dirname(championInsightsCachePath), { recursive: true });
    const now = Date.now();
    const serialized: Record<string, CachedInsight> = {};

    for (const [key, entry] of championInsightsCache.entries()) {
      if (!entry || entry.expiresAt <= now) continue;
      serialized[key] = entry;
    }

    fs.writeFileSync(championInsightsCachePath, JSON.stringify(serialized), 'utf-8');
  } catch {
    // ignore persistence errors
  }
}

function getCachedInsight(cacheKey: string) {
  loadPersistentInsightCache();
  const cached = championInsightsCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    championInsightsCache.delete(cacheKey);
    persistInsightCache();
    return null;
  }

  return cached.payload;
}

function rememberInsight(cacheKey: string, payload: ChampionInsightsPayload) {
  loadPersistentInsightCache();
  championInsightsCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + INSIGHTS_CACHE_TTL_MS,
  });
  persistInsightCache();
}

async function getCachedMatchIds(puuid: string, platform: string) {
  const key = `${platform}:${puuid}`;
  const fromCache = matchIdsCache.get(key);
  if (fromCache && fromCache.expiresAt > Date.now()) {
    return fromCache.value;
  }

  const value = await getMatchIdsByPuuid(puuid, platform, MATCH_IDS_PER_PLAYER, 0).catch(() => []);
  matchIdsCache.set(key, { value, expiresAt: Date.now() + MATCH_DATA_TTL_MS });
  return value;
}

async function getCachedMatch(matchId: string, platform: string) {
  const key = `${platform}:${matchId}`;
  const fromCache = matchPayloadCache.get(key);
  if (fromCache && fromCache.expiresAt > Date.now()) {
    return fromCache.value;
  }

  const value = await getMatchById(matchId, platform).catch(() => null);
  if (value) {
    matchPayloadCache.set(key, { value, expiresAt: Date.now() + MATCH_DATA_TTL_MS });
  }
  return value;
}


async function resolveEntryPuuid(entry: any, platform: string) {
  if (entry?.puuid) return String(entry.puuid);
  const summonerId = String(entry?.summonerId || '').trim();
  if (!summonerId) return null;

  const key = `${platform}:${summonerId}`;
  const cached = summonerPuuidCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const summoner = await getSummonerBySummonerId(summonerId, platform).catch(() => null);
  const puuid = summoner?.puuid ? String(summoner.puuid) : null;
  summonerPuuidCache.set(key, { value: puuid, expiresAt: Date.now() + MATCH_DATA_TTL_MS });
  return puuid;
}

function getLaneOpponent(participants: any[], player: any) {
  const byRole = participants.find(
    (p) => p.teamId !== player.teamId && p.individualPosition && p.individualPosition === player.individualPosition,
  );
  return byRole || participants.find((p) => p.teamId !== player.teamId) || null;
}

function toPercent(part: number, total: number) {
  return Number(((part / Math.max(1, total)) * 100).toFixed(1));
}

function sortByGamesAndWinrate<T extends { games: number; winRate: number }>(rows: T[]) {
  return [...rows].sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

function aggregateItemsBySlot(matches: ProMatch[], itemMap: Record<string, any>) {
  const starter = new Map<number, { games: number; wins: number }>();
  const core1 = new Map<number, { games: number; wins: number }>();
  const core2 = new Map<number, { games: number; wins: number }>();
  const core3 = new Map<number, { games: number; wins: number }>();
  const situational = new Map<number, { games: number; wins: number }>();

  const touch = (target: Map<number, { games: number; wins: number }>, itemId: number, win: boolean) => {
    if (!itemId) return;
    const row = target.get(itemId) || { games: 0, wins: 0 };
    row.games += 1;
    if (win) row.wins += 1;
    target.set(itemId, row);
  };

  for (const match of matches) {
    const [i0, i1, i2, i3, i4, i5] = match.items;
    touch(starter, i0, match.win);
    touch(core1, i1, match.win);
    touch(core2, i2, match.win);
    touch(core3, i3, match.win);
    touch(situational, i4, match.win);
    touch(situational, i5, match.win);
  }

  const toList = (source: Map<number, { games: number; wins: number }>) =>
    [...source.entries()]
      .map(([itemId, row]) => ({
        itemId,
        name: itemMap[String(itemId)]?.name || `item ${itemId}`,
        games: row.games,
        wins: row.wins,
        winRate: toPercent(row.wins, row.games),
        popularity: toPercent(row.games, matches.length),
        sampleQualified: row.games >= MIN_SAMPLE_SIZE,
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 8);

  return {
    starter: toList(starter),
    core1: toList(core1),
    core2: toList(core2),
    core3: toList(core3),
    situational: toList(situational),
  };
}


async function getElitePlayerPool(platform: string, rank: string) {
  const normalizedRank = String(rank || 'ALL').toUpperCase();
  const tierPlan =
    normalizedRank === 'ALL'
      ? [
          { tier: 'CHALLENGER', pages: [1] },
          { tier: 'GRANDMASTER', pages: [1, 2] },
          { tier: 'MASTER', pages: [1, 2] },
        ]
      : [{ tier: normalizedRank, pages: [1, 2] }];

  const requests: Promise<any[]>[] = [];
  for (const group of tierPlan) {
    for (const page of group.pages) {
      requests.push(getEliteLeagueEntries(platform, 'RANKED_SOLO_5x5', group.tier, 'I', page).catch(() => []));
    }
  }

  const settled = await Promise.all(requests);
  const bySummoner = new Map<string, any>();

  for (const list of settled) {
    for (const entry of list || []) {
      const summonerId = String(entry?.summonerId || '').trim();
      const key = summonerId || String(entry?.summonerName || '').trim().toLowerCase();
      if (!key) continue;

      const prev = bySummoner.get(key);
      if (!prev || (entry?.leaguePoints || 0) > (prev?.leaguePoints || 0)) {
        bySummoner.set(key, entry);
      }
    }
  }

  return [...bySummoner.values()]
    .sort((a, b) => (b?.leaguePoints || 0) - (a?.leaguePoints || 0))
    .slice(0, TOP_PLAYERS_LIMIT);
}

function buildPayload({
  champion,
  platform,
  patch,
  rank,
  role,
  versusChampion,
  eligibleGames,
  proMatches,
  itemMap,
}: {
  champion: string;
  platform: string;
  patch: string;
  rank: string;
  role: string;
  versusChampion: string;
  eligibleGames: number;
  proMatches: ProMatch[];
  itemMap: Record<string, any>;
}): ChampionInsightsPayload {
  const buildCounts = new Map<string, { wins: number; total: number; items: number[] }>();
  const itemCounts = new Map<number, { games: number; wins: number }>();
  const runeCounts = new Map<string, { wins: number; total: number; primaryStyle: number; subStyle: number; keystone: number }>();
  const roleCounts = new Map<string, { wins: number; total: number }>();
  const matchupCounts = new Map<string, { wins: number; total: number }>();

  for (const match of proMatches) {
    const key = match.items.join('-');
    if (!buildCounts.has(key)) {
      buildCounts.set(key, { wins: 0, total: 0, items: match.items });
    }
    const buildEntry = buildCounts.get(key)!;
    buildEntry.total += 1;
    if (match.win) buildEntry.wins += 1;

    for (const itemId of match.items) {
      if (!itemId) continue;
      const itemEntry = itemCounts.get(itemId) || { games: 0, wins: 0 };
      itemEntry.games += 1;
      if (match.win) itemEntry.wins += 1;
      itemCounts.set(itemId, itemEntry);
    }

    const roleEntry = roleCounts.get(match.role) || { wins: 0, total: 0 };
    roleEntry.total += 1;
    if (match.win) roleEntry.wins += 1;
    roleCounts.set(match.role, roleEntry);

    const matchupEntry = matchupCounts.get(match.opponentChampion) || { wins: 0, total: 0 };
    matchupEntry.total += 1;
    if (match.win) matchupEntry.wins += 1;
    matchupCounts.set(match.opponentChampion, matchupEntry);

    const runeKey = `${match.primaryStyle}-${match.subStyle}-${match.keystone}`;
    const runeEntry = runeCounts.get(runeKey) || {
      wins: 0,
      total: 0,
      primaryStyle: match.primaryStyle,
      subStyle: match.subStyle,
      keystone: match.keystone,
    };
    runeEntry.total += 1;
    if (match.win) runeEntry.wins += 1;
    runeCounts.set(runeKey, runeEntry);
  }

  const sampleSize = proMatches.length;
  const totalWins = proMatches.filter((match) => match.win).length;
  const winRate = toPercent(totalWins, sampleSize);
  const pickRate = toPercent(sampleSize, eligibleGames);

  const buildsRaw = [...buildCounts.values()].map((row) => ({
    games: row.total,
    wins: row.wins,
    winRate: toPercent(row.wins, row.total),
    popularity: toPercent(row.total, sampleSize),
    sampleQualified: row.total >= MIN_SAMPLE_SIZE,
    items: row.items.map((itemId) => ({
      itemId,
      name: itemMap[String(itemId)]?.name || `item ${itemId}`,
    })),
  }));

  const mostPopularBuilds = [...buildsRaw].sort((a, b) => b.games - a.games).slice(0, 5);
  const bestPerformanceBuilds = [...buildsRaw]
    .filter((build) => build.sampleQualified)
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    .slice(0, 5);

  const allItems = [...itemCounts.entries()].map(([itemId, stats]) => ({
    itemId,
    name: itemMap[String(itemId)]?.name || `item ${itemId}`,
    games: stats.games,
    wins: stats.wins,
    winRate: toPercent(stats.wins, stats.games),
    popularity: toPercent(stats.games, sampleSize),
    sampleQualified: stats.games >= MIN_SAMPLE_SIZE,
  }));

  const topRunes = [...runeCounts.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((rune) => ({
      primaryStyle: rune.primaryStyle,
      subStyle: rune.subStyle,
      keystone: rune.keystone,
      games: rune.total,
      winRate: toPercent(rune.wins, rune.total),
    }));

  const roleStats = sortByGamesAndWinrate(
    [...roleCounts.entries()].map(([label, stats]) => ({
      label,
      games: stats.total,
      winRate: toPercent(stats.wins, stats.total),
    })),
  );

  const matchupStats = sortByGamesAndWinrate(
    [...matchupCounts.entries()].map(([championName, stats]) => ({
      championName,
      games: stats.total,
      wins: stats.wins,
      winRate: toPercent(stats.wins, stats.total),
    })),
  );

  const matchups = matchupStats.slice(0, 10);
  const counters = [...matchupStats].filter((row) => row.games >= MIN_SAMPLE_SIZE).sort((a, b) => a.winRate - b.winRate).slice(0, 10);
  const itemStatsBySlot = aggregateItemsBySlot(proMatches, itemMap);

  const trendBuckets = [10, 15, 20, 25, 30, 35, 40];
  const trendData = trendBuckets.map((minute) => {
    const games = proMatches.filter((match) => match.gameDuration / 60 <= minute).length;
    return {
      minute,
      games,
      percentage: toPercent(games, sampleSize),
    };
  });

  return {
    champion,
    region: platform,
    patch,
    rank,
    role,
    versusChampion: versusChampion || null,
    requestedVersusChampion: versusChampion || null,
    sampleSize,
    eligibleGames,
    winRate,
    pickRate,
    minSampleSize: MIN_SAMPLE_SIZE,
    overview: {
      primaryBuild: mostPopularBuilds[0]
        ? {
            games: mostPopularBuilds[0].games,
            winRate: mostPopularBuilds[0].winRate,
            items: mostPopularBuilds[0].items,
            coreItems: mostPopularBuilds[0].items.slice(1, 4),
          }
        : null,
      skillOrder: ['Q', 'E', 'W'],
      topRunes,
    },
    itemStats: {
      bySlot: itemStatsBySlot,
      mostBought: [...allItems].sort((a, b) => b.games - a.games).slice(0, 10),
      bestWinRate: [...allItems].filter((item) => item.sampleQualified).sort((a, b) => b.winRate - a.winRate).slice(0, 10),
    },
    builds: {
      mostPopular: mostPopularBuilds,
      bestPerformance: bestPerformanceBuilds,
    },
    secondary: {
      matchups,
      counters,
      itemAlternatives: [...allItems].filter((item) => item.sampleQualified).sort((a, b) => b.winRate - a.winRate).slice(0, 8),
      trendByMinute: {
        labels: trendData.map((row) => `${row.minute}m`),
        values: trendData.map((row) => row.games),
        percentages: trendData.map((row) => row.percentage),
      },
    },
    charts: {
      buildWinrate: {
        labels: mostPopularBuilds.map((_row, idx) => `Build ${idx + 1}`),
        values: mostPopularBuilds.map((row) => row.games),
        percentages: mostPopularBuilds.map((row) => row.winRate),
        trend: mostPopularBuilds.map((row) => row.popularity),
      },
      roleDistribution: {
        labels: roleStats.map((row) => row.label),
        values: roleStats.map((row) => row.games),
        percentages: roleStats.map((row) => row.winRate),
      },
    },
    proMatches: [...proMatches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, 20),
    cacheMeta: {
      generatedAt: new Date().toISOString(),
    },
  };
}

async function buildChampionInsights(champion: string, platform: string, versusChampion: string, role: string, rank: string, patch: string) {
  const [{ items }, championsData, eliteEntries] = await Promise.all([getItemData(), getChampionList(), getEliteLeagueEntries(platform)]);

  const championByNormalizedName = new Map<string, string>(
    (championsData?.champions || []).map((championData: any) => [normalizeChampionName(championData?.name), String(championData?.name || '')]),
  );

  const resolvedChampion = championByNormalizedName.get(normalizeChampionName(champion));
  if (!resolvedChampion) {
    return { status: 404, payload: { message: `Champion ${champion} not found` } };
  }

  const normalizedRank = (rank || 'ALL').toUpperCase();
  const elitePool = await getElitePlayerPool(platform, normalizedRank);
  const topPlayers = elitePool.length
    ? elitePool
    : (eliteEntries || [])
        .filter((entry: any) => (normalizedRank === 'ALL' ? true : String(entry.tier || '').toUpperCase() === normalizedRank))
        .sort((a: any, b: any) => (b.leaguePoints || 0) - (a.leaguePoints || 0))
        .slice(0, TOP_PLAYERS_LIMIT);

  const matchIdResults = await Promise.allSettled(
    topPlayers.map(async (entry: any) => {
      const entryPuuid = await resolveEntryPuuid(entry, platform);
      if (!entryPuuid) return { entry, entryPuuid: null, matchIds: [] as string[] };
      const matchIds = await getCachedMatchIds(entryPuuid, platform);
      return { entry, entryPuuid, matchIds };
    }),
  );

  const pendingMatches: Array<{ entry: any; entryPuuid: string; matchId: string }> = [];
  const seenMatchIds = new Set<string>();

  for (const result of matchIdResults) {
    if (result.status !== 'fulfilled') continue;

    for (const matchId of result.value.matchIds) {
      if (seenMatchIds.has(matchId)) continue;
      seenMatchIds.add(matchId);
      if (!result.value.entryPuuid) continue;
      pendingMatches.push({ entry: result.value.entry, entryPuuid: result.value.entryPuuid, matchId });
    }
  }

  const allRelevantMatches: ProMatch[] = [];
  const normalizedRole = (role || 'ALL').toUpperCase();
  const normalizedPatch = (patch || 'latest').toLowerCase();

  for (let index = 0; index < pendingMatches.length && allRelevantMatches.length < TARGET_PRO_MATCHES * 2; index += MATCH_FETCH_CONCURRENCY) {
    const batch = pendingMatches.slice(index, index + MATCH_FETCH_CONCURRENCY);
    const matches = await Promise.all(
      batch.map(async ({ entry, entryPuuid, matchId }) => {
        const match = await getCachedMatch(matchId, platform);
        if (!match?.info?.participants) return null;

        const participant = match.info.participants.find((p: any) => p.puuid === entryPuuid && normalizeChampionName(p.championName) === normalizeChampionName(resolvedChampion));
        if (!participant) return null;

        const roleValue = String(participant.individualPosition || 'UNKNOWN').toUpperCase();
        if (normalizedRole !== 'ALL' && roleValue !== normalizedRole) return null;

        const patchValue = normalizePatch(match.info.gameVersion);
        if (normalizedPatch !== 'latest' && normalizedPatch !== 'all' && patchValue !== normalizePatch(patch)) return null;

        const opponent = getLaneOpponent(match.info.participants, participant);

        return {
          matchId: match.metadata?.matchId || matchId,
          gameCreation: match.info.gameCreation,
          gameDuration: match.info.gameDuration,
          queueId: match.info.queueId,
          proPlayer: entry.summonerName || 'HighElo Player',
          leaguePoints: entry.leaguePoints || 0,
          rankTier: String(entry.tier || 'UNKNOWN'),
          role: roleValue,
          win: !!participant.win,
          opponentChampion: opponent?.championName || 'Unknown',
          patch: patchValue,
          items: [participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5].filter(Boolean),
          primaryStyle: participant?.perks?.styles?.[0]?.style || 0,
          subStyle: participant?.perks?.styles?.[1]?.style || 0,
          keystone: participant?.perks?.styles?.[0]?.selections?.[0]?.perk || 0,
        } as ProMatch;
      }),
    );

    for (const processedMatch of matches) {
      if (!processedMatch) continue;
      allRelevantMatches.push(processedMatch);
      if (allRelevantMatches.length >= TARGET_PRO_MATCHES * 2) break;
    }
  }

  const effectivePatch = normalizedPatch === 'latest' && allRelevantMatches[0]?.patch ? allRelevantMatches[0].patch : patch || 'latest';

  const patchFilteredMatches = allRelevantMatches.filter((match) => {
    if (normalizedPatch === 'all') return true;
    if (normalizedPatch === 'latest') return match.patch === effectivePatch;
    return match.patch === normalizePatch(patch);
  });

  const normalizedVersus = String(versusChampion || '').trim();
  let effectiveMatches = patchFilteredMatches;
  if (normalizedPatch === 'latest' && effectiveMatches.length < MIN_SAMPLE_SIZE && allRelevantMatches.length >= MIN_SAMPLE_SIZE) {
    effectiveMatches = allRelevantMatches;
  }

  const eligibleGames = effectiveMatches.length;

  const filteredMatches = normalizedVersus
    ? effectiveMatches.filter((match) => normalizeChampionName(match.opponentChampion) === normalizeChampionName(normalizedVersus))
    : effectiveMatches;

  if (!allRelevantMatches.length) {
    console.warn(`[builds] Empty dataset for champion=${resolvedChampion} platform=${platform} role=${normalizedRole} rank=${normalizedRank}`);
  }

  if (normalizedVersus && filteredMatches.length < MIN_SAMPLE_SIZE) {
    const fallbackPayload = buildPayload({
      champion: resolvedChampion,
      platform,
      patch: effectivePatch,
      rank: normalizedRank,
      role: normalizedRole,
      versusChampion: '',
      eligibleGames: Math.max(eligibleGames, effectiveMatches.length),
      proMatches: effectiveMatches.slice(0, TARGET_PRO_MATCHES),
      itemMap: items,
    });

    return {
      status: 200,
      payload: {
        ...fallbackPayload,
        requestedVersusChampion: normalizedVersus,
        appliedFallback: true,
        fallbackReason: 'No había muestra suficiente para ese matchup exacto. Se mostró la build general del campeón.',
      },
    };
  }

  const payload = buildPayload({
    champion: resolvedChampion,
    platform,
    patch: effectivePatch,
    rank: normalizedRank,
    role: normalizedRole,
    versusChampion: normalizedVersus,
    eligibleGames: Math.max(eligibleGames, effectiveMatches.length),
    proMatches: filteredMatches.slice(0, TARGET_PRO_MATCHES),
    itemMap: items,
  });

  return { status: 200, payload };
}

function toSummary(payload: ChampionInsightsPayload) {
  return {
    champion: payload.champion,
    region: payload.region,
    patch: payload.patch,
    rank: payload.rank,
    role: payload.role,
    versusChampion: payload.versusChampion,
    requestedVersusChampion: payload.requestedVersusChampion,
    sampleSize: payload.sampleSize,
    eligibleGames: payload.eligibleGames,
    winRate: payload.winRate,
    pickRate: payload.pickRate,
    minSampleSize: payload.minSampleSize,
    appliedFallback: payload.appliedFallback,
    fallbackReason: payload.fallbackReason,
    overview: payload.overview,
    itemStats: payload.itemStats,
    builds: payload.builds,
    charts: payload.charts,
    cacheMeta: payload.cacheMeta,
  };
}

export async function getBuildsByChampion(req: Request, res: Response) {
  try {
    const puuid = String(req.query.puuid || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();
    const champion = String(req.query.champion || '').trim();

    if (!puuid) {
      return res.status(400).json({ message: 'puuid is required' });
    }

    const matchIds = await getMatchIdsByPuuid(puuid, platform, 20, 0);
    const matches = await Promise.all(matchIds.map((id: string) => getMatchById(id, platform)));
    const { items } = await getItemData();

    const relevantPlayers = matches
      .map((match: any) => match.info.participants.find((p: any) => p.puuid === puuid))
      .filter(Boolean)
      .filter((p: any) => (champion ? p.championName === champion : true));

    const itemCounts = new Map<number, number>();

    for (const player of relevantPlayers) {
      const slots = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5];

      for (const itemId of slots) {
        if (itemId && itemId !== 0) {
          itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
        }
      }
    }

    const topItems = [...itemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([itemId, count]) => ({
        itemId,
        count,
        itemData: items[String(itemId)] || null,
      }));

    res.json({
      champion: champion || null,
      sampleSize: relevantPlayers.length,
      topItems,
    });
  } catch (error: any) {
    res.status(error?.response?.status || 500).json({
      message: 'Error generating builds',
      detail: error?.response?.data || null,
    });
  }
}

export async function getChampionBuildInsights(req: Request, res: Response) {
  try {
    const champion = String(req.query.champion || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();
    const versusChampion = String(req.query.versusChampion || '').trim();
    const role = String(req.query.role || 'ALL').trim().toUpperCase();
    const rank = String(req.query.rank || 'ALL').trim().toUpperCase();
    const patch = String(req.query.patch || 'latest').trim();
    const view = String(req.query.view || 'full').trim().toLowerCase();

    if (!champion) {
      return res.status(400).json({ message: 'champion is required' });
    }

    const cacheKey = getInsightCacheKey(champion, platform, versusChampion, role, rank, patch);
    const cached = getCachedInsight(cacheKey);
    if (cached) {
      return res.json(view === 'summary' ? toSummary(cached) : cached);
    }

    const existingRequest = championInsightsInFlight.get(cacheKey);
    if (existingRequest) {
      const result = await existingRequest;
      if (result.status !== 200) return res.status(result.status).json(result.payload);
      return res.json(view === 'summary' ? toSummary(result.payload as ChampionInsightsPayload) : result.payload);
    }

    const requestPromise = buildChampionInsights(champion, platform, versusChampion, role, rank, patch)
      .then((result) => {
        if (result.status === 200) {
          rememberInsight(cacheKey, result.payload as ChampionInsightsPayload);
        }
        return result;
      })
      .finally(() => {
        championInsightsInFlight.delete(cacheKey);
      });

    championInsightsInFlight.set(cacheKey, requestPromise);

    const result = await requestPromise;
    if (result.status !== 200) {
      return res.status(result.status).json(result.payload);
    }

    return res.json(view === 'summary' ? toSummary(result.payload as ChampionInsightsPayload) : result.payload);
  } catch (error: any) {
    return res.status(error?.response?.status || 500).json({
      message: 'Error fetching champion build insights',
      detail: error?.response?.data || null,
    });
  }
}
