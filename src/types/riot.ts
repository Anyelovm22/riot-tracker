export type RegionCode =
  | "LA1"
  | "LA2"
  | "NA1"
  | "EUW1"
  | "EUN1"
  | "BR1"
  | "KR"
  | "JP1"
  | "OC1"
  | "TR1";

export type QueueType = "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";
export type MainTab = "lp" | "history" | "champions" | "live" | "builds";
export type QueueView = "solo" | "flex";

export type RankEntry = {
  queueType: QueueType;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type Profile = {
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerLevel: number;
  profileIconId: number;
  region: string;
};

export type LpPoint = {
  game: number;
  lp: number;
  result: "W" | "L";
};

export type MatchRow = {
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

export type ChampionMasteryRow = {
  championId: number;
  championName: string;
  championIcon: string;
  championPoints: number;
  lastPlayTimeLabel: string;
  masteryLevel: number;
};

export type LiveGamePlayer = {
  summonerName: string;
  championName: string;
  position: "Top" | "Jungle" | "Mid" | "ADC" | "Support" | "Unknown";
  teamId?: number;
  items?: Array<{ name: string; image?: string } | null>;
};

export type SearchResponse = {
  profile: Profile;
  solo: RankEntry | null;
  flex: RankEntry | null;
  lpProgressSolo: LpPoint[];
  lpProgressFlex: LpPoint[];
  hasSoloLpHistory: boolean;
  hasFlexLpHistory: boolean;
  recentMatches: MatchRow[];
  topChampions: ChampionMasteryRow[];
  liveGame: {
    isInGame: boolean;
    gameMode: string | null;
    gameLength: number | null;
    allies: LiveGamePlayer[];
    enemies: LiveGamePlayer[];
    playerChampion: string | null;
    playerRole: string | null;
    enemyLaner: string | null;
  };
  challenges: {
    totalPoints: number;
    level: string;
    percentile: number;
  };
  recommendation: {
    champion: string;
    versus: string | null;
    runes: string[];
    boots: string;
    coreItems: string[];
    items?: string[];
    situationalItems: string[];
    tips: string[];
    proPlayers: Array<{ name: string; team: string; region: string }>;
    winRate: number;
    pickRate: number;
    banRate: number;
    vsSpecific: Array<{
      label: string;
      items: string[];
      reason: string;
    }>;
    skillOrder: string;
    summonerSpells: string[];
    startingItems: string[];
    keystone?: string;
    primaryRune?: string;
    secondaryRune?: string;
    runeDetails: {
      primary: string;
      keystone: string;
      primaryRunes: string[];
      secondary: string;
      secondaryRunes: string[];
    } | null;
  };
};

export type TeamPlayerSnapshot = {
  summonerName: string;
  championName: string;
  position: string | null;
  kda: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  vision: number;
  gold: number | null;
  items: Array<{ name: string; image?: string } | string | null>;
};

export type LiveSnapshot = {
  riotId: string | null;
  summonerName: string;
  championName: string;
  position: string | null;
  gameMode: string | null;
  gameTime: number;

  cs: number;
  kills: number;
  deaths: number;
  assists: number;
  gold: number | null;
  vision: number;
  level: number;
  items: string[];

  enemyChampion: string | null;

  allies: TeamPlayerSnapshot[];
  enemies: TeamPlayerSnapshot[];

  diffCs: number | null;
  diffVision: number | null;

  recommendation?: {
    champion: string;
    versus: string | null;
    runes: string[];
    boots: string;
    coreItems: string[];
    situationalItems: string[];
    tips: string[];
  };
};
