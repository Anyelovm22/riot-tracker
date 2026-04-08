import type {
  RiotChampionMasteryDto,
  RiotLeagueEntryDto,
  RiotMatchDto
} from "../types/riot";
import { getTimeAgo } from "../utils/helpers";
import { getChampionIdMap, getLatestDdragonVersion } from "./ddragon.service";

const SOLO_QUEUE_ID = 420;
const FLEX_QUEUE_ID = 440;

type QueueMode = "solo" | "flex";

type RecentMatchRow = {
  matchId: string;
  championName: string;
  championIcon: string;
  result: "W" | "L";
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  damage: number;
  gold: number;
  vision: number;
  queueId: number;
  queueLabel: string;
  ago: string;
  items: string[];
};

function queueIdForMode(mode: QueueMode) {
  return mode === "solo" ? SOLO_QUEUE_ID : FLEX_QUEUE_ID;
}

function itemIdsFromParticipant(
  participant: RiotMatchDto["info"]["participants"][number]
): string[] {
  const items = [
    participant.item0,
    participant.item1,
    participant.item2,
    participant.item3,
    participant.item4,
    participant.item5
  ];

  return items.filter((item) => item && item > 0).map(String);
}

export function mapLeagueEntries(entries: RiotLeagueEntryDto[]) {
  const solo = entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5") ?? null;
  const flex = entries.find((entry) => entry.queueType === "RANKED_FLEX_SR") ?? null;

  return { solo, flex };
}

export async function mapRecentMatches(
  matches: RiotMatchDto[],
  puuid: string
): Promise<RecentMatchRow[]> {
  const championMap = await getChampionIdMap();
  const version = await getLatestDdragonVersion();

  return matches.map((match) => {
    const participant = match.info.participants.find((p) => p.puuid === puuid);

    if (!participant) {
      throw new Error(`No se encontró el participante del puuid en ${match.metadata.matchId}`);
    }

    const cs =
      (participant.totalMinionsKilled ?? 0) +
      (participant.neutralMinionsKilled ?? 0);

    const championName = championMap[participant.championId] || participant.championName;

    return {
      matchId: match.metadata.matchId,
      championName,
      championIcon: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`,
      result: participant.win ? "W" : "L",
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      cs,
      damage: participant.totalDamageDealtToChampions,
      gold: participant.goldEarned,
      vision: participant.visionScore ?? 0,
      queueId: match.info.queueId,
      queueLabel: `${participant.individualPosition || "Role"} · ${Math.floor(
        match.info.gameDuration / 60
      )}:${String(match.info.gameDuration % 60).padStart(2, "0")}`,
      ago: getTimeAgo(match.info.gameCreation),
      items: itemIdsFromParticipant(participant)
    };
  });
}

export async function mapMasteries(masteries: RiotChampionMasteryDto[]) {
  const championMap = await getChampionIdMap();
  const version = await getLatestDdragonVersion();

  return masteries.map((mastery) => {
    const championName = championMap[mastery.championId] || `Champion-${mastery.championId}`;

    return {
      championId: mastery.championId,
      championName,
      championIcon: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`,
      championPoints: mastery.championPoints,
      lastPlayTimeLabel: getTimeAgo(mastery.lastPlayTime),
      masteryLevel: mastery.championLevel
    };
  });
}

export function buildLpHistoryFromRankedMatches(
  currentLp: number,
  recentMatches: Array<{ result: "W" | "L"; queueId: number }>,
  mode: QueueMode
) {
  const rankedMatches = recentMatches.filter(
    (match) => match.queueId === queueIdForMode(mode)
  );

  if (rankedMatches.length === 0) {
    return {
      points: [],
      hasHistory: false
    };
  }

  let lp = currentLp - rankedMatches.reduce((acc, match) => {
    return acc + (match.result === "W" ? 20 : -20);
  }, 0);

  const points = rankedMatches.map((match, index) => {
    lp += match.result === "W" ? 20 : -20;

    return {
      game: index + 1,
      lp,
      result: match.result
    };
  });

  return {
    points,
    hasHistory: true
  };
}