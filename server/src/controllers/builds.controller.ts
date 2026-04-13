import { Request, Response } from 'express';
import {
  getChampionList,
  getEliteLeagueEntries,
  getItemData,
  getMatchById,
  getMatchIdsByPuuid,
} from '../services/riot.service';

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

export async function getChampionBuildInsights(req: Request, res: Response) {
  try {
    const champion = String(req.query.champion || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();
    const versusChampion = String(req.query.versusChampion || '').trim();
    const role = String(req.query.role || '').trim().toUpperCase();

    if (!champion) {
      return res.status(400).json({ message: 'champion is required' });
    }

    const [{ items }, championsData, eliteEntries] = await Promise.all([
      getItemData(),
      getChampionList(),
      getEliteLeagueEntries(platform),
    ]);

    const championSet = new Set((championsData?.champions || []).map((championData: any) => championData?.name));
    if (!championSet.has(champion)) {
      return res.status(404).json({ message: `Champion ${champion} not found` });
    }

    const topPlayers = (eliteEntries || [])
      .filter((entry: any) => entry?.puuid)
      .sort((a: any, b: any) => (b.leaguePoints || 0) - (a.leaguePoints || 0))
      .slice(0, 10);

    const wantedRole = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'].includes(role) ? role : '';
    const proMatches: any[] = [];

    for (const entry of topPlayers) {
      if (proMatches.length >= 35) break;

      const matchIds = await getMatchIdsByPuuid(entry.puuid, platform, 12, 0).catch(() => []);

      for (const id of matchIds) {
        const match = await getMatchById(id, platform).catch(() => null);
        if (!match?.info?.participants) continue;

        const participant = match.info.participants.find(
          (p: any) => p.puuid === entry.puuid && p.championName === champion
        );
        if (!participant) continue;
        if (wantedRole && participant.individualPosition !== wantedRole) continue;

        const opponent = getLaneOpponent(match.info.participants, participant);
        if (versusChampion && opponent?.championName !== versusChampion) continue;

        proMatches.push({
          matchId: match.metadata?.matchId || id,
          gameCreation: match.info.gameCreation,
          gameDuration: match.info.gameDuration,
          queueId: match.info.queueId,
          proPlayer: entry.summonerName || 'HighElo Player',
          leaguePoints: entry.leaguePoints || 0,
          role: participant.individualPosition || 'UNKNOWN',
          win: !!participant.win,
          kda: `${participant.kills}/${participant.deaths}/${participant.assists}`,
          cs: (participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0),
          opponentChampion: opponent?.championName || 'Unknown',
          items: [participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5].filter(Boolean),
        });

        if (proMatches.length >= 35) break;
      }
    }

    const buildCounts = new Map<
      string,
      {
        wins: number;
        total: number;
        items: number[];
        role: string;
        kdaSum: number;
        csPerMinSum: number;
      }
    >();
    const itemCounts = new Map<number, number>();
    const roleBuildCounts = new Map<string, Map<string, { wins: number; total: number; items: number[] }>>();
    const roleCounts = new Map<string, number>();

    for (const match of proMatches) {
      const key = match.items.join('-');
      if (!buildCounts.has(key)) {
        buildCounts.set(key, {
          wins: 0,
          total: 0,
          items: match.items,
          role: match.role || 'UNKNOWN',
          kdaSum: 0,
          csPerMinSum: 0,
        });
      }
      const entry = buildCounts.get(key)!;
      entry.total += 1;
      if (match.win) entry.wins += 1;
      entry.kdaSum += (() => {
        const [k, d, a] = String(match.kda || '0/1/0').split('/').map((v: string) => Number(v || 0));
        return (k + a) / Math.max(1, d);
      })();
      entry.csPerMinSum += Number(match.gameDuration > 0 ? (match.cs || 0) / (match.gameDuration / 60) : 0);

      const roleKey = match.role || 'UNKNOWN';
      roleCounts.set(roleKey, (roleCounts.get(roleKey) || 0) + 1);
      if (!roleBuildCounts.has(roleKey)) roleBuildCounts.set(roleKey, new Map());
      const roleMap = roleBuildCounts.get(roleKey)!;
      if (!roleMap.has(key)) roleMap.set(key, { wins: 0, total: 0, items: match.items });
      const roleBuild = roleMap.get(key)!;
      roleBuild.total += 1;
      if (match.win) roleBuild.wins += 1;

      for (const itemId of match.items) {
        itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
      }
    }

    const topBuilds = [...buildCounts.values()]
      .map((build) => {
        const winRate = (build.wins / Math.max(1, build.total)) * 100;
        const avgKda = build.kdaSum / Math.max(1, build.total);
        const avgCsPerMin = build.csPerMinSum / Math.max(1, build.total);
        const score = Number((winRate * 0.65 + avgKda * 8 + Math.min(build.total, 12) * 1.5).toFixed(2));
        return {
          games: build.total,
          winRate: Number(winRate.toFixed(1)),
          avgKda: Number(avgKda.toFixed(2)),
          avgCsPerMin: Number(avgCsPerMin.toFixed(2)),
          score,
          role: build.role,
          items: build.items.map((itemId) => ({
            itemId,
            name: items[String(itemId)]?.name || `item ${itemId}`,
          })),
        };
      })
      .filter((build) => build.games >= 2)
      .sort((a, b) => b.score - a.score || b.games - a.games)
      .slice(0, 5)
      ;

    const byRole: Record<string, any[]> = {};
    for (const [roleKey, buildsMap] of roleBuildCounts.entries()) {
      byRole[roleKey] = [...buildsMap.values()]
        .map((build) => ({
          games: build.total,
          winRate: Number(((build.wins / Math.max(1, build.total)) * 100).toFixed(1)),
          items: build.items.map((itemId) => ({
            itemId,
            name: items[String(itemId)]?.name || `item ${itemId}`,
          })),
        }))
        .filter((build) => build.games >= 2)
        .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
        .slice(0, 3);
    }

    const recommendedItems = [...itemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([itemId, count]) => ({
        itemId,
        count,
        name: items[String(itemId)]?.name || `item ${itemId}`,
      }));

    return res.json({
      champion,
      versusChampion: versusChampion || null,
      role: wantedRole || null,
      availableRoles: [...roleCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([line]) => line),
      sampleSize: proMatches.length,
      proMatches: proMatches
        .sort((a, b) => b.gameCreation - a.gameCreation)
        .slice(0, 20),
      defaultBuild: topBuilds[0] || null,
      topBuilds,
      byRole,
      recommendedItems,
    });
  } catch (error: any) {
    return res.status(error?.response?.status || 500).json({
      message: 'Error fetching champion build insights',
      detail: error?.response?.data || null,
    });
  }
}
