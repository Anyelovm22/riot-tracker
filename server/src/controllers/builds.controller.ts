import { Request, Response } from 'express';
import {
  getChampionList,
  getEliteLeagueEntries,
  getItemData,
  getMatchById,
  getMatchIdsByPuuid,
} from '../services/riot.service';

type CachedInsight = {
  expiresAt: number;
  payload: any;
};

const championInsightsCache = new Map<string, CachedInsight>();
const championInsightsInFlight = new Map<string, Promise<any>>();
const INSIGHTS_CACHE_TTL_MS = 1000 * 60 * 4;
const MATCH_FETCH_CONCURRENCY = 6;

function normalizeCacheToken(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function getInsightCacheKey(champion: string, platform: string, versusChampion: string) {
  return `${platform}:${normalizeCacheToken(champion)}:${normalizeCacheToken(versusChampion)}`;
}

function getCachedInsight(cacheKey: string) {
  const cached = championInsightsCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    championInsightsCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
}

function rememberInsight(cacheKey: string, payload: any) {
  championInsightsCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + INSIGHTS_CACHE_TTL_MS,
  });
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

function getLaneOpponent(participants: any[], player: any) {
  const byRole = participants.find(
    (p) => p.teamId !== player.teamId && p.individualPosition && p.individualPosition === player.individualPosition
  );
  return byRole || participants.find((p) => p.teamId !== player.teamId) || null;
}


function normalizeChampionName(name: string) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

