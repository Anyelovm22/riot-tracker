import { Request, Response } from 'express';
import {
  getLatestDdragonVersion,
  getMatchById,
  getMatchIdsByPuuid,
} from '../services/riot.service';

const queueLabels: Record<number, string> = {
  420: 'Ranked Solo/Duo',
  440: 'Ranked Flex',
  400: 'Normal Draft',
  430: 'Normal Blind',
  450: 'ARAM',
  490: 'Quickplay',
  1700: 'Arena',
};

const activeHistoryRequests = new Set<string>();

function itemIcon(version: string, itemId?: number) {
  if (!itemId || itemId === 0) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

function champIcon(version: string, championName?: string) {
  if (!championName) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getRankedMatchIds(puuid: string, platform: string, hardLimit = 20) {
  const batchSize = 10;
  let start = 0;
  let rankedIds: string[] = [];

  while (rankedIds.length < hardLimit) {
    const remaining = hardLimit - rankedIds.length;
    const currentBatch = Math.min(batchSize, remaining);

    const ids = await getMatchIdsByPuuid(puuid, platform, currentBatch, start);
    if (!ids.length) break;

    rankedIds = rankedIds.concat(ids);

    if (ids.length < currentBatch) break;

    start += currentBatch;
    await sleep(900);
  }

  return rankedIds;
}

async function fetchMatchesSafely(matchIds: string[], platform: string) {
  const results: any[] = [];

  for (const id of matchIds) {
    try {
      const match = await getMatchById(id, platform);
      results.push(match);
      await sleep(2200);
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data || error.message || error;

      console.error(`MATCH DETAIL ERROR ${id}:`, detail);

      if (status === 429) {
        await sleep(10000);
      } else {
        await sleep(3500);
      }
    }
  }

  return results;
}

export async function getMatchHistory(req: Request, res: Response) {
  const puuid = String(req.query.puuid || '').trim();
  const platform = String(req.query.platform || 'la1').trim().toLowerCase();
  const count = Number(req.query.count || 10);
  const queueId = req.query.queueId ? Number(req.query.queueId) : undefined;
  const all = String(req.query.all || 'false') === 'true';

  if (!puuid) {
    return res.status(400).json({ message: 'puuid is required' });
  }

  const requestKey = `${platform}:${puuid}`;

  if (activeHistoryRequests.has(requestKey)) {
    return res.status(429).json({
      message: 'Ya hay una carga de historial en progreso para este perfil. Espera un momento.',
    });
  }

  activeHistoryRequests.add(requestKey);

  try {
    const version = await getLatestDdragonVersion();

    const matchIds = all
      ? await getRankedMatchIds(puuid, platform, 20)
      : await getMatchIdsByPuuid(puuid, platform, count, 0);

    const matches = await fetchMatchesSafely(matchIds, platform);

    let normalized = matches.map((match: any) => {
      const player = match.info.participants.find((p: any) => p.puuid === puuid);

      if (!player) {
        return {
          matchId: match.metadata.matchId,
          gameCreation: match.info.gameCreation,
          gameDuration: match.info.gameDuration,
          queueId: match.info.queueId,
          queueLabel: queueLabels[match.info.queueId] || `Queue ${match.info.queueId}`,
          player: null,
        };
      }

      return {
        matchId: match.metadata.matchId,
        gameCreation: match.info.gameCreation,
        gameDuration: match.info.gameDuration,
        queueId: match.info.queueId,
        queueLabel: queueLabels[match.info.queueId] || `Queue ${match.info.queueId}`,
        player: {
          championName: player.championName,
          championIcon: champIcon(version, player.championName),
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          win: player.win,
          totalMinionsKilled: player.totalMinionsKilled,
          neutralMinionsKilled: player.neutralMinionsKilled,
          totalDamageDealtToChampions: player.totalDamageDealtToChampions,
          totalDamageTaken: player.totalDamageTaken,
          damageDealtToObjectives: player.damageDealtToObjectives,
          visionScore: player.visionScore,
          timeCCingOthers: player.timeCCingOthers,
          turretTakedowns: player.turretTakedowns,
          goldEarned: player.goldEarned,
          individualPosition: player.individualPosition,
          items: [
            { id: player.item0, icon: itemIcon(version, player.item0) },
            { id: player.item1, icon: itemIcon(version, player.item1) },
            { id: player.item2, icon: itemIcon(version, player.item2) },
            { id: player.item3, icon: itemIcon(version, player.item3) },
            { id: player.item4, icon: itemIcon(version, player.item4) },
            { id: player.item5, icon: itemIcon(version, player.item5) },
            { id: player.item6, icon: itemIcon(version, player.item6) },
          ],
        },
      };
    });

    normalized = normalized.filter((match) => match.queueId === 420 || match.queueId === 440);

    if (queueId) {
      normalized = normalized.filter((match) => match.queueId === queueId);
    }

    normalized.sort((a, b) => a.gameCreation - b.gameCreation);

    return res.json({
      version,
      total: normalized.length,
      matches: normalized,
    });
  } catch (error: any) {
    console.error('MATCH HISTORY ERROR:', error?.response?.data || error.message || error);

    return res.status(error?.response?.status || 500).json({
      message: 'Error fetching match history',
      detail: error?.response?.data || null,
    });
  } finally {
    activeHistoryRequests.delete(requestKey);
  }
}