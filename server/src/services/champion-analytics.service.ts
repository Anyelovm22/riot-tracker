import { getChampionList, getEliteLeagueEntries, getItemData, getMatchById, getMatchIdsByPuuid, getSummonerBySummonerId } from './riot.service';

export type ChampionAnalyticsFilters = {
  champion: string;
  platform: string;
  role: string;
  rank: string;
  patch: string;
  versusChampion?: string;
};

type MatchRow = {
  matchId: string;
  gameCreation: number;
  queueId: number;
  patch: string;
  role: string;
  win: boolean;
  opponentChampion: string;
  items: number[];
  perkPrimaryStyle: number;
  perkSubStyle: number;
  perkKeystone: number;
  spell1Casts: number;
  spell2Casts: number;
  spell3Casts: number;
  summonerSpell1: number;
  summonerSpell2: number;
};

type CacheEntry<T> = { value: T; expiresAt: number };

type ItemAgg = { itemId: number; name: string; games: number; wins: number; winRate: number; popularity: number; sampleQualified: boolean };

type BuildAgg = { games: number; wins: number; winRate: number; popularity: number; sampleQualified: boolean; items: Array<{ itemId: number; name: string }> };

export type ChampionAnalyticsPayload = {
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
  availableRoles: Array<{ role: string; games: number; winRate: number }>;
  availablePatches: Array<{ patch: string; games: number }>;
  overview: {
    primaryBuild: { games: number; winRate: number; items: Array<{ itemId: number; name: string }>; coreItems: Array<{ itemId: number; name: string }> } | null;
    starterItems: ItemAgg[];
    coreItems: ItemAgg[];
    situationalItems: ItemAgg[];
    boots: ItemAgg[];
    skillOrder: string[];
    topRunes: Array<{ primaryStyle: number; subStyle: number; keystone: number; games: number; winRate: number; popularity: number }>;
    summonerSpells: Array<{ spell1Id: number; spell2Id: number; games: number; winRate: number; popularity: number; sampleQualified: boolean }>;
  };
  builds: {
    mostPopular: BuildAgg[];
    bestPerformance: BuildAgg[];
    matchupVariants: Array<{ versusChampion: string; games: number; winRate: number; items: Array<{ itemId: number; name: string }> }>;
  };
  itemStats: {
    bySlot: { starter: ItemAgg[]; core1: ItemAgg[]; core2: ItemAgg[]; core3: ItemAgg[]; situational: ItemAgg[] };
    mostBought: ItemAgg[];
    bestWinRate: ItemAgg[];
  };
  secondary: {
    matchups: Array<{ championName: string; games: number; wins: number; winRate: number }>;
    counters: Array<{ championName: string; games: number; wins: number; winRate: number }>;
  };
  charts: {
    buildWinrate: { labels: string[]; values: number[]; percentages: number[] };
    roleDistribution: { labels: string[]; values: number[]; percentages: number[] };
  };
  cacheMeta: { generatedAt: string };
};

const MATCH_IDS_PER_PLAYER = 20;
const TOP_PLAYERS_LIMIT = 80;
const TARGET_MATCHES = 280;
const FETCH_BATCH_SIZE = 15;
const MIN_SAMPLE_SIZE = 8;

const ttl = {
  analytics: 1000 * 60 * 30,
  playerMatches: 1000 * 60 * 15,
  staticData: 1000 * 60 * 60 * 4,
};

const analyticsCache = new Map<string, CacheEntry<ChampionAnalyticsPayload>>();
const inFlight = new Map<string, Promise<ChampionAnalyticsPayload>>();
const matchIdsCache = new Map<string, CacheEntry<string[]>>();
const matchPayloadCache = new Map<string, CacheEntry<any>>();
const puuidCache = new Map<string, CacheEntry<string | null>>();
const staticCache = new Map<string, CacheEntry<any>>();

const normalizeToken = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const normalizePatch = (value: string) => {
  const [major, minor] = String(value || '').split('.');
  return major && minor ? `${major}.${minor}` : 'unknown';
};

const pct = (n: number, total: number) => Number(((n / Math.max(1, total)) * 100).toFixed(1));

function getCached<T>(store: Map<string, CacheEntry<T>>, key: string) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCached<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function getStaticData() {
  const cached = getCached(staticCache, 'staticData');
  if (cached) return cached;
  const [championsData, itemData] = await Promise.all([getChampionList(), getItemData()]);
  const result = { champions: championsData?.champions || [], items: itemData?.items || {} };
  setCached(staticCache, 'staticData', result, ttl.staticData);
  return result;
}

async function getPlayerPuuid(entry: any, platform: string) {
  if (entry?.puuid) return String(entry.puuid);
  const summonerId = String(entry?.summonerId || '').trim();
  if (!summonerId) return null;
  const key = `${platform}:${summonerId}`;
  const cached = getCached(puuidCache, key);
  if (cached !== null) return cached;
  const summoner = await getSummonerBySummonerId(summonerId, platform).catch(() => null);
  const puuid = summoner?.puuid ? String(summoner.puuid) : null;
  setCached(puuidCache, key, puuid, ttl.playerMatches);
  return puuid;
}

async function getPlayerMatchIds(puuid: string, platform: string) {
  const key = `${platform}:${puuid}`;
  const cached = getCached(matchIdsCache, key);
  if (cached) return cached;
  const ids = await getMatchIdsByPuuid(puuid, platform, MATCH_IDS_PER_PLAYER, 0).catch(() => []);
  setCached(matchIdsCache, key, ids, ttl.playerMatches);
  return ids;
}

async function getMatch(matchId: string, platform: string) {
  const key = `${platform}:${matchId}`;
  const cached = getCached(matchPayloadCache, key);
  if (cached) return cached;
  const data = await getMatchById(matchId, platform).catch(() => null);
  if (data) setCached(matchPayloadCache, key, data, ttl.playerMatches);
  return data;
}

async function getElitePool(platform: string, rank: string) {
  const normalizedRank = String(rank || 'ALL').toUpperCase();
  const rankPlan =
    normalizedRank === 'ALL'
      ? [
          ['CHALLENGER', [1]],
          ['GRANDMASTER', [1, 2]],
          ['MASTER', [1, 2]],
          ['DIAMOND', [1, 2]],
          ['EMERALD', [1]],
        ]
      : [[normalizedRank, [1, 2]]];
  const queuePlan = ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'] as const;

  const requests: Array<Promise<any[]>> = [];
  for (const queue of queuePlan) {
    for (const [tier, pages] of rankPlan as Array<[string, number[]]>) {
      for (const page of pages) {
        requests.push(getEliteLeagueEntries(platform, queue, tier, 'I', page).catch(() => []));
      }
    }
  }

  const entries = (await Promise.all(requests)).flat();
  const byPlayer = new Map<string, any>();
  for (const entry of entries) {
    const key = String(entry?.summonerId || '').trim() || String(entry?.summonerName || '').trim().toLowerCase();
    if (!key) continue;
    const prev = byPlayer.get(key);
    if (!prev || Number(entry?.leaguePoints || 0) > Number(prev?.leaguePoints || 0)) byPlayer.set(key, entry);
  }

  return [...byPlayer.values()].sort((a, b) => Number(b?.leaguePoints || 0) - Number(a?.leaguePoints || 0)).slice(0, TOP_PLAYERS_LIMIT);
}

function extractParticipantMatch(match: any, entryPuuid: string, championName: string): MatchRow | null {
  const queueId = Number(match?.info?.queueId);
  if (queueId !== 420 && queueId !== 440) return null;
  const participants = match?.info?.participants || [];
  const participant = participants.find((p: any) => p.puuid === entryPuuid && normalizeToken(p.championName) === normalizeToken(championName));
  if (!participant) return null;
  const opponent = participants.find((p: any) => p.teamId !== participant.teamId && p.individualPosition === participant.individualPosition) ||
    participants.find((p: any) => p.teamId !== participant.teamId && p.teamPosition === participant.teamPosition) ||
    participants.find((p: any) => p.teamId !== participant.teamId);

  return {
    matchId: match?.metadata?.matchId || '',
    gameCreation: Number(match?.info?.gameCreation || 0),
    queueId,
    patch: normalizePatch(match?.info?.gameVersion),
    role: String(participant?.individualPosition || 'UNKNOWN').toUpperCase(),
    win: Boolean(participant?.win),
    opponentChampion: String(opponent?.championName || 'Unknown'),
    items: [participant.item0 || 0, participant.item1 || 0, participant.item2 || 0, participant.item3 || 0, participant.item4 || 0, participant.item5 || 0],
    perkPrimaryStyle: Number(participant?.perks?.styles?.[0]?.style || 0),
    perkSubStyle: Number(participant?.perks?.styles?.[1]?.style || 0),
    perkKeystone: Number(participant?.perks?.styles?.[0]?.selections?.[0]?.perk || 0),
    spell1Casts: Number(participant?.spell1Casts || 0),
    spell2Casts: Number(participant?.spell2Casts || 0),
    spell3Casts: Number(participant?.spell3Casts || 0),
    summonerSpell1: Number(participant?.summoner1Id || 0),
    summonerSpell2: Number(participant?.summoner2Id || 0),
  };
}