async function buildChampionInsights(champion: string, platform: string, versusChampion: string) {
  const [{ items }, championsData, eliteEntries] = await Promise.all([
    getItemData(),
    getChampionList(),
    getEliteLeagueEntries(platform),
  ]);

  const championByNormalizedName = new Map<string, string>(
    (championsData?.champions || []).map((championData: any) => [
      normalizeChampionName(championData?.name),
      String(championData?.name || ''),
    ])
  );

  const resolvedChampion = championByNormalizedName.get(normalizeChampionName(champion));
  if (!resolvedChampion) {
    return { status: 404, payload: { message: `Champion ${champion} not found` } };
  }

  const topPlayers = (eliteEntries || [])
    .filter((entry: any) => entry?.puuid)
    .sort((a: any, b: any) => (b.leaguePoints || 0) - (a.leaguePoints || 0))
    .slice(0, 25);

  const matchIdResults = await Promise.allSettled(
    topPlayers.map(async (entry: any) => {
      const matchIds = await getMatchIdsByPuuid(entry.puuid, platform, 12, 0).catch(() => []);
      return {
        entry,
        matchIds,
      };
    })
  );

  const pendingMatches: Array<{ entry: any; matchId: string }> = [];
  const seenMatchIds = new Set<string>();

  for (const result of matchIdResults) {
    if (result.status !== 'fulfilled') continue;

    for (const matchId of result.value.matchIds) {
      if (seenMatchIds.has(matchId)) continue;
      seenMatchIds.add(matchId);
      pendingMatches.push({ entry: result.value.entry, matchId });
    }
  }

  const proMatches: any[] = [];

  for (let index = 0; index < pendingMatches.length && proMatches.length < 35; index += MATCH_FETCH_CONCURRENCY) {
    const batch = pendingMatches.slice(index, index + MATCH_FETCH_CONCURRENCY);
    const matches = await Promise.all(
      batch.map(async ({ entry, matchId }) => {
        const match = await getMatchById(matchId, platform).catch(() => null);
        if (!match?.info?.participants) return null;

        const participant = match.info.participants.find(
          (p: any) => p.puuid === entry.puuid && p.championName === resolvedChampion
        );
        if (!participant) return null;

        const opponent = getLaneOpponent(match.info.participants, participant);
        if (versusChampion && opponent?.championName !== versusChampion) return null;

        return {
          matchId: match.metadata?.matchId || matchId,
          gameCreation: match.info.gameCreation,
          gameDuration: match.info.gameDuration,
          queueId: match.info.queueId,
          proPlayer: entry.summonerName || 'HighElo Player',
          leaguePoints: entry.leaguePoints || 0,
          role: participant.individualPosition || 'UNKNOWN',
          win: !!participant.win,
          kda: `${participant.kills}/${participant.deaths}/${participant.assists}`,
          opponentChampion: opponent?.championName || 'Unknown',
          items: [
            participant.item0,
            participant.item1,
            participant.item2,
            participant.item3,
            participant.item4,
            participant.item5,
          ].filter(Boolean),
          primaryStyle: participant?.perks?.styles?.[0]?.style || 0,
          subStyle: participant?.perks?.styles?.[1]?.style || 0,
          keystone: participant?.perks?.styles?.[0]?.selections?.[0]?.perk || 0,
        };
      })
    );

    for (const processedMatch of matches) {
      if (!processedMatch) continue;
      proMatches.push(processedMatch);
      if (proMatches.length >= 35) break;
    }
  }

  const hasVersusFilter = Boolean(versusChampion);

  if (hasVersusFilter && proMatches.length < 8) {
    const fallback = await buildChampionInsights(resolvedChampion, platform, '');
    if (fallback.status === 200) {
      return {
        status: 200,
        payload: {
          ...fallback.payload,
          versusChampion,
          requestedVersusChampion: versusChampion,
          appliedFallback: true,
          fallbackReason: 'No había muestra suficiente para ese matchup exacto. Se mostró la build general del campeón.',
        },
      };
    }
  }

  const buildCounts = new Map<string, { wins: number; total: number; items: number[] }>();
  const itemCounts = new Map<number, number>();
  const runeCounts = new Map<
    string,
    {
      wins: number;
      total: number;
      primaryStyle: number;
      subStyle: number;
      keystone: number;
    }
  >();
  const roleCounts = new Map<string, { wins: number; total: number }>();
  const matchupCounts = new Map<string, { wins: number; total: number }>();

  for (const match of proMatches) {
    const key = match.items.join('-');
    if (!buildCounts.has(key)) {
      buildCounts.set(key, { wins: 0, total: 0, items: match.items });
    }
    const entry = buildCounts.get(key)!;
    entry.total += 1;
    if (match.win) entry.wins += 1;

    for (const itemId of match.items) {
      itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
    }

    const roleKey = String(match.role || 'UNKNOWN');
    if (!roleCounts.has(roleKey)) {
      roleCounts.set(roleKey, { wins: 0, total: 0 });
    }
    const roleEntry = roleCounts.get(roleKey)!;
    roleEntry.total += 1;
    if (match.win) roleEntry.wins += 1;

    const matchupKey = String(match.opponentChampion || 'Unknown');
    if (!matchupCounts.has(matchupKey)) {
      matchupCounts.set(matchupKey, { wins: 0, total: 0 });
    }
    const matchupEntry = matchupCounts.get(matchupKey)!;
    matchupEntry.total += 1;
    if (match.win) matchupEntry.wins += 1;

    const primaryStyle = match.primaryStyle || 0;
    const subStyle = match.subStyle || 0;
    const keystone = match.keystone || 0;
    const runeKey = `${primaryStyle}-${subStyle}-${keystone}`;
    if (!runeCounts.has(runeKey)) {
      runeCounts.set(runeKey, { wins: 0, total: 0, primaryStyle, subStyle, keystone });
    }
    const runeEntry = runeCounts.get(runeKey)!;
    runeEntry.total += 1;
    if (match.win) runeEntry.wins += 1;
  }

  const topBuilds = [...buildCounts.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((build) => ({
      games: build.total,
      winRate: Number(((build.wins / Math.max(1, build.total)) * 100).toFixed(1)),
      items: build.items.map((itemId) => ({
        itemId,
        name: items[String(itemId)]?.name || `item ${itemId}`,
      })),
    }));

  const recommendedItems = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([itemId, count]) => ({
      itemId,
      count,
      name: items[String(itemId)]?.name || `item ${itemId}`,
    }));

  const topRunes = [...runeCounts.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((rune) => ({
      primaryStyle: rune.primaryStyle,
      subStyle: rune.subStyle,
      keystone: rune.keystone,
      games: rune.total,
      winRate: Number(((rune.wins / Math.max(1, rune.total)) * 100).toFixed(1)),
    }));

  const roleStats = [...roleCounts.entries()]
    .map(([role, stats]) => ({
      role,
      games: stats.total,
      winRate: Number(((stats.wins / Math.max(1, stats.total)) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.games - a.games);

  const topMatchups = [...matchupCounts.entries()]
    .map(([championName, stats]) => ({
      championName,
      games: stats.total,
      winRate: Number(((stats.wins / Math.max(1, stats.total)) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 8);

  return {
    status: 200,
    payload: {
      champion: resolvedChampion,
      versusChampion: versusChampion || null,
      sampleSize: proMatches.length,
      proMatches: proMatches.sort((a, b) => b.gameCreation - a.gameCreation).slice(0, 20),
      topBuilds,
      recommendedItems,
      topRunes,
      roleStats,
      topMatchups,
      cacheMeta: {
        generatedAt: new Date().toISOString(),
      },
    },
  };
}

export async function getChampionBuildInsights(req: Request, res: Response) {
  try {
    const champion = String(req.query.champion || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();
    const versusChampion = String(req.query.versusChampion || '').trim();

    if (!champion) {
      return res.status(400).json({ message: 'champion is required' });
    }

    const cacheKey = getInsightCacheKey(champion, platform, versusChampion);
    const cached = getCachedInsight(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const existingRequest = championInsightsInFlight.get(cacheKey);
    if (existingRequest) {
      const result = await existingRequest;
      return res.status(result.status).json(result.payload);
    }

    const requestPromise = buildChampionInsights(champion, platform, versusChampion)
      .then((result) => {
        if (result.status === 200) {
          rememberInsight(cacheKey, result.payload);
        }
        return result;
      })
      .finally(() => {
        championInsightsInFlight.delete(cacheKey);
      });

    championInsightsInFlight.set(cacheKey, requestPromise);

    const result = await requestPromise;
    return res.status(result.status).json(result.payload);
  } catch (error: any) {
    return res.status(error?.response?.status || 500).json({
      message: 'Error fetching champion build insights',
      detail: error?.response?.data || null,
    });
  }
}
