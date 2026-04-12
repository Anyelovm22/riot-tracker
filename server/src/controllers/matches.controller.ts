import { Request, Response } from 'express';
import {
  getItemData,
  getLatestDdragonVersion,
  getMatchById,
  getMatchIdsByPuuid,
  getMatchTimelineById,
} from '../services/riot.service';
import { generateLocalAiRetrospective } from '../services/ai-feedback.service.ts';

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

function toPerMinute(value: number, durationSeconds: number) {
  const mins = Math.max(durationSeconds / 60, 1);
  return Number((value / mins).toFixed(2));
}

function buildPlayerFeedback(player: any, teamKills: number, gameDuration: number) {
  const feedback: Array<{ type: 'good' | 'warn'; title: string; detail: string }> = [];

  const kda = player.deaths === 0 ? player.kills + player.assists : (player.kills + player.assists) / player.deaths;
  const cs = (player.totalMinionsKilled || 0) + (player.neutralMinionsKilled || 0);
  const csPerMin = toPerMinute(cs, gameDuration);
  const visionPerMin = toPerMinute(player.visionScore || 0, gameDuration);
  const kp = teamKills > 0 ? Math.round(((player.kills + player.assists) / teamKills) * 100) : 0;

  if (kda >= 3) {
    feedback.push({
      type: 'good',
      title: 'Buen KDA',
      detail: `Tu KDA fue ${kda.toFixed(2)}. Mantén esa consistencia en peleas.`,
    });
  } else {
    feedback.push({
      type: 'warn',
      title: 'Mejorar supervivencia',
      detail: `Tu KDA fue ${kda.toFixed(2)}. Evita picks riesgosos sin visión previa.`,
    });
  }

  if (csPerMin < 5.5 && player.individualPosition !== 'UTILITY') {
    feedback.push({
      type: 'warn',
      title: 'Farmeo bajo',
      detail: `CS/min ${csPerMin}. Intenta asegurar oleadas y campamentos en ventanas muertas.`,
    });
  } else {
    feedback.push({
      type: 'good',
      title: 'Farm estable',
      detail: `CS/min ${csPerMin}. Buen ritmo de economía.`,
    });
  }

  if (visionPerMin < 0.8) {
    feedback.push({
      type: 'warn',
      title: 'Visión mejorable',
      detail: `Vision/min ${visionPerMin}. Compra más wards de control y resetea para trinket.`,
    });
  } else {
    feedback.push({
      type: 'good',
      title: 'Buen control de visión',
      detail: `Vision/min ${visionPerMin}. Sigue peleando con información.`,
    });
  }

  if (kp < 45) {
    feedback.push({
      type: 'warn',
      title: 'Participación baja',
      detail: `KP ${kp}%. Rota antes a objetivos y juega más cerca de tu jungla/soporte.`,
    });
  } else {
    feedback.push({
      type: 'good',
      title: 'Participación en kills sólida',
      detail: `KP ${kp}%. Buen impacto en jugadas de equipo.`,
    });
  }

  if ((player.visionWardsBoughtInGame || 0) <= 0) {
    feedback.push({
      type: 'warn',
      title: 'Sin control wards',
      detail: 'No compraste control wards. Intenta comprar al menos 1-2 por partida.',
    });
  }

  return feedback;
}

function getTimelineSummary(timeline: any, playerPuuid: string) {
  const frames = timeline?.info?.frames || [];
  const events = frames.flatMap((frame: any) => frame.events || []);

  let soloKills = 0;
  let objectiveTakedowns = 0;
  let deathsInRiver = 0;

  for (const event of events) {
    if (event.type === 'CHAMPION_KILL') {
      if (event.killerId && !event.assistingParticipantIds?.length) {
        soloKills += 1;
      }
      if (event.victimDamageReceived?.some((d: any) => d.name === playerPuuid) && event.position?.y > 5000 && event.position?.y < 10000) {
        deathsInRiver += 1;
      }
    }
    if (event.type === 'ELITE_MONSTER_KILL' || event.type === 'BUILDING_KILL') {
      objectiveTakedowns += 1;
    }
  }

  return {
    frames: frames.length,
    events: events.length,
    soloKills,
    objectiveEvents: objectiveTakedowns,
    riskyRiverDeaths: deathsInRiver,
  };
}
function buildItemSwapFeedback(player: any, itemNames: Record<number, string>) {
  const tips: string[] = [];
  const finalItems = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5];
  const consumables = new Set([2003, 2031, 2140, 2138, 2139, 2141, 2142, 2143]);
  const starters = new Set([1054, 1055, 1056, 1039, 1041, 3850, 3854, 3858]);

  for (const itemId of finalItems) {
    if (!itemId) continue;
    if (consumables.has(itemId)) {
      tips.push(`Considera vender ${itemNames[itemId] || `item ${itemId}`} en late game por un ítem completo.`);
    }
    if (starters.has(itemId) && (player.gameDuration || 0) > 1800) {
      tips.push(`Llegaste al late con ${itemNames[itemId] || `item ${itemId}`}; revisa si convenía cambiarlo por más daño o resistencia.`);
    }
  }

  if ((player.visionWardsBoughtInGame || 0) === 0) {
    tips.push('Incluye control wards en tu ruta de compra para pelear objetivos con información.');
  }

  return tips.slice(0, 4);
}


