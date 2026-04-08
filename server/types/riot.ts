export type RiotAccountDto = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type RiotSummonerDto = {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
};

export type RiotLeagueEntryDto = {
  leagueId: string;
  queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type RiotMatchParticipantDto = {
  puuid: string;
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  win: boolean;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  visionScore?: number;
  individualPosition?: string | null;
  teamPosition?: string | null;
};

export type RiotMatchDto = {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    queueId: number;
    participants: RiotMatchParticipantDto[];
  };
};

export type RiotChampionMasteryDto = {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
};

export type RiotChallengesPlayerDataDto = {
  totalPoints?: {
    level: string;
    current: number;
    max: number;
    percentile: number;
  };
};

export type RiotActiveGameParticipantDto = {
  puuid?: string;
  championId: number;
  summonerName: string;
  teamId?: number;
  riotId?: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  teamPosition?: string | null;
  individualPosition?: string | null;
};

export type RiotActiveGameDto = {
  gameId: number;
  gameStartTime: number;
  gameLength: number;
  gameMode: string;
  mapId: number;
  participants: RiotActiveGameParticipantDto[];
};