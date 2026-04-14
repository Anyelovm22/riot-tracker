import { api, cachedGet } from './api';

export type QueueMode = 'all' | 'solo' | 'flex';
export type LpQueueMode = 'solo' | 'flex';
export type Severity = 'high' | 'medium' | 'low';

export type Insight = {
  key: string;
  title: string;
  description: string;
  severity: Severity;
  metric?: string;
  currentValue?: number | string;
  targetValue?: number | string;
  recommendation: string;
};

export type RankedEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type OfficialRecord = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type CacheCoverage = {
  cachedMatches: number;
  officialMatches: number;
  coveragePercent: number;
};

export type TrendPoint = {
  label: string;
  winRate: number;
  kda: number;
  csPerMin: number;
  visionPerMin: number;
  goldPerMin: number;
  damagePerMin: number;
  deathsAvg: number;
  objectiveDamageAvg: number;
  turretAvg: number;
};

export type RoleBreakdownItem = {
  role: string;
  games: number;
  winRate: number;
  avgKda: number;
  avgDamage: number;
  avgGold: number;
  avgCs: number;
  avgVision: number;
  avgDamageTaken: number;
  csPerMin: number;
  visionPerMin: number;
  goldPerMin: number;
  damagePerMin: number;
  objectiveDamageAvg: number;
  turretAvg: number;
  deathsAvg: number;
};

export type ChampionBreakdownItem = {
  champion: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKda: number;
  avgDamage: number;
  avgGold: number;
  avgDeaths: number;
  csPerMin: number;
  visionPerMin: number;
};

export type SummaryStats = {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKda: number;
  avgDamage: number;
  avgGold: number;
  avgCs: number;
  avgVision: number;
  avgDamageTaken: number;
  csPerMin: number;
  damagePerMin: number;
  goldPerMin: number;
  visionPerMin: number;
  objectiveDamageAvg: number;
  turretAvg: number;
  deathsAvg: number;
};

export type Benchmarks = {
  winRate: number;
  kda: number;
  csPerMin: number;
  visionPerMin: number;
  goldPerMin: number;
  damagePerMin: number;
  deathsAvg: number;
  objectiveDamageAvg: number;
  turretAvg: number;
};

export type ImprovementPlan = {
  focus: string[];
  habits: string[];
  keepDoing: string[];
  weeklyGoal: string;
};

export type AnalyticsData = {
  summary: SummaryStats;
  benchmarks: Benchmarks;
  mainRole: string;
  performanceScore: number;
  roleBreakdown: RoleBreakdownItem[];
  championBreakdown: ChampionBreakdownItem[];
  trend: TrendPoint[];
  strengths: Insight[];
  issues: Insight[];
  diagnostics: Insight[];
  trendMessage: string;
  topChampion: ChampionBreakdownItem | null;
  bestChampion: ChampionBreakdownItem | null;
  weakestChampion: ChampionBreakdownItem | null;
  recommendedChampions: ChampionBreakdownItem[];
  avoidChampions: ChampionBreakdownItem[];
  stableChampions: ChampionBreakdownItem[];
  improvementPlan: ImprovementPlan;
};

export type AnalyticsSummaryResponse = {
  success: boolean;
  ranked: {
    rankedAvailable: boolean;
    leagueEntries: RankedEntry[];
  };
  officialRecord: OfficialRecord | null;
  cacheCoverage: CacheCoverage | null;
  sample: {
    totalMatches: number;
    from: string | null;
    to: string | null;
  };
  analytics: AnalyticsData | null;
  queueAnalytics?: {
    solo: AnalyticsData;
    flex: AnalyticsData;
  };
};

export type LpHistoryPoint = {
  label: string;
  snapshotAt: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  lpChange: number;
  lpGain?: number;
  lpLoss?: number;
  winsDelta?: number;
  lossesDelta?: number;
  matchesDelta?: number;
  rankValue: number;
};

export type LpHistoryResponse = {
  success: boolean;
  queueType: string;
  totalSnapshots: number;
  points: LpHistoryPoint[];
  totals?: {
    lpGained: number;
    lpLost: number;
    netLp: number;
    winsDetected: number;
    lossesDetected: number;
  };
};

export type SyncAnalyticsPayload = {
  puuid: string;
  platform: string;
  maxMatches?: number;
  mode?: 'incremental' | 'full_backfill';
};

export type SyncAnalyticsResponse = {
  success: boolean;
  inProgress?: boolean;
  message?: string;
  saved?: number;
  scannedIds?: number;
  totalPages?: number;
  nextStart?: number;
  mode?: string;
};

export type FetchAnalyticsSummaryParams = {
  puuid: string;
  platform: string;
  queue?: QueueMode;
  startAt?: string;
  endAt?: string;
  seasonKey?: string;
};

export type FetchLpHistoryParams = {
  puuid: string;
  platform: string;
  queue: LpQueueMode;
};

export async function syncAnalyticsMatches(payload: SyncAnalyticsPayload) {
  const { data } = await api.post<SyncAnalyticsResponse>('/analytics/sync', payload);
  return data;
}

export async function fetchAnalyticsSummary(params: FetchAnalyticsSummaryParams) {
  return cachedGet<AnalyticsSummaryResponse>('/analytics/summary', params, {
    ttlMs: 1000 * 60 * 2,
  });
}

export async function fetchLpHistory(params: FetchLpHistoryParams) {
  return cachedGet<LpHistoryResponse>('/analytics/lp-history', params, {
    ttlMs: 1000 * 60 * 3,
  });
}
