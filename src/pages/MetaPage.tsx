import { useEffect, useMemo, useRef, useState } from 'react';
import BackButton from '../components/common/BackButton';
import {
  fetchAnalyticsSummary,
  fetchLpHistory,
  syncAnalyticsMatches,
  type AnalyticsSummaryResponse,
  type QueueMode,
  type Insight,
  type ChampionBreakdownItem,
  type LpHistoryPoint,
  type LpQueueMode,
} from '../services/analytics';
import { fetchRankedOverview } from '../services/ranked';
import { readStoredProfile } from '../utils/profileStorage';
import { getApiErrorMessage } from '../utils/httpError';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

type ViewMode =
  | 'summary'
  | 'trend'
  | 'roles'
  | 'champions'
  | 'issues'
  | 'diagnostics'
  | 'lp';

type SeasonOption = {
  key: string;
  label: string;
  year: number;
  seasonNumber: 1 | 2 | 3;
  start: Date;
  end: Date;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center">
      <p className="text-sm text-[var(--text-secondary)]">{text}</p>
    </div>
  );
}

function localDateAtStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function localDateAtEndOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatLocalDate(date: Date) {
  return date.toLocaleDateString();
}

function getRankIcon(tier?: string) {
  if (!tier) return null;
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier.toLowerCase()}.png`;
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 75
      ? 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400'
      : score >= 55
      ? 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400'
      : 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400';

  return (
    <div className={cx('inline-flex items-center gap-3 rounded-2xl border bg-gradient-to-r px-4 py-3', tone)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-current/20 bg-black/10 text-lg font-bold">
        {score}
      </div>
      <div>
        <div className="text-xs text-[var(--text-muted)]">Score General</div>
        <div className="text-sm font-semibold">
          {score >= 75 ? 'Excelente' : score >= 55 ? 'Bueno' : 'Mejorable'}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'info';
}) {
  const toneMap = {
    default: 'text-[var(--text-primary)]',
    good: 'text-emerald-400',
    warn: 'text-yellow-400',
    bad: 'text-red-400',
    info: 'text-blue-400',
  };

  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
      <div className={cx('mt-3 text-3xl font-bold tracking-tight', toneMap[tone])}>{value}</div>
      {helper ? <div className="mt-2 text-sm text-[var(--text-secondary)]">{helper}</div> : null}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Insight['severity'] }) {
  const map = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <span className={cx('rounded-full border px-2.5 py-1 text-xs font-medium', map[severity])}>
      {severity === 'high' ? 'Alta' : severity === 'medium' ? 'Media' : 'Baja'}
    </span>
  );
}

function InsightCard({ item }: { item: Insight }) {
  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h3>
        <SeverityBadge severity={item.severity} />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>

      {(item.metric || item.currentValue !== undefined || item.targetValue !== undefined) && (
        <div className="mt-4 rounded-2xl bg-[var(--bg-elevated)] p-4">
          <div className="grid gap-2 text-sm">
            {item.metric ? (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Métrica</span>
                <span className="font-medium text-[var(--text-primary)]">{item.metric}</span>
              </div>
            ) : null}
            {item.currentValue !== undefined ? (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Actual</span>
                <span className="font-medium text-[var(--text-primary)]">{String(item.currentValue)}</span>
              </div>
            ) : null}
            {item.targetValue !== undefined ? (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Objetivo</span>
                <span className="font-medium text-[var(--accent-primary)]">{String(item.targetValue)}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-emerald-500/5 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
          Recomendación
        </div>
        <p className="mt-2 text-sm text-emerald-300">{item.recommendation}</p>
      </div>
    </div>
  );
}

function ChampionMiniCard({
  title,
  item,
}: {
  title: string;
  item: ChampionBreakdownItem | null;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
      <div className="text-xs font-medium text-[var(--text-muted)]">{title}</div>
      {item ? (
        <>
          <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">{item.champion}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              {item.games} partidas
            </span>
            <span
              className={cx(
                'rounded-full px-3 py-1 text-xs font-semibold',
                item.winRate >= 55
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : item.winRate >= 50
                  ? 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-red-500/15 text-red-400'
              )}
            >
              {item.winRate}% WR
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[var(--bg-elevated)] p-3">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">KDA</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{item.avgKda}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">CS/min</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{item.csPerMin}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Vision/min</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{item.visionPerMin}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 text-sm text-[var(--text-muted)]">No hay suficiente muestra.</div>
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-xl px-4 py-2 text-sm font-medium transition-all',
        active
          ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-blue-500/20'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
      )}
    >
      {children}
    </button>
  );
}

function buildSeasonOptions(today: Date): SeasonOption[] {
  const currentYear = today.getFullYear();

  const seasonStartsByYear: Record<number, Array<{ n: 1 | 2 | 3; start: string }>> = {
    2026: [
      { n: 1, start: '2026-01-07T00:00:00' },
      { n: 2, start: '2026-04-29T00:00:00' },
      { n: 3, start: '2026-08-01T00:00:00' },
    ],
    2025: [
      { n: 1, start: '2025-01-09T00:00:00' },
      { n: 2, start: '2025-04-30T00:00:00' },
      { n: 3, start: '2025-08-01T00:00:00' },
    ],
  };

  function getYearConfig(year: number) {
    const config = seasonStartsByYear[year];
    if (config?.length === 3) {
      return config.map((item) => ({
        n: item.n,
        start: new Date(item.start),
      }));
    }

    return [
      { n: 1 as const, start: new Date(year, 0, 1, 0, 0, 0, 0) },
      { n: 2 as const, start: new Date(year, 3, 1, 0, 0, 0, 0) },
      { n: 3 as const, start: new Date(year, 7, 1, 0, 0, 0, 0) },
    ];
  }

  const years = [currentYear - 1, currentYear];
  const options: SeasonOption[] = [];

  for (const year of years) {
    const current = getYearConfig(year);
    const next = getYearConfig(year + 1);

    const ranges = [
      {
        key: `${year}-S1`,
        label: `Temporada 1 ${year}`,
        year,
        seasonNumber: 1 as const,
        start: current[0].start,
        end: new Date(current[1].start.getTime() - 1),
      },
      {
        key: `${year}-S2`,
        label: `Temporada 2 ${year}`,
        year,
        seasonNumber: 2 as const,
        start: current[1].start,
        end: new Date(current[2].start.getTime() - 1),
      },
      {
        key: `${year}-S3`,
        label: `Temporada 3 ${year}`,
        year,
        seasonNumber: 3 as const,
        start: current[2].start,
        end: new Date(next[0].start.getTime() - 1),
      },
    ];

    for (const season of ranges) {
      if (season.start.getTime() > today.getTime()) continue;

      const cappedEnd =
        season.end.getTime() > today.getTime()
          ? localDateAtEndOfDay(today)
          : localDateAtEndOfDay(season.end);

      options.push({
        ...season,
        start: localDateAtStartOfDay(season.start),
        end: cappedEnd,
      });
    }
  }

  return options.sort((a, b) => b.start.getTime() - a.start.getTime());
}

function resolveCurrentSeason(options: SeasonOption[], today: Date) {
  const now = today.getTime();

  return (
    options.find(
      (option) => now >= option.start.getTime() && now <= option.end.getTime()
    ) || options[0]
  );
}

function MetricChart({
  title,
  subtitle,
  data,
  dataKey,
  stroke,
}: {
  title: string;
  subtitle: string;
  data: any[];
  dataKey: string;
  stroke: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="h-80">
        {data.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 18, left: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" />
              <XAxis dataKey="label" tick={{ fill: '#8b8b97', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8b8b97', fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="No hay suficientes partidas para construir una tendencia clara." />
        )}
      </div>
    </div>
  );
}



export default function MetaPage() {
  const profile = readStoredProfile();
  const hasLoadedRef = useRef(false);
  const autoSeedSyncRef = useRef(false);

  const today = useMemo(() => new Date(), []);
  const seasonOptions = useMemo(() => buildSeasonOptions(today), [today]);
  const defaultSeason = useMemo(() => resolveCurrentSeason(seasonOptions, today), [seasonOptions, today]);

  const [selectedQueue, setSelectedQueue] = useState<QueueMode>('solo');
  const [lpQueue, setLpQueue] = useState<LpQueueMode>('solo');
  const [selectedView, setSelectedView] = useState<ViewMode>('summary');
  const [selectedSeasonKey, setSelectedSeasonKey] = useState<string>(defaultSeason?.key || '');

  const selectedSeason = useMemo(
    () => seasonOptions.find((item) => item.key === selectedSeasonKey) || defaultSeason,
    [seasonOptions, selectedSeasonKey, defaultSeason]
  );

  const [rankedOverview, setRankedOverview] = useState<any>(null);
  const [analyticsResponse, setAnalyticsResponse] = useState<AnalyticsSummaryResponse | null>(null);
  const [lpHistory, setLpHistory] = useState<LpHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingQuick, setSyncingQuick] = useState(false);
  const [syncingFull, setSyncingFull] = useState(false);
  const [error, setError] = useState('');

  async function loadLpHistory(queueOverride?: LpQueueMode) {
    if (!profile?.account?.puuid || !profile?.resolvedPlatform) return;

    const queue = queueOverride ?? lpQueue;

    try {
      const data = await fetchLpHistory({
        puuid: profile.account.puuid,
        platform: profile.resolvedPlatform,
        queue,
      });

      setLpHistory(data.points || []);
    } catch {
      setLpHistory([]);
    }
  }

  async function loadAnalytics(force = false) {
    if (!profile?.account?.puuid || !profile?.resolvedPlatform) {
      setError('No se encontró un perfil válido para cargar el análisis.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!selectedSeason) {
      setError('No se pudo resolver la temporada seleccionada.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      setError('');
      const [data, ranked] = await Promise.all([
        fetchAnalyticsSummary({
          puuid: profile.account.puuid,
          platform: profile.resolvedPlatform,
          queue: selectedQueue,
          startAt: selectedSeason.start.toISOString(),
          endAt: selectedSeason.end.toISOString(),
          seasonKey: selectedSeason.key,
        }),
        fetchRankedOverview({
          puuid: profile.account.puuid,
          platform: profile.resolvedPlatform,
        }).catch(() => null),
      ]);

      setAnalyticsResponse(data);
      setRankedOverview(ranked);

      const hasNoAnalyticsSample = !data.analytics || data.sample?.totalMatches === 0;
      if (hasNoAnalyticsSample && !autoSeedSyncRef.current) {
        autoSeedSyncRef.current = true;
        await syncAnalyticsMatches({
          puuid: profile.account.puuid,
          platform: profile.resolvedPlatform,
          maxMatches: 120,
          mode: 'incremental',
        });

        const refreshed = await fetchAnalyticsSummary({
          puuid: profile.account.puuid,
          platform: profile.resolvedPlatform,
          queue: selectedQueue,
          startAt: selectedSeason.start.toISOString(),
          endAt: selectedSeason.end.toISOString(),
          seasonKey: selectedSeason.key,
        });
        setAnalyticsResponse(refreshed);
      }

      await loadLpHistory(lpQueue);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'No se pudo cargar el análisis'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSync(maxMatches: number, mode: 'incremental' | 'full_backfill') {
    if (!profile?.account?.puuid || !profile?.resolvedPlatform) {
      setError('No se encontró un perfil válido para sincronizar.');
      return;
    }

    try {
      if (mode === 'incremental') setSyncingQuick(true);
      else setSyncingFull(true);

      setError('');

      const syncResult = await syncAnalyticsMatches({
        puuid: profile.account.puuid,
        platform: profile.resolvedPlatform,
        maxMatches,
        mode,
      });

      if (syncResult?.inProgress) {
        setError(syncResult.message || 'Ya hay una sincronización en progreso.');
        setTimeout(() => {
          loadAnalytics(true);
        }, 4000);
      } else if (mode === 'incremental') {
        await loadAnalytics(true);
      } else {
        setTimeout(() => {
          loadAnalytics(true);
        }, 5000);
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'No se pudo sincronizar el historial'));
    } finally {
      if (mode === 'incremental') setSyncingQuick(false);
      else setSyncingFull(false);
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadAnalytics(false);
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    loadAnalytics(true);
  }, [selectedQueue, selectedSeasonKey]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    loadLpHistory(lpQueue);
  }, [lpQueue]);

  useEffect(() => {
    if (selectedQueue === 'solo' || selectedQueue === 'flex') {
      setLpQueue(selectedQueue);
    }
  }, [selectedQueue]);

  const data = analyticsResponse?.analytics || null;
  const cacheCoverage = analyticsResponse?.cacheCoverage || null;
  const rankedEntries: any[] =
    rankedOverview?.leagueEntries?.length
      ? rankedOverview.leagueEntries
      : analyticsResponse?.ranked?.leagueEntries || [];
  const soloRecord = useMemo(
    () => rankedEntries.find((entry) => entry.queueType === 'RANKED_SOLO_5x5') || null,
    [rankedEntries]
  );
  const flexRecord = useMemo(
    () => rankedEntries.find((entry) => entry.queueType === 'RANKED_FLEX_SR') || null,
    [rankedEntries]
  );
  const selectedQueueRecord = selectedQueue === 'flex' ? flexRecord : soloRecord;

  const lpRankedEntry = useMemo(() => {
    const queueType = lpQueue === 'flex' ? 'RANKED_FLEX_SR' : 'RANKED_SOLO_5x5';
    return rankedEntries.find((entry) => entry.queueType === queueType) || null;
  }, [rankedEntries, lpQueue]);
  const queueRecords = analyticsResponse?.ranked?.queueRecords;

  const sanitizedLpHistory = useMemo(() => {
    const seen = new Set<string>();
    const base = (lpHistory || [])
      .filter((point) => {
        const lp = Number(point?.leaguePoints);
        const rankValue = Number(point?.rankValue);
        if (!Number.isFinite(lp) || !Number.isFinite(rankValue)) return false;
        const key = `${point.snapshotAt}:${lp}:${rankValue}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.snapshotAt).getTime() - new Date(b.snapshotAt).getTime());

    if (base.length > 0) return base;

    if (!lpRankedEntry) return [];

    const nowIso = new Date().toISOString();
    return [
      {
        label: new Date(nowIso).toLocaleString(),
        snapshotAt: nowIso,
        tier: lpRankedEntry.tier,
        rank: lpRankedEntry.rank,
        leaguePoints: lpRankedEntry.leaguePoints,
        wins: lpRankedEntry.wins,
        losses: lpRankedEntry.losses,
        lpChange: 0,
        lpGain: 0,
        lpLoss: 0,
        winsDelta: 0,
        lossesDelta: 0,
        matchesDelta: 0,
        rankValue: Number(lpRankedEntry.leaguePoints) || 0,
      },
    ];
  }, [lpHistory, lpRankedEntry]);

  const lpChanges = useMemo(() => {
    return sanitizedLpHistory.reduce(
      (acc, point) => {
        if (point.lpChange > 0) acc.gained += point.lpChange;
        if (point.lpChange < 0) acc.lost += Math.abs(point.lpChange);
        return acc;
      },
      { gained: 0, lost: 0 }
    );
  }, [sanitizedLpHistory]);

  const scoreTone =
    !data ? 'default' : data.summary.winRate >= 55 ? 'good' : data.summary.winRate >= 50 ? 'warn' : 'bad';

  const viewButtons: Array<{ key: ViewMode; label: string }> = [
    { key: 'summary', label: 'Resumen' },
    { key: 'trend', label: 'Tendencia' },
    { key: 'roles', label: 'Roles' },
    { key: 'champions', label: 'Campeones' },
    { key: 'issues', label: 'Feedback' },
    { key: 'diagnostics', label: 'Diagnóstico' },
    { key: 'lp', label: 'LP' },
  ];

  if (!profile?.account?.puuid || !profile?.resolvedPlatform) {
    return (
      <main className="page-shell">
        <div className="page-container">
          <BackButton />
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-yellow-200">
            No se encontró un perfil válido. Vuelve a cargar la cuenta antes de abrir esta vista.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <BackButton />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
          <div className="rounded-[28px] border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="inline-flex rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                  Perfil analítico
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                    Análisis Pro
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
                    Resumen por temporada con progreso en el tiempo, rendimiento por bloques, picks,
                    feedback y evolución de liga.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {selectedSeason?.label || 'Temporada'}
                  </span>
                  <span className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {selectedSeason ? `${formatLocalDate(selectedSeason.start)} → ${formatLocalDate(selectedSeason.end)}` : '-'}
                  </span>
                  <span className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    Hoy: {formatLocalDate(today)}
                  </span>
                </div>
              </div>

              {data ? <ScoreBadge score={data.performanceScore} /> : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <div className="text-xs font-medium text-[var(--text-muted)]">
                  {`Rango oficial (${selectedQueue === 'solo' ? 'SoloQ' : 'Flex'})`}
                </div>
                {selectedQueueRecord ? (
                  <>
                    {getRankIcon(selectedQueueRecord.tier) ? (
                      <img
                        src={getRankIcon(selectedQueueRecord.tier) || ''}
                        alt={selectedQueueRecord.tier}
                        className="mt-3 h-12 w-12 object-contain"
                      />
                    ) : null}
                    <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                      {selectedQueueRecord.tier} {selectedQueueRecord.rank}
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">
                      {selectedQueueRecord.leaguePoints} LP · {selectedQueueRecord.wins}W / {selectedQueueRecord.losses}L
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-[var(--text-muted)]">No hay datos oficiales para esta cola.</div>
                )}
              </div>
              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <div className="text-xs font-medium text-[var(--text-muted)]">SoloQ actual</div>
                {soloRecord ? (
                  <>
                  {getRankIcon(soloRecord.tier) ? (
                      <img
                        src={getRankIcon(soloRecord.tier) || ''}
                        alt={soloRecord.tier}
                        className="mt-3 h-12 w-12 object-contain"
                      />
                    ) : null}
                    <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                      {soloRecord.tier} {soloRecord.rank}
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">
                      {soloRecord.leaguePoints} LP · {soloRecord.wins}W / {soloRecord.losses}L
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      {`Partidas: ${soloRecord.wins + soloRecord.losses} (Riot) · ${queueRecords?.solo?.cachedMatches ?? 0} en cache`}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-[var(--text-muted)]">Sin datos de SoloQ.</div>
                )}
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <div className="text-xs font-medium text-[var(--text-muted)]">Flex actual</div>
                {flexRecord ? (
                  <>
                  {getRankIcon(flexRecord.tier) ? (
                      <img
                        src={getRankIcon(flexRecord.tier) || ''}
                        alt={flexRecord.tier}
                        className="mt-3 h-12 w-12 object-contain"
                      />
                    ) : null}
                    <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                      {flexRecord.tier} {flexRecord.rank}
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">
                      {flexRecord.leaguePoints} LP · {flexRecord.wins}W / {flexRecord.losses}L
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      {`Partidas: ${flexRecord.wins + flexRecord.losses} (Riot) · ${queueRecords?.flex?.cachedMatches ?? 0} en cache`}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-[var(--text-muted)]">Sin datos de Flex.</div>
                )}
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <div className="text-xs font-medium text-[var(--text-muted)]">Resumen de temporada</div>
                <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                  {selectedQueueRecord ? selectedQueueRecord.wins + selectedQueueRecord.losses : data?.summary.total ?? 0}
                </div>
                <div className="mt-2 text-sm text-[var(--text-secondary)]">
                  {selectedQueueRecord
                    ? `${selectedQueueRecord.wins}W / ${selectedQueueRecord.losses}L · ${Math.round(
                        (selectedQueueRecord.wins / Math.max(selectedQueueRecord.wins + selectedQueueRecord.losses, 1)) * 100
                      )}% WR (Riot oficial)`
                    : data
                    ? `${data.summary.wins}W / ${data.summary.losses}L · ${data.summary.winRate}% WR (cache)`
                    : 'Sin datos'}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <div className="text-xs font-medium text-[var(--text-muted)]">Cobertura del historial</div>
                <div className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                  {cacheCoverage ? `${cacheCoverage.coveragePercent}%` : '-'}
                </div>
                <div className="mt-2 text-sm text-[var(--text-secondary)]">
                  {cacheCoverage
                    ? `${cacheCoverage.cachedMatches} / ${cacheCoverage.officialMatches} oficiales`
                    : 'No disponible'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
            <SectionTitle
              eyebrow="Filtros"
              title="Control de temporada"
              subtitle="Selecciona temporada, cola y sincroniza el historial."
            />

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--text-muted)]">Temporada</label>
                <select
                  value={selectedSeasonKey}
                  onChange={(e) => setSelectedSeasonKey(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]"
                >
                  {seasonOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--text-muted)]">Cola del análisis</label>
                <select
                  value={selectedQueue}
                  onChange={(e) => setSelectedQueue(e.target.value as QueueMode)}
                  disabled={syncingQuick || syncingFull}
                  className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]"
                >
                  <option value="solo">SoloQ</option>
                  <option value="flex">Flex</option>
                </select>
              </div>

              <button
                onClick={() => loadAnalytics(true)}
                disabled={refreshing || syncingQuick || syncingFull}
                className="w-full rounded-2xl bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {refreshing ? 'Cargando...' : 'Recargar análisis'}
              </button>

              <button
                onClick={() => handleSync(100, 'incremental')}
                disabled={syncingQuick || syncingFull}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {syncingQuick ? 'Sincronizando...' : 'Sync rápida'}
              </button>

              <button
                onClick={() => handleSync(1000, 'full_backfill')}
                disabled={syncingQuick || syncingFull}
                className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {syncingFull ? 'Sincronizando...' : 'Backfill completo'}
              </button>

              <div className="rounded-2xl bg-[var(--bg-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                El análisis usa siempre la fecha local de la PC para resolver la temporada activa y mostrar el tramo vigente.
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-yellow-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
          <div className="flex flex-wrap gap-2">
            {viewButtons.map((item) => (
              <TabButton
                key={item.key}
                active={selectedView === item.key}
                onClick={() => setSelectedView(item.key)}
              >
                {item.label}
              </TabButton>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
            <p className="text-sm text-[var(--text-secondary)]">Cargando análisis...</p>
          </div>
        ) : null}

        {!loading && !data ? (
          <div className="mt-8">
            <EmptyState text="Todavía no hay datos cacheados suficientes para esta temporada. Haz una sincronización y vuelve a cargar." />
          </div>
        ) : null}

        {!loading && data ? (
          <>
            {selectedView === 'summary' && (
              <>
                <div className="mt-8">
                  <SectionTitle
                    eyebrow="Resumen"
                    title="Lectura rápida de temporada"
                    subtitle="Indicadores principales para evaluar consistencia, recursos e impacto."
                  />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      label="Winrate"
                      value={`${data.summary.winRate}%`}
                      helper={`${data.summary.wins}W / ${data.summary.losses}L`}
                      tone={scoreTone as any}
                    />
                    <StatCard label="KDA" value={data.summary.avgKda} helper="Supervivencia e impacto" tone="info" />
                    <StatCard label="CS/min" value={data.summary.csPerMin} helper="Farmeo real" tone="warn" />
                    <StatCard label="Vision/min" value={data.summary.visionPerMin} helper="Control de mapa" tone="info" />
                    <StatCard label="Gold/min" value={data.summary.goldPerMin} helper="Economía" tone="good" />
                    <StatCard label="Damage/min" value={data.summary.damagePerMin} helper="Daño sostenido" tone="bad" />
                    <StatCard label="Muertes" value={data.summary.deathsAvg} helper="Riesgo" tone="warn" />
                    <StatCard label="Rol principal" value={data.mainRole} helper="Frecuencia real" />
                  </div>
                </div>

                <div className="mt-8 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                    <SectionTitle title="Lectura general" />
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{data.trendMessage}</p>

                    <div className="mt-6 rounded-2xl bg-[var(--bg-elevated)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Meta semanal
                      </div>
                      <div className="mt-2 text-sm text-[var(--text-primary)]">
                        {data.improvementPlan.weeklyGoal}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                    <SectionTitle title="Interpretación del tramo" />
                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                      <p>El tramo mostrado corresponde a la temporada seleccionada.</p>
                      <p>Si la temporada sigue activa, el fin del tramo es el día de hoy según la PC.</p>
                      <p>Si la cobertura es baja, aún faltan partidas por sincronizar dentro de ese tramo.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedView === 'trend' && (
              <div className="mt-8 grid gap-6 xl:grid-cols-2">
                <MetricChart
                  title="Winrate por bloques"
                  subtitle="Resultados a lo largo del tiempo."
                  data={data.trend}
                  dataKey="winRate"
                  stroke="#57a8ff"
                />
                <MetricChart
                  title="KDA por bloques"
                  subtitle="Consistencia en peleas."
                  data={data.trend}
                  dataKey="kda"
                  stroke="#6ec7ff"
                />
                <MetricChart
                  title="CS/min por bloques"
                  subtitle="Evolución del farmeo."
                  data={data.trend}
                  dataKey="csPerMin"
                  stroke="#fbbf24"
                />
                <MetricChart
                  title="Vision/min por bloques"
                  subtitle="Evolución del control de mapa."
                  data={data.trend}
                  dataKey="visionPerMin"
                  stroke="#a78bfa"
                />
                <MetricChart
                  title="Gold/min por bloques"
                  subtitle="Conversión de tiempo en economía."
                  data={data.trend}
                  dataKey="goldPerMin"
                  stroke="#34d399"
                />
                <MetricChart
                  title="Damage/min por bloques"
                  subtitle="Impacto ofensivo sostenido."
                  data={data.trend}
                  dataKey="damagePerMin"
                  stroke="#fb7185"
                />
                <MetricChart
                  title="Muertes por bloques"
                  subtitle="Riesgo y estabilidad."
                  data={data.trend}
                  dataKey="deathsAvg"
                  stroke="#f59e0b"
                />
                <MetricChart
                  title="Daño a objetivos por bloques"
                  subtitle="Conversión a dragones, torres y otras estructuras."
                  data={data.trend}
                  dataKey="objectiveDamageAvg"
                  stroke="#22c55e"
                />
              </div>
            )}

            {selectedView === 'roles' && (
              <div className="mt-8 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <SectionTitle
                  eyebrow="Roles"
                  title="Distribución y rendimiento por rol"
                  subtitle="Ideal para detectar si tu nivel cambia mucho según posición."
                />

                <div className="h-96">
                  {data.roleBreakdown.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.roleBreakdown} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" />
                        <XAxis dataKey="role" tick={{ fill: '#8b8b97', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#8b8b97', fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="winRate" name="Winrate" fill="#4f8cff" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="No hay suficientes datos por rol." />
                  )}
                </div>
              </div>
            )}

            {selectedView === 'champions' && (
              <>
                <div className="mt-8">
                  <SectionTitle
                    eyebrow="Campeones"
                    title="Selección de campeones"
                    subtitle="Tus picks más jugados, más fuertes y más débiles en la temporada seleccionada."
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <ChampionMiniCard title="Campeón más jugado" item={data.topChampion} />
                    <ChampionMiniCard title="Mejor campeón" item={data.bestChampion} />
                    <ChampionMiniCard title="Campeón más débil" item={data.weakestChampion} />
                  </div>
                </div>

                <div className="mt-8 grid gap-4 xl:grid-cols-3">
                  <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                    <SectionTitle title="Recomendados" />
                    <div className="space-y-3">
                      {data.recommendedChampions.length ? (
                        data.recommendedChampions.map((item) => (
                          <div key={item.champion} className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                            <div className="font-semibold text-[var(--text-primary)]">{item.champion}</div>
                            <div className="mt-1 text-sm text-[var(--text-secondary)]">
                              {item.games} partidas · {item.winRate}% WR · KDA {item.avgKda}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">No hay picks recomendados con muestra suficiente.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                    <SectionTitle title="Estables" />
                    <div className="space-y-3">
                      {data.stableChampions.length ? (
                        data.stableChampions.map((item) => (
                          <div key={item.champion} className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                            <div className="font-semibold text-[var(--text-primary)]">{item.champion}</div>
                            <div className="mt-1 text-sm text-[var(--text-secondary)]">
                              {item.games} partidas · {item.winRate}% WR · KDA {item.avgKda}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">No se detectan picks estables suficientes.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                    <SectionTitle title="Evitar por ahora" />
                    <div className="space-y-3">
                      {data.avoidChampions.length ? (
                        data.avoidChampions.map((item) => (
                          <div key={item.champion} className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                            <div className="font-semibold text-[var(--text-primary)]">{item.champion}</div>
                            <div className="mt-1 text-sm text-[var(--text-secondary)]">
                              {item.games} partidas · {item.winRate}% WR · KDA {item.avgKda}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">No hay picks claramente negativos todavía.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedView === 'issues' && (
              <>
                <div className="mt-8">
                  <SectionTitle
                    eyebrow="Feedback"
                    title="Problemas detectados"
                    subtitle="Áreas que más están frenando tu mejora en esta temporada."
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    {data.issues.map((item) => (
                      <InsightCard key={item.key} item={item} />
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <SectionTitle title="Fortalezas" subtitle="Puntos que ya están funcionando y conviene mantener." />
                  <div className="grid gap-4 xl:grid-cols-2">
                    {data.strengths.map((item) => (
                      <InsightCard key={item.key} item={item} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedView === 'diagnostics' && (
              <div className="mt-8">
                <SectionTitle
                  eyebrow="Diagnóstico"
                  title="Diagnóstico completo"
                  subtitle="Lectura detallada de métricas, riesgos y oportunidades de mejora."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  {data.diagnostics.map((item) => (
                    <InsightCard key={item.key} item={item} />
                  ))}
                </div>
              </div>
            )}

            {selectedView === 'lp' && (
              <div className="mt-8 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <SectionTitle
                    eyebrow="Liga"
                    title="Evolución de LP"
                    subtitle="Snapshots históricos de la cola seleccionada."
                  />

                  <div className="flex items-center gap-2 rounded-2xl bg-[var(--bg-elevated)] p-1">
                    <button
                      onClick={() => setLpQueue('solo')}
                      className={cx(
                        'rounded-xl px-4 py-2 text-sm font-medium',
                        lpQueue === 'solo'
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'text-[var(--text-secondary)]'
                      )}
                    >
                      SoloQ
                    </button>
                    <button
                      onClick={() => setLpQueue('flex')}
                      className={cx(
                        'rounded-xl px-4 py-2 text-sm font-medium',
                        lpQueue === 'flex'
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'text-[var(--text-secondary)]'
                      )}
                    >
                      Flex
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-[var(--bg-elevated)] p-4">
                  <div className="text-sm text-[var(--text-muted)]">
                    Estado actual de {lpQueue === 'solo' ? 'SoloQ' : 'Flex'}
                  </div>
                  {lpRankedEntry ? (
                    <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                      {lpRankedEntry.tier} {lpRankedEntry.rank} · {lpRankedEntry.leaguePoints} LP · {lpRankedEntry.wins}W / {lpRankedEntry.losses}L
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-[var(--text-muted)]">Sin entry actual disponible.</div>
                  )}
                </div>

                <div className="mt-6 h-80">
                  {sanitizedLpHistory.length >= 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sanitizedLpHistory} margin={{ top: 10, right: 18, left: 6, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" />
                        <XAxis dataKey="label" tick={{ fill: '#8b8b97', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#8b8b97', fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: any, name: any) => {
                            if (name === 'leaguePoints') return [`${value} LP`, 'LP'];
                            return [value, name];
                          }}
                          labelFormatter={(_, payload: any) => {
                            const point = payload?.[0]?.payload;
                            if (!point) return '';
                            return `${point.tier} ${point.rank} · ${point.leaguePoints} LP`;
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="leaguePoints"
                          name="LP"
                          stroke="#4f8cff"
                          strokeWidth={3}
                          dot={{ r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="Todavía no hay snapshots guardados para esta cola. Haz sync y vuelve a cargar." />
                  )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <StatCard
                    label="LP actual"
                    value={sanitizedLpHistory.length ? sanitizedLpHistory[sanitizedLpHistory.length - 1].leaguePoints : '-'}
                  />
                  <StatCard
                    label="Cambio más reciente"
                    value={
                      sanitizedLpHistory.length > 1
                        ? `${sanitizedLpHistory[sanitizedLpHistory.length - 1].lpChange > 0 ? '+' : ''}${sanitizedLpHistory[sanitizedLpHistory.length - 1].lpChange} LP`
                        : '-'
                    }
                    tone="info"
                  />
                  <StatCard
                    label="LP ganado"
                    value={`+${lpChanges.gained}`}
                    helper="Suma de subidas entre snapshots"
                    tone="good"
                  />
                  <StatCard
                    label="LP perdido"
                    value={`-${lpChanges.lost}`}
                    helper="Suma de bajadas entre snapshots"
                    tone="bad"
                  />
                  <StatCard
                    label="Snapshots"
                    value={sanitizedLpHistory.length}
                    helper="Puntos históricos guardados"
                  />
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