function aggregateItemsBySlot(matches: MatchRow[], itemMap: Record<string, any>) {
  const slots = {
    starter: new Map<number, { games: number; wins: number }>(),
    core1: new Map<number, { games: number; wins: number }>(),
    core2: new Map<number, { games: number; wins: number }>(),
    core3: new Map<number, { games: number; wins: number }>(),
    situational: new Map<number, { games: number; wins: number }>(),
  };

  const touch = (map: Map<number, { games: number; wins: number }>, itemId: number, win: boolean) => {
    if (!itemId) return;
    const row = map.get(itemId) || { games: 0, wins: 0 };
    row.games += 1;
    if (win) row.wins += 1;
    map.set(itemId, row);
  };

  for (const m of matches) {
    const [i0, i1, i2, i3, i4, i5] = m.items;
    touch(slots.starter, i0, m.win);
    touch(slots.core1, i1, m.win);
    touch(slots.core2, i2, m.win);
    touch(slots.core3, i3, m.win);
    touch(slots.situational, i4, m.win);
    touch(slots.situational, i5, m.win);
  }

  const toList = (map: Map<number, { games: number; wins: number }>): ItemAgg[] =>
    [...map.entries()]
      .map(([itemId, stats]) => ({
        itemId,
        name: itemMap[String(itemId)]?.name || `#${itemId}`,
        games: stats.games,
        wins: stats.wins,
        winRate: pct(stats.wins, stats.games),
        popularity: pct(stats.games, matches.length),
        sampleQualified: stats.games >= MIN_SAMPLE_SIZE,
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 10);

  return {
    starter: toList(slots.starter),
    core1: toList(slots.core1),
    core2: toList(slots.core2),
    core3: toList(slots.core3),
    situational: toList(slots.situational),
  };
}

function buildPayload(filters: ChampionAnalyticsFilters, matches: MatchRow[], eligibleGames: number, itemMap: Record<string, any>, fallbackReason?: string): ChampionAnalyticsPayload {
  const builds = new Map<string, { wins: number; total: number; items: number[] }>();
  const itemCounts = new Map<number, { games: number; wins: number }>();
  const runes = new Map<string, { wins: number; total: number; primaryStyle: number; subStyle: number; keystone: number }>();
  const spells = new Map<string, { wins: number; total: number; spell1Id: number; spell2Id: number }>();
  const matchups = new Map<string, { wins: number; total: number }>();
  const roles = new Map<string, { wins: number; total: number }>();

  for (const row of matches) {
    const key = row.items.join('-');
    const buildRow = builds.get(key) || { wins: 0, total: 0, items: row.items };
    buildRow.total += 1;
    if (row.win) buildRow.wins += 1;
    builds.set(key, buildRow);

    for (const itemId of row.items) {
      if (!itemId) continue;
      const itemRow = itemCounts.get(itemId) || { games: 0, wins: 0 };
      itemRow.games += 1;
      if (row.win) itemRow.wins += 1;
      itemCounts.set(itemId, itemRow);
    }

    const runeKey = `${row.perkPrimaryStyle}-${row.perkSubStyle}-${row.perkKeystone}`;
    const runeRow = runes.get(runeKey) || { wins: 0, total: 0, primaryStyle: row.perkPrimaryStyle, subStyle: row.perkSubStyle, keystone: row.perkKeystone };
    runeRow.total += 1;
    if (row.win) runeRow.wins += 1;
    runes.set(runeKey, runeRow);

    if (row.summonerSpell1 && row.summonerSpell2) {
      const spellPair = [row.summonerSpell1, row.summonerSpell2].sort((a, b) => a - b);
      const spellKey = `${spellPair[0]}-${spellPair[1]}`;
      const spellRow = spells.get(spellKey) || { wins: 0, total: 0, spell1Id: spellPair[0], spell2Id: spellPair[1] };
      spellRow.total += 1;
      if (row.win) spellRow.wins += 1;
      spells.set(spellKey, spellRow);
    }

    const matchupRow = matchups.get(row.opponentChampion) || { wins: 0, total: 0 };
    matchupRow.total += 1;
    if (row.win) matchupRow.wins += 1;
    matchups.set(row.opponentChampion, matchupRow);

    const roleRow = roles.get(row.role) || { wins: 0, total: 0 };
    roleRow.total += 1;
    if (row.win) roleRow.wins += 1;
    roles.set(row.role, roleRow);
  }

  const sampleSize = matches.length;
  const slotStats = aggregateItemsBySlot(matches, itemMap);
  const allItems: ItemAgg[] = [...itemCounts.entries()].map(([itemId, stats]) => ({
    itemId,
    name: itemMap[String(itemId)]?.name || `#${itemId}`,
    games: stats.games,
    wins: stats.wins,
    winRate: pct(stats.wins, stats.games),
    popularity: pct(stats.games, sampleSize),
    sampleQualified: stats.games >= MIN_SAMPLE_SIZE,
  }));

  const boots = allItems
    .filter((item) => Array.isArray(itemMap[String(item.itemId)]?.tags) && itemMap[String(item.itemId)]?.tags?.includes('Boots'))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);

  const buildRows: BuildAgg[] = [...builds.values()].map((b) => ({
    games: b.total,
    wins: b.wins,
    winRate: pct(b.wins, b.total),
    popularity: pct(b.total, sampleSize),
    sampleQualified: b.total >= MIN_SAMPLE_SIZE,
    items: b.items.filter((id) => id > 0).map((itemId) => ({ itemId, name: itemMap[String(itemId)]?.name || `#${itemId}` })),
  }));

  const matchupRows = [...matchups.entries()].map(([championName, stats]) => ({ championName, games: stats.total, wins: stats.wins, winRate: pct(stats.wins, stats.total) }))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate);

  const matchupVariants = matchupRows
    .filter((row) => row.games >= MIN_SAMPLE_SIZE)
    .slice(0, 5)
    .map((row) => {
      const vsMatches = matches.filter((m) => m.opponentChampion === row.championName);
      const grouped = new Map<string, { games: number; wins: number; items: number[] }>();
      for (const match of vsMatches) {
        const key = match.items.join('-');
        const current = grouped.get(key) || { games: 0, wins: 0, items: match.items };
        current.games += 1;
        if (match.win) current.wins += 1;
        grouped.set(key, current);
      }
      const best = [...grouped.values()].filter((g) => g.games >= MIN_SAMPLE_SIZE).sort((a, b) => b.games - a.games)[0];
      if (!best) return null;
      return {
        versusChampion: row.championName,
        games: best.games,
        winRate: pct(best.wins, best.games),
        items: best.items.filter((id) => id > 0).map((itemId) => ({ itemId, name: itemMap[String(itemId)]?.name || `#${itemId}` })),
      };
    })
    .filter(Boolean) as Array<{ versusChampion: string; games: number; winRate: number; items: Array<{ itemId: number; name: string }> }>;

  const roleRows = [...roles.entries()]
    .map(([role, stats]) => ({ role, games: stats.total, winRate: pct(stats.wins, stats.total) }))
    .sort((a, b) => b.games - a.games);
  const patchRows = new Map<string, number>();
  for (const row of matches) {
    patchRows.set(row.patch, (patchRows.get(row.patch) || 0) + 1);
  }
  const availablePatches = [...patchRows.entries()]
    .map(([patch, games]) => ({ patch, games }))
    .sort((a, b) => b.patch.localeCompare(a.patch));

  const topRunes = [...runes.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((r) => ({
      primaryStyle: r.primaryStyle,
      subStyle: r.subStyle,
      keystone: r.keystone,
      games: r.total,
      winRate: pct(r.wins, r.total),
      popularity: pct(r.total, sampleSize),
    }));

  const spellRows = [...spells.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((s) => ({
      spell1Id: s.spell1Id,
      spell2Id: s.spell2Id,
      games: s.total,
      winRate: pct(s.wins, s.total),
      popularity: pct(s.total, sampleSize),
      sampleQualified: s.total >= MIN_SAMPLE_SIZE,
    }));

  const q = matches.reduce((sum, m) => sum + Math.max(0, m.spell1Casts), 0);
  const w = matches.reduce((sum, m) => sum + Math.max(0, m.spell2Casts), 0);
  const e = matches.reduce((sum, m) => sum + Math.max(0, m.spell3Casts), 0);

  const orderedSkills = [
    { spell: 'Q', casts: q },
    { spell: 'W', casts: w },
    { spell: 'E', casts: e },
  ]
    .sort((a, b) => b.casts - a.casts)
    .map((x) => x.spell);

  const primaryBuild = [...buildRows].sort((a, b) => b.games - a.games)[0] || null;

  return {
    champion: filters.champion,
    region: filters.platform,
    patch: filters.patch,
    rank: filters.rank,
    role: filters.role,
    versusChampion: filters.versusChampion || null,
    requestedVersusChampion: filters.versusChampion || null,
    sampleSize,
    eligibleGames,
    winRate: pct(matches.filter((m) => m.win).length, sampleSize),
    pickRate: pct(sampleSize, eligibleGames),
    minSampleSize: MIN_SAMPLE_SIZE,
    appliedFallback: Boolean(fallbackReason),
    fallbackReason,
    availableRoles: roleRows,
    availablePatches,
    overview: {
      primaryBuild: primaryBuild ? { games: primaryBuild.games, winRate: primaryBuild.winRate, items: primaryBuild.items, coreItems: primaryBuild.items.slice(1, 4) } : null,
      starterItems: slotStats.starter,
      coreItems: [...slotStats.core1, ...slotStats.core2, ...slotStats.core3].sort((a, b) => b.games - a.games).slice(0, 10),
      situationalItems: slotStats.situational,
      boots,
      skillOrder: orderedSkills,
      topRunes,
      summonerSpells: spellRows,
    },
    builds: {
      mostPopular: [...buildRows].sort((a, b) => b.games - a.games).slice(0, 5),
      bestPerformance: [...buildRows].filter((b) => b.sampleQualified).sort((a, b) => b.winRate - a.winRate || b.games - a.games).slice(0, 5),
      matchupVariants,
    },
    itemStats: {
      bySlot: slotStats,
      mostBought: [...allItems].sort((a, b) => b.games - a.games).slice(0, 10),
      bestWinRate: [...allItems].filter((i) => i.sampleQualified).sort((a, b) => b.winRate - a.winRate).slice(0, 10),
    },
    secondary: {
      matchups: matchupRows.slice(0, 10),
      counters: [...matchupRows].filter((m) => m.games >= MIN_SAMPLE_SIZE).sort((a, b) => a.winRate - b.winRate).slice(0, 10),
    },
    charts: {
      buildWinrate: {
        labels: buildRows.slice(0, 5).map((_, i) => `Build ${i + 1}`),
        values: buildRows.slice(0, 5).map((b) => b.games),
        percentages: buildRows.slice(0, 5).map((b) => b.winRate),
      },
      roleDistribution: {
        labels: roleRows.map((r) => r.role),
        values: roleRows.map((r) => r.games),
        percentages: roleRows.map((r) => r.winRate),
      },
    },
    cacheMeta: {
      generatedAt: new Date().toISOString(),
    },
  };
}

async function computeChampionAnalytics(filters: ChampionAnalyticsFilters): Promise<ChampionAnalyticsPayload> {
  const normalizedRole = String(filters.role || 'ALL').toUpperCase();
  const normalizedRank = String(filters.rank || 'ALL').toUpperCase();
  const normalizedPatch = String(filters.patch || 'latest').toLowerCase();
  const normalizedVersus = String(filters.versusChampion || '').trim();

  const { champions, items } = await getStaticData();
  const championName = champions.find((c: any) => normalizeToken(c?.name) === normalizeToken(filters.champion))?.name;
  if (!championName) throw new Error(`Champion ${filters.champion} not found`);

  const players = await getElitePool(filters.platform, normalizedRank);
  const matchCandidates: Array<{ puuid: string; matchId: string }> = [];
  const seen = new Set<string>();

  const playersResolved = await Promise.all(players.map(async (entry) => {
    const puuid = await getPlayerPuuid(entry, filters.platform);
    if (!puuid) return null;
    const ids = await getPlayerMatchIds(puuid, filters.platform);
    return { puuid, ids };
  }));

  for (const row of playersResolved) {
    if (!row) continue;
    for (const matchId of row.ids) {
      if (seen.has(matchId)) continue;
      seen.add(matchId);
      matchCandidates.push({ puuid: row.puuid, matchId });
    }
  }

  const collected: MatchRow[] = [];
  for (let i = 0; i < matchCandidates.length && collected.length < TARGET_MATCHES; i += FETCH_BATCH_SIZE) {
    const batch = matchCandidates.slice(i, i + FETCH_BATCH_SIZE);
    const batchRows = await Promise.all(
      batch.map(async ({ puuid, matchId }) => {
        const match = await getMatch(matchId, filters.platform);
        if (!match) return null;
        const row = extractParticipantMatch(match, puuid, championName);
        if (!row) return null;
        return row;
      }),
    );

    for (const row of batchRows) {
      if (!row) continue;
      collected.push(row);
      if (collected.length >= TARGET_MATCHES) break;
    }
  }

  if (!collected.length) {
    return buildPayload({ ...filters, champion: championName, role: normalizedRole, rank: normalizedRank }, [], 0, items, 'No hay suficientes partidas para los filtros seleccionados.');
  }

  const sortedMatches = [...collected].sort((a, b) => b.gameCreation - a.gameCreation);
  const latestPatch = sortedMatches[0]?.patch || 'latest';
  const requestedPatch = normalizePatch(filters.patch);

  const byRole = normalizedRole === 'ALL' ? sortedMatches : sortedMatches.filter((m) => m.role === normalizedRole);
  const byRoleAndPatch = byRole.filter((m) => {
    if (normalizedPatch === 'all') return true;
    if (normalizedPatch === 'latest') return m.patch === latestPatch;
    return m.patch === requestedPatch;
  });
  const byRoleAllPatches = byRole;
  const byAnyRolePatch = sortedMatches.filter((m) => {
    if (normalizedPatch === 'all') return true;
    if (normalizedPatch === 'latest') return m.patch === latestPatch;
    return m.patch === requestedPatch;
  });

  let effective = byRoleAndPatch;
  let effectiveRole = normalizedRole;
  let effectivePatch = normalizedPatch === 'latest' ? latestPatch : filters.patch;
  const fallbackReasons: string[] = [];

  if (!effective.length && byRoleAllPatches.length) {
    effective = byRoleAllPatches;
    effectivePatch = 'all';
    fallbackReasons.push('No hubo muestra suficiente para el parche seleccionado; se usaron parches disponibles del mismo rol.');
  }

  if (!effective.length && byAnyRolePatch.length) {
    effective = byAnyRolePatch;
    effectiveRole = 'ALL';
    fallbackReasons.push('No hubo muestra suficiente para el rol seleccionado; se usaron todos los roles del parche filtrado.');
  }

  if (!effective.length) {
    effective = sortedMatches;
    effectiveRole = 'ALL';
    effectivePatch = 'all';
    fallbackReasons.push('No hubo muestra suficiente con filtros exactos; se usó el agregado global del campeón.');
  }

  const byVersus = normalizedVersus ? effective.filter((m) => normalizeToken(m.opponentChampion) === normalizeToken(normalizedVersus)) : effective;
  const needsFallback = normalizedVersus && byVersus.length < MIN_SAMPLE_SIZE;

  const fallbackReason = needsFallback
    ? ['No hay muestra suficiente para ese matchup exacto; se muestra el agregado general del campeón.', ...fallbackReasons].join(' ')
    : fallbackReasons.join(' ') || undefined;

  const payload = buildPayload(
    { ...filters, champion: championName, role: effectiveRole, rank: normalizedRank, patch: effectivePatch, versusChampion: needsFallback ? '' : normalizedVersus },
    needsFallback ? effective : byVersus,
    effective.length,
    items,
    fallbackReason,
  );

  if (needsFallback) payload.requestedVersusChampion = normalizedVersus;
  return payload;
}

function getAnalyticsCacheKey(filters: ChampionAnalyticsFilters) {
  return [
    filters.platform,
    normalizeToken(filters.champion),
    normalizeToken(filters.role),
    normalizeToken(filters.rank),
    normalizeToken(filters.patch),
    normalizeToken(filters.versusChampion || ''),
  ].join(':');
}

export async function getChampionAnalytics(filters: ChampionAnalyticsFilters) {
  const key = getAnalyticsCacheKey(filters);
  const cached = getCached(analyticsCache, key);
  if (cached) return cached;

  const running = inFlight.get(key);
  if (running) return running;

  const request = computeChampionAnalytics(filters)
    .then((payload) => {
      setCached(analyticsCache, key, payload, ttl.analytics);
      return payload;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, request);
  return request;
}

export function toChampionSummary(payload: ChampionAnalyticsPayload) {
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
    availableRoles: payload.availableRoles,
    availablePatches: payload.availablePatches,
    overview: payload.overview,
    builds: payload.builds,
    itemStats: payload.itemStats,
    charts: payload.charts,
    cacheMeta: payload.cacheMeta,
  };
}
