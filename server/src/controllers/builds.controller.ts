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
  spell1Casts: number;
  spell2Casts: number;
  spell3Casts: number;
  summonerSpell1: number;
  summonerSpell2: number;
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
  availableRoles: Array<{ role: string; games: number; winRate: number }>;
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
    topSummonerSpells: Array<{
      spell1Id: number;
      spell2Id: number;
      games: number;
      winRate: number;
      popularity: number;
      sampleQualified: boolean;
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
    matchupVariants: Array<{
      versusChampion: string;
      games: number;
      winRate: number;
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
  if (byRole) return byRole;

  const byLane = participants.find((p) => p.teamId !== player.teamId && p.teamPosition && p.teamPosition === player.teamPosition);
  if (byLane) return byLane;

  return participants.find((p) => p.teamId !== player.teamId) || null;
}

function toPercent(part: number, total: number) {
  return Number(((part / Math.max(1, total)) * 100).toFixed(1));
}

function sortByGamesAndWinrate<T extends { games: number; winRate: number }>(rows: T[]) {
  return [...rows].sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

function deriveSkillOrder(matches: ProMatch[]) {
  if (!matches.length) return [];

  let qCasts = 0;
  let wCasts = 0;
  let eCasts = 0;

  for (const match of matches) {
    qCasts += Math.max(0, Number(match.spell1Casts || 0));
    wCasts += Math.max(0, Number(match.spell2Casts || 0));
    eCasts += Math.max(0, Number(match.spell3Casts || 0));
  }

  const ordered = [
    { spell: 'Q', casts: qCasts },
    { spell: 'W', casts: wCasts },
    { spell: 'E', casts: eCasts },
  ]
    .sort((a, b) => b.casts - a.casts)
    .map((row) => row.spell);

  return ordered;
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
        name: itemMap[String(itemId)]?.name || `#${itemId}`,
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
  const spellCounts = new Map<string, { wins: number; total: number; spell1Id: number; spell2Id: number }>();

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

    if (match.summonerSpell1 && match.summonerSpell2) {
      const spellPair = [match.summonerSpell1, match.summonerSpell2].sort((a, b) => a - b);
      const spellKey = `${spellPair[0]}-${spellPair[1]}`;
      const spellEntry = spellCounts.get(spellKey) || {
        wins: 0,
        total: 0,
        spell1Id: spellPair[0],
        spell2Id: spellPair[1],
      };
      spellEntry.total += 1;
      if (match.win) spellEntry.wins += 1;
      spellCounts.set(spellKey, spellEntry);
    }
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
      name: itemMap[String(itemId)]?.name || `#${itemId}`,
    })).filter((item) => item.itemId > 0),
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

  const topSummonerSpells = [...spellCounts.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((spells) => ({
      spell1Id: spells.spell1Id,
      spell2Id: spells.spell2Id,
      games: spells.total,
      winRate: toPercent(spells.wins, spells.total),
      popularity: toPercent(spells.total, sampleSize),
      sampleQualified: spells.total >= MIN_SAMPLE_SIZE,
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
  const matchupVariants = matchups
    .filter((row) => row.games >= MIN_SAMPLE_SIZE)
    .slice(0, 5)
    .map((row) => {
      const versusMatches = proMatches.filter((match) => match.opponentChampion === row.championName);
      const variants = [...buildCounts.values()]
        .map((build) => {
          const buildKey = build.items.join('-');
          const games = versusMatches.filter((m) => m.items.join('-') === buildKey).length;
          const wins = versusMatches.filter((m) => m.items.join('-') === buildKey && m.win).length;
          return {
            games,
            winRate: toPercent(wins, games),
            items: build.items.map((itemId) => ({ itemId, name: itemMap[String(itemId)]?.name || `#${itemId}` })).filter((item) => item.itemId > 0),
          };
        })
        .filter((variant) => variant.games >= MIN_SAMPLE_SIZE)
        .sort((a, b) => b.games - a.games)
        .slice(0, 1)[0];

      return variants
        ? {
            versusChampion: row.championName,
            games: variants.games,
            winRate: variants.winRate,
            items: variants.items,
          }
        : null;
    })
    .filter(Boolean) as Array<{ versusChampion: string; games: number; winRate: number; items: Array<{ itemId: number; name: string }> }>;
  const itemStatsBySlot = aggregateItemsBySlot(proMatches, itemMap);
  const skillOrder = deriveSkillOrder(proMatches);

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
    availableRoles: roleStats.map((row) => ({ role: row.label, games: row.games, winRate: row.winRate })),
    overview: {
      primaryBuild: mostPopularBuilds[0]
        ? {
            games: mostPopularBuilds[0].games,
            winRate: mostPopularBuilds[0].winRate,
            items: mostPopularBuilds[0].items,
            coreItems: mostPopularBuilds[0].items.slice(1, 4),
          }
        : null,
      skillOrder,
      topRunes,
      topSummonerSpells,
    },
    itemStats: {
      bySlot: itemStatsBySlot,
      mostBought: [...allItems].sort((a, b) => b.games - a.games).slice(0, 10),
      bestWinRate: [...allItems].filter((item) => item.sampleQualified).sort((a, b) => b.winRate - a.winRate).slice(0, 10),
    },
    builds: {
      mostPopular: mostPopularBuilds,
      bestPerformance: bestPerformanceBuilds,
      matchupVariants,
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
        if (Number(match.info.queueId) !== 420) return null;

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
          items: [participant.item0 || 0, participant.item1 || 0, participant.item2 || 0, participant.item3 || 0, participant.item4 || 0, participant.item5 || 0],
          primaryStyle: participant?.perks?.styles?.[0]?.style || 0,
          subStyle: participant?.perks?.styles?.[1]?.style || 0,
          keystone: participant?.perks?.styles?.[0]?.selections?.[0]?.perk || 0,
          spell1Casts: participant?.spell1Casts || 0,
          spell2Casts: participant?.spell2Casts || 0,
          spell3Casts: participant?.spell3Casts || 0,
          summonerSpell1: participant?.summoner1Id || 0,
          summonerSpell2: participant?.summoner2Id || 0,
        } as ProMatch;
      }),
    );

    for (const processedMatch of matches) {
      if (!processedMatch) continue;
      allRelevantMatches.push(processedMatch);
      if (allRelevantMatches.length >= TARGET_PRO_MATCHES * 2) break;
    }
  }

  const latestPatch = allRelevantMatches[0]?.patch || 'latest';
  const effectivePatch = normalizedPatch === 'latest' ? latestPatch : patch || 'latest';
  const requestedPatchToken = normalizePatch(patch);
  const normalizedVersus = String(versusChampion || '').trim();

  const byRole = allRelevantMatches.filter((match) => (normalizedRole === 'ALL' ? true : match.role === normalizedRole));
  const byRoleAndPatch = byRole.filter((match) => {
    if (normalizedPatch === 'all') return true;
    if (normalizedPatch === 'latest') return match.patch === latestPatch;
    return match.patch === requestedPatchToken;
  });
  const byRoleAnyPatch = byRole;
  const byAnyRoleAndPatch = allRelevantMatches.filter((match) => {
    if (normalizedPatch === 'all') return true;
    if (normalizedPatch === 'latest') return match.patch === latestPatch;
    return match.patch === requestedPatchToken;
  });

  let effectiveMatches = byRoleAndPatch;
  const fallbackReasons: string[] = [];

  if (!effectiveMatches.length && byRoleAnyPatch.length) {
    effectiveMatches = byRoleAnyPatch;
    fallbackReasons.push('No había muestra suficiente en el parche solicitado; se usaron todos los parches disponibles para ese rol.');
  }

  if (!effectiveMatches.length && byAnyRoleAndPatch.length) {
    effectiveMatches = byAnyRoleAndPatch;
    fallbackReasons.push('No había muestra suficiente en el rol solicitado; se usaron todos los roles para el parche filtrado.');
  }

  if (!effectiveMatches.length && allRelevantMatches.length) {
    effectiveMatches = allRelevantMatches;
    fallbackReasons.push('No había muestra suficiente con los filtros seleccionados; se mostró el agregado general del campeón.');
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
        fallbackReason: ['No había muestra suficiente para ese matchup exacto. Se mostró la build general del campeón.', ...fallbackReasons]
          .filter(Boolean)
          .join(' '),
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

  const withFallbackNotice = fallbackReasons.length
    ? {
        ...payload,
        appliedFallback: true,
        fallbackReason: fallbackReasons.join(' '),
      }
    : payload;

  return { status: 200, payload: withFallbackNotice };
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
    availableRoles: payload.availableRoles,
    appliedFallback: payload.appliedFallback,
    fallbackReason: payload.fallbackReason,
    overview: payload.overview,
    itemStats: payload.itemStats,
    builds: payload.builds,
    charts: payload.charts,
    cacheMeta: payload.cacheMeta,
  };
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