async function getRankedMatchIds(puuid: string, platform: string, hardLimit = 20) {
  const batchSize = 20;
  let start = 0;
  let candidateIds: string[] = [];
  const maxScan = Math.max(hardLimit * 4, 40);

  while (candidateIds.length < maxScan) {
    const remaining = maxScan - candidateIds.length;
    const currentBatch = Math.min(batchSize, remaining);

    const ids = await getMatchIdsByPuuid(puuid, platform, currentBatch, start);
    if (!ids.length) break;

    candidateIds = candidateIds.concat(ids);

    if (ids.length < currentBatch) break;

    start += currentBatch;
    await sleep(650);
  }

  return candidateIds;
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

    normalized.sort((a, b) => b.gameCreation - a.gameCreation);

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

export async function getMatchDetail(req: Request, res: Response) {
  const matchId = String(req.params.matchId || '').trim();
  const puuid = String(req.query.puuid || '').trim();
  const platform = String(req.query.platform || 'la1').trim().toLowerCase();

  if (!matchId || !puuid) {
    return res.status(400).json({ message: 'matchId and puuid are required' });
  }

  try {
    const match = await getMatchById(matchId, platform);
    const timeline = await getMatchTimelineById(matchId, platform).catch(() => null);
    const itemData = await getItemData().catch(() => null);
    const version = await getLatestDdragonVersion();
    const player = match?.info?.participants?.find((p: any) => p.puuid === puuid) || null;

    const participants = (match?.info?.participants || []).map((p: any) => ({
      puuid: p.puuid,
      riotIdGameName: p.riotIdGameName || '',
      riotIdTagline: p.riotIdTagline || '',
      summonerName: p.summonerName || '',
      championName: p.championName,
      championIcon: champIcon(version, p.championName),
      teamId: p.teamId,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      win: p.win,
      totalDamageDealtToChampions: p.totalDamageDealtToChampions,
      totalDamageTaken: p.totalDamageTaken,
      visionScore: p.visionScore,
      goldEarned: p.goldEarned,
      totalMinionsKilled: p.totalMinionsKilled,
      neutralMinionsKilled: p.neutralMinionsKilled,
      individualPosition: p.individualPosition,
      champLevel: p.champLevel,
      visionWardsBoughtInGame: p.visionWardsBoughtInGame,
      wardsPlaced: p.wardsPlaced,
      wardsKilled: p.wardsKilled,
      damageDealtToObjectives: p.damageDealtToObjectives,
      damageDealtToTurrets: p.damageDealtToTurrets,
      turretTakedowns: p.turretTakedowns,
      dragonKills: p.dragonKills,
      baronKills: p.baronKills,
      summoner1Id: p.summoner1Id,
      summoner2Id: p.summoner2Id,
      items: [
        { id: p.item0, icon: itemIcon(version, p.item0) },
        { id: p.item1, icon: itemIcon(version, p.item1) },
        { id: p.item2, icon: itemIcon(version, p.item2) },
        { id: p.item3, icon: itemIcon(version, p.item3) },
        { id: p.item4, icon: itemIcon(version, p.item4) },
        { id: p.item5, icon: itemIcon(version, p.item5) },
        { id: p.item6, icon: itemIcon(version, p.item6) },
      ],
    }));

    const playerTeam = player ? participants.filter((p: any) => p.teamId === player.teamId) : [];
    const teamKills = playerTeam.reduce((sum: number, p: any) => sum + (p.kills || 0), 0);
    const itemNames: Record<number, string> = {};
    if (itemData?.items) {
      for (const [id, value] of Object.entries(itemData.items)) {
        itemNames[Number(id)] = (value as any)?.name || `item ${id}`;
      }
    }

    const playerFeedback = player ? buildPlayerFeedback(player, teamKills, match.info.gameDuration) : [];
    const itemFeedback = player ? buildItemSwapFeedback({ ...player, gameDuration: match.info.gameDuration }, itemNames) : [];
    const aiRetrospective =
      player && playerTeam.length
        ? await generateLocalAiRetrospective({
            championName: player.championName || 'Unknown',
            role: player.individualPosition || 'UNKNOWN',
            kda: `${player.kills}/${player.deaths}/${player.assists}`,
            csPerMin: toPerMinute(
              (player.totalMinionsKilled || 0) + (player.neutralMinionsKilled || 0),
              match.info.gameDuration
            ),
            visionPerMin: toPerMinute(player.visionScore || 0, match.info.gameDuration),
            damage: player.totalDamageDealtToChampions || 0,
            damageTaken: player.totalDamageTaken || 0,
            gold: player.goldEarned || 0,
            queueLabel: queueLabels[match.info.queueId] || `Queue ${match.info.queueId}`,
            result: player.win ? 'Victoria' : 'Derrota',
            itemNames: [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5]
              .map((itemId: number) => itemNames[itemId])
              .filter(Boolean),
          })
        : null;

    return res.json({
      matchId: match.metadata.matchId,
      gameCreation: match.info.gameCreation,
      gameDuration: match.info.gameDuration,
      queueId: match.info.queueId,
      queueLabel: queueLabels[match.info.queueId] || `Queue ${match.info.queueId}`,
      playerPuuid: puuid,
      player,
      participants,
      playerFeedback,
      itemFeedback,
      aiRetrospective,
      timelineSummary: timeline ? getTimelineSummary(timeline, puuid) : null,
    });
  } catch (error: any) {
    return res.status(error?.response?.status || 500).json({
      message: 'Error fetching match detail',
      detail: error?.response?.data || null,
    });
  }
}
