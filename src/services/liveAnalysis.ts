import { api } from './api';

export type LiveAnalysisMode = 'lane' | 'player' | 'team';
export type Role = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';

export type LiveItem = {
  itemID: number;
  displayName: string;
  price: number;
  count: number;
  slot: number;
};

export type LiveScores = {
  assists?: number;
  creepScore?: number;
  deaths?: number;
  kills?: number;
  wardScore?: number;
  gold?: number | null;
  totalGold?: number | null;
  currentGold?: number | null;
  damage?: number | null;
  totalDamage?: number | null;
  damageToChampions?: number | null;
};

export type EnemyProfile = {
  buildType: 'tank' | 'ap' | 'ad' | 'mixed' | 'bruiser';
  damageType: 'AD' | 'AP' | 'MIXED';
  sustain: boolean;
  crit: boolean;
  onHit: boolean;
  frontline: boolean;
  antiTank: boolean;
  cc: boolean;
  itemNames: string[];
  shownCoreItems: string[];
};

export type SerializedTarget = {
  riotId: string;
  championName: string;
  position: string;
  level: number;
  items: LiveItem[];
  scores: LiveScores;
  runes: any;
  enemyProfile: EnemyProfile;
  detectedFrom: {
    champion: string;
    items: string[];
  };
};

export type MatchupStats = {
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  vision: number;
  level: number;
  gold: number | null;
  damage: number | null;
};

export type MatchupComparison = {
  targetRiotId: string;
  targetChampion: string;
  me: MatchupStats;
  enemy: MatchupStats;
  diff: {
    kills: number;
    deaths: number;
    assists: number;
    kda: number;
    cs: number;
    vision: number;
    level: number;
    gold: number | null;
    damage: number | null;
  };
  verdicts: string[];
};

export type EnemySignal = {
  tag: string;
  sourceItem: string;
  severity: 'alta' | 'media' | 'baja';
  summary: string;
};

export type RecommendedItem = {
  itemId: number;
  name: string;
  why: string;
  priority: 'alta' | 'media' | 'baja';
  counters: string[];
};

export type Recommendation = {
  key: string;
  title: string;
  reason: string;
  items: RecommendedItem[];
};

export type BuildAdvice = {
  sellCandidates: Array<{
    item: string;
    slot: number;
    reason: string;
  }>;
  replaceSuggestions: Array<{
    sell: string;
    buy: string;
    buyItemId?: number;
    reason: string;
  }>;
  decayCandidates: Array<{
    item: string;
    slot: number;
    reason: string;
    urgency: 'alta' | 'media' | 'baja';
  }>;
  fullBuildTips: string[];
};

export type LiveCoach = {
  status: 'ahead' | 'even' | 'behind';
  now: string[];
  nextBuy: string[];
  replaceNow: string[];
  watchEnemy: string[];
  nextCheckSeconds: number;
};

export type LiveAnalysisResponse = {
  mode: LiveAnalysisMode;
  me: {
    riotId: string;
    championName: string;
    championClass: string;
    position: string;
    detectedPosition: string;
    team: string;
    level: number;
    items: LiveItem[];
    scores: LiveScores;
    runes: any;
  };
  allEnemies: SerializedTarget[];
  targets: SerializedTarget[];
  analysisSummary: string;
  enemySignals: EnemySignal[];
  recommendations: Recommendation[];
  matchupComparisons: MatchupComparison[];
  adaptiveTips: string[];
  buildAdvice: BuildAdvice;
  coach: LiveCoach;
  generatedAt: string;
};

export async function fetchLiveAnalysis(params: {
  mode: LiveAnalysisMode;
  targetRiotId?: string;
  preferredRole?: Role;
}) {
  const { data } = await api.get<LiveAnalysisResponse>('/live/analysis', {
    params,
  });
  return data;
}
