import { useEffect, useMemo, useRef, useState } from 'react';
import BackButton from '../components/common/BackButton';
import { fetchLiveAnalysis } from '../services/liveAnalysis';
import {
  getChampionIconUrl,
  getItemIconUrl,
  getLatestDdragonVersion,
} from '../utils/ddragonVersion';
import type {
  LiveAnalysisResponse,
  MatchupComparison,
  Role,
  RecommendedItem,
} from '../services/liveAnalysis';

const DDRAGON_VERSION = '15.7.1';
type RuneMap = Record<number, { id: number; name: string; icon: string }>;

export default function LiveAnalyzePage() {
  const AUTO_REFRESH_SECONDS = 25;
  const [mode, setMode] = useState<'lane' | 'player' | 'team'>('lane');
  const [targetRiotId, setTargetRiotId] = useState('');
  const [preferredRole, setPreferredRole] = useState<Role>('TOP');

  const [data, setData] = useState<LiveAnalysisResponse | null>(null);
  const [runeMap, setRuneMap] = useState<RuneMap>({});

  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [error, setError] = useState('');
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [ddragonVersion, setDdragonVersion] = useState('15.7.1');
  const [dismissedItemIds, setDismissedItemIds] = useState<number[]>([]);

  const modeRef = useRef(mode);
  const targetRef = useRef(targetRiotId);
  const roleRef = useRef(preferredRole);

  useEffect(() => {
    modeRef.current = mode;
    targetRef.current = targetRiotId;
    roleRef.current = preferredRole;
  }, [mode, targetRiotId, preferredRole]);

  async function loadStaticData(version: string) {
    const runeRes = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_ES/runesReforged.json`
    );

    if (!runeRes.ok) {
      throw new Error('No se pudo cargar la data estática de runas');
    }

    const runeJson = await runeRes.json();

    const nextRuneMap: RuneMap = {};
    for (const style of runeJson) {
      for (const slot of style.slots || []) {
        for (const rune of slot.runes || []) {
          nextRuneMap[rune.id] = {
            id: rune.id,
            name: rune.name,
            icon: `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`,
          };
        }
      }
    }

    setRuneMap(nextRuneMap);
  }

  async function loadAnalysis(
    nextMode = mode,
    nextTarget = targetRiotId,
    nextRole = preferredRole,
    options?: { silent?: boolean }
  ) {
    try {
      if (options?.silent) {
        setBackgroundRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const result = await fetchLiveAnalysis({
        mode: nextMode,
        targetRiotId: nextMode === 'player' ? nextTarget : undefined,
        preferredRole: nextRole,
      });

      setData(result);
      setLastRefreshAt(result.generatedAt || new Date().toISOString());
      setRefreshCountdown(result.coach?.nextCheckSeconds || AUTO_REFRESH_SECONDS);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No se pudo cargar el análisis'
      );
    } finally {
      if (options?.silent) {
        setBackgroundRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError('');
        const latestVersion = await getLatestDdragonVersion();
        setDdragonVersion(latestVersion);
        await loadStaticData(latestVersion);
        await loadAnalysis('lane', '', 'TOP');
      } catch (err: any) {
        setError(err?.message || 'No se pudo inicializar la vista');
        setLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          void loadAnalysis(modeRef.current, targetRef.current, roleRef.current, {
            silent: true,
          });
          return data?.coach?.nextCheckSeconds || AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data?.coach?.nextCheckSeconds]);

  const enemyOptions = useMemo(() => data?.allEnemies || [], [data]);

  function getChampionImageByName(name?: string) {
    return getChampionIconUrl(ddragonVersion, name);
  }

  function getItemImage(itemId?: number) {
    return getItemIconUrl(ddragonVersion, itemId);
  }

  function extractKeystoneId(runes: any) {
    return (
      runes?.keystone?.id ||
      runes?.keystone?.perk ||
      runes?.primaryRuneTree?.selections?.[0]?.perk ||
      null
    );
  }

  function renderItemGrid(items: any[] = []) {
    const validItems = items.filter((item) => item?.itemID);

    if (!validItems.length) {
      return <p className="text-xs text-[var(--text-muted)]">Sin items</p>;
    }

    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {validItems.map((item, index) => (
          <div
            key={`${item.itemID}-${index}`}
            className="group"
            title={item.displayName}
          >
            <img
              src={getItemImage(item.itemID)}
              alt={item.displayName}
              className="h-12 w-12 rounded-lg border border-[var(--border-default)] object-cover transition-transform group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    );
  }

  function formatSigned(value: number | null | undefined) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${Math.round(value * 100) / 100}`;
  }

  function formatMaybeNumber(value: number | null | undefined) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return String(Math.round(value));
  }

  function getDiffTone(value: number | null | undefined, reverse = false) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 'text-[var(--text-primary)]';
    }

    const positive = reverse ? value < 0 : value > 0;
    const negative = reverse ? value > 0 : value < 0;

    if (positive) return 'text-emerald-400';
    if (negative) return 'text-red-400';
    return 'text-[var(--text-primary)]';
  }

  function StatCard({
    label,
    value,
    toneClass,
  }: {
    label: string;
    value: string;
    toneClass?: string;
  }) {
    return (
      <div className="rounded-2xl bg-[var(--bg-elevated)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
        <p className={`mt-2 text-lg font-semibold ${toneClass || 'text-[var(--text-primary)]'}`}>
          {value}
        </p>
      </div>
    );
  }

  function renderComparisonCard(comparison: MatchupComparison, index: number) {
    return (
      <div
        key={`${comparison.targetRiotId}-${index}`}
        className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-xl"
      >
        <div className="flex items-center gap-4">
          <img
            src={getChampionImageByName(comparison.targetChampion)}
            alt={comparison.targetChampion}
            className="h-16 w-16 rounded-2xl border border-[var(--border-default)] object-cover"
          />
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {comparison.targetRiotId}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {comparison.targetChampion}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Diff KDA"
            value={formatSigned(comparison.diff.kda)}
            toneClass={getDiffTone(comparison.diff.kda)}
          />
          <StatCard
            label="Diff CS"
            value={formatSigned(comparison.diff.cs)}
            toneClass={getDiffTone(comparison.diff.cs)}
          />
          <StatCard
            label="Diff Visión"
            value={formatSigned(comparison.diff.vision)}
            toneClass={getDiffTone(comparison.diff.vision)}
          />
          <StatCard
            label="Diff Nivel"
            value={formatSigned(comparison.diff.level)}
            toneClass={getDiffTone(comparison.diff.level)}
          />
          <StatCard
            label="Diff Oro"
            value={formatSigned(comparison.diff.gold)}
            toneClass={getDiffTone(comparison.diff.gold)}
          />
          <StatCard
            label="Diff Daño"
            value={formatSigned(comparison.diff.damage)}
            toneClass={getDiffTone(comparison.diff.damage)}
          />
          <StatCard
            label="Mi KDA"
            value={`${comparison.me.kills}/${comparison.me.deaths}/${comparison.me.assists} (${comparison.me.kda})`}
          />
          <StatCard
            label="Rival KDA"
            value={`${comparison.enemy.kills}/${comparison.enemy.deaths}/${comparison.enemy.assists} (${comparison.enemy.kda})`}
          />
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--bg-elevated)] p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Lectura del matchup
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            {comparison.verdicts.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  function RecommendationCard({
    item,
    onDismiss,
  }: {
    item: RecommendedItem;
    onDismiss: (itemId: number) => void;
  }) {
    const priorityTone =
      item.priority === 'alta'
        ? 'text-red-300'
        : item.priority === 'media'
        ? 'text-yellow-300'
        : 'text-slate-300';

    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
        <div className="flex items-center gap-3">
          <img
            src={getItemImage(item.itemId)}
            alt={item.name}
            className="h-12 w-12 rounded-lg border border-[var(--border-default)] object-cover"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
              <span className={`text-xs font-semibold uppercase ${priorityTone}`}>
                prioridad {item.priority}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {item.why}
            </p>
            {!!item.counters?.length && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Counter de: {item.counters.join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={() => onDismiss(item.itemId)}
            className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition hover:bg-black/20"
          >
            Descartar
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell">
      <div className="pointer-events-none absolute inset-0 bg-[var(--gradient-glow)]" />

      <div className="page-container">
        <BackButton />

        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(120deg,rgba(59,130,246,0.14),rgba(14,14,14,0.85)_40%,rgba(168,85,247,0.12))] p-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Coach IA en Vivo
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Recomendaciones dinámicas de compra, reemplazo y lectura del enemigo en tiempo real.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--border-default)] bg-black/30 px-3 py-1 text-[var(--text-secondary)]">
                Auto-refresh: {refreshCountdown}s
              </span>
              {backgroundRefreshing ? (
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-200">
                  Actualizando análisis...
                </span>
              ) : null}
              {lastRefreshAt ? (
                <span className="rounded-full border border-[var(--border-default)] bg-black/30 px-3 py-1 text-[var(--text-muted)]">
                  Última lectura: {new Date(lastRefreshAt).toLocaleTimeString()}
                </span>
              ) : null}
            </div>
          </div>

          <button
            onClick={() => loadAnalysis(mode, targetRiotId, preferredRole, { silent: true })}
            disabled={loading}
            className="rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
          >
            {loading ? 'Analizando...' : 'Refrescar ahora'}
          </button>
        </div>

        <div className="mt-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-xl">
          <div className="grid gap-4 lg:grid-cols-4">
            <button
              onClick={() => {
                setMode('lane');
                setTargetRiotId('');
                loadAnalysis('lane', '', preferredRole);
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                mode === 'lane'
                  ? 'bg-[var(--accent-primary)] text-white shadow-lg'
                  : 'border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
              }`}
            >
              Mi línea
            </button>

            <button
              onClick={() => {
                setMode('team');
                setTargetRiotId('');
                loadAnalysis('team', '', preferredRole);
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                mode === 'team'
                  ? 'bg-[var(--accent-primary)] text-white shadow-lg'
                  : 'border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
              }`}
            >
              Team enemigo
            </button>

            <select
              value={targetRiotId}
              onChange={(e) => {
                const next = e.target.value;
                setTargetRiotId(next);
                setMode('player');
                loadAnalysis('player', next, preferredRole);
              }}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]"
            >
              <option value="">Selecciona enemigo</option>
              {enemyOptions.map((enemy) => (
                <option key={enemy.riotId} value={enemy.riotId}>
                  {enemy.riotId} · {enemy.championName} · {enemy.position}
                </option>
              ))}
            </select>

            <select
              value={preferredRole}
              onChange={(e) => {
                const next = e.target.value as Role;
                setPreferredRole(next);
                if (mode === 'lane') {
                  loadAnalysis('lane', '', next);
                }
              }}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]"
            >
              <option value="TOP">Top</option>
              <option value="JUNGLE">Jungla</option>
              <option value="MIDDLE">Mid</option>
              <option value="BOTTOM">ADC</option>
              <option value="UTILITY">Support</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="mt-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8">
            <p className="text-sm text-[var(--text-secondary)]">Analizando partida...</p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-blue-400/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Coach en tiempo real
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                      data.coach?.status === 'ahead'
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : data.coach?.status === 'behind'
                        ? 'bg-red-500/20 text-red-200'
                        : 'bg-yellow-500/20 text-yellow-200'
                    }`}
                  >
                    {data.coach?.status === 'ahead'
                      ? 'Ventaja'
                      : data.coach?.status === 'behind'
                      ? 'Desventaja'
                      : 'Parejo'}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Ahora mismo</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
                      {(data.coach?.now || []).map((tip, idx) => (
                        <li key={idx}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Siguiente compra</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
                      {(data.coach?.nextBuy || []).length ? (
                        (data.coach?.nextBuy || []).map((tip, idx) => <li key={idx}>• {tip}</li>)
                      ) : (
                        <li>• Sin compra forzada todavía: espera más información.</li>
                      )}
                    </ul>
                  </div>
                </div>
                
                {!!data.coach?.replaceNow?.length && (
                  <div className="mt-4 rounded-2xl bg-[var(--bg-elevated)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Cambios inmediatos sugeridos
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
                      {data.coach.replaceNow.map((tip, idx) => (
                        <li key={idx}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Tu campeón
                </h2>

                <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-[var(--bg-elevated)] p-5 md:flex-row md:items-center">
                  <img
                    src={getChampionImageByName(data.me?.championName)}
                    alt={data.me?.championName}
                    className="h-20 w-20 rounded-2xl border border-[var(--border-default)] object-cover"
                  />

                  <div className="flex-1">
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {data.me?.riotId}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {data.me?.championName} · {data.me?.position}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Clase: {data.me?.championClass || 'unknown'}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Detectado por el juego: {data.me?.detectedPosition || 'NONE'}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      KDA: {data.me?.scores?.kills ?? 0}/{data.me?.scores?.deaths ?? 0}/{data.me?.scores?.assists ?? 0}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      CS: {data.me?.scores?.creepScore ?? 0} · Visión: {Math.round(data.me?.scores?.wardScore ?? 0)}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Oro: {formatMaybeNumber(data.me?.scores?.gold)} · Daño: {formatMaybeNumber(data.me?.scores?.damage)}
                    </p>
                  </div>

                  {extractKeystoneId(data.me?.runes) &&
                    runeMap[extractKeystoneId(data.me?.runes)] && (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={runeMap[extractKeystoneId(data.me?.runes)]?.icon}
                          alt={runeMap[extractKeystoneId(data.me?.runes)]?.name}
                          className="h-14 w-14 rounded-xl border border-[var(--border-default)] bg-black/20 p-1"
                        />
                        <span className="max-w-[90px] text-center text-xs text-[var(--text-muted)]">
                          {runeMap[extractKeystoneId(data.me?.runes)]?.name}
                        </span>
                      </div>
                    )}
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                    Tus items actuales
                  </p>
                  {renderItemGrid(data.me?.items)}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Resumen del análisis
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {data.analysisSummary}
                </p>

                {!!data.enemySignals?.length && (
                  <div className="mt-5 rounded-2xl bg-[var(--bg-elevated)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Señales detectadas
                    </h3>
                    <div className="mt-3 space-y-2">
                      {data.enemySignals.map((signal) => (
                        <div
                          key={`${signal.tag}-${signal.sourceItem}`}
                          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2"
                        >
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {signal.sourceItem} · prioridad {signal.severity}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {signal.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!!data.adaptiveTips?.length && (
                  <div className="mt-5 rounded-2xl bg-[var(--bg-elevated)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Tips adaptativos
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      {data.adaptiveTips.map((tip, index) => (
                        <li key={index}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {!!data.matchupComparisons?.length && (
                <div className="space-y-6">
                  {data.matchupComparisons.map((comparison, index) =>
                    renderComparisonCard(comparison, index)
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Counter recomendado
                  </h2>
                  {!!dismissedItemIds.length && (
                    <button
                      onClick={() => setDismissedItemIds([])}
                      className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-black/20"
                    >
                      Restablecer descartados
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  {(data.recommendations || []).map((rec) => (
                    <div
                      key={rec.key}
                      className="rounded-2xl bg-[var(--bg-elevated)] p-4"
                    >
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {rec.title}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {rec.reason}
                      </p>

                      <div className="mt-4 space-y-3">
                        {(rec.items || [])
                          .filter((item) => !dismissedItemIds.includes(item.itemId))
                          .map((item) => (
                            <RecommendationCard
                              key={`${rec.key}-${item.itemId}`}
                              item={item}
                              onDismiss={(itemId) =>
                                setDismissedItemIds((prev) =>
                                  prev.includes(itemId) ? prev : [...prev, itemId]
                                )
                              }
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Enemigos analizados
                </h2>

                <div className="mt-4 space-y-4">
                  {(data.targets || []).map((target, index) => (
                    <div
                      key={`${target.riotId}-${index}`}
                      className="rounded-2xl bg-[var(--bg-elevated)] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={getChampionImageByName(target.championName)}
                          alt={target.championName}
                          className="h-14 w-14 rounded-xl border border-[var(--border-default)] object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-[var(--text-primary)]">
                            {target.riotId}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {target.championName} · {target.position}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Build: {target.enemyProfile?.buildType?.toUpperCase()} · Daño: {target.enemyProfile?.damageType}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                        <div className="rounded-xl bg-[var(--bg-card)] p-3">
                          KDA: {target.scores?.kills ?? 0}/{target.scores?.deaths ?? 0}/{target.scores?.assists ?? 0}
                        </div>
                        <div className="rounded-xl bg-[var(--bg-card)] p-3">
                          CS: {target.scores?.creepScore ?? 0}
                        </div>
                        <div className="rounded-xl bg-[var(--bg-card)] p-3">
                          Visión: {Math.round(target.scores?.wardScore ?? 0)}
                        </div>
                        <div className="rounded-xl bg-[var(--bg-card)] p-3">
                          Nivel: {target.level ?? 1}
                        </div>
                        <div className="rounded-xl bg-[var(--bg-card)] p-3">
                          Oro: {formatMaybeNumber(target.scores?.gold)}
                        </div>
                        <div className="rounded-xl bg-[var(--bg-card)] p-3">
                          Daño: {formatMaybeNumber(target.scores?.damage)}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                          Items detectados
                        </p>
                        {renderItemGrid(target.items)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Build advice
                </h2>

                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Items que podrías vender
                    </h3>
                    {data.buildAdvice?.sellCandidates?.length ? (
                      <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                        {data.buildAdvice.sellCandidates.map((item, index) => (
                          <li key={`${item.item}-${index}`}>
                            • <span className="font-medium">{item.item}</span>: {item.reason}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        No hay candidatos claros para vender por ahora.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Items que están decayendo
                    </h3>
                    {data.buildAdvice?.decayCandidates?.length ? (
                      <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                        {data.buildAdvice.decayCandidates.map((item, index) => (
                          <div
                            key={`${item.item}-${index}`}
                            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3"
                          >
                            <p className="font-medium text-[var(--text-primary)]">
                              {item.item} <span className="text-xs text-[var(--text-muted)]">(slot {item.slot})</span>
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        Tu inventario aún mantiene buen valor situacional.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Reemplazos sugeridos
                    </h3>
                    {data.buildAdvice?.replaceSuggestions?.length ? (
                      <div className="mt-3 space-y-3">
                        {data.buildAdvice.replaceSuggestions.map((item, index) => (
                          <div
                            key={`${item.sell}-${item.buy}-${index}`}
                            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3"
                          >
                            <div className="flex items-center gap-3">
                              {item.buyItemId ? (
                                <img
                                  src={getItemImage(item.buyItemId)}
                                  alt={item.buy}
                                  className="h-10 w-10 rounded-lg border border-[var(--border-default)] object-cover"
                                />
                              ) : null}
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">
                                  Vende {item.sell} por {item.buy}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {item.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        No hay reemplazos urgentes por ahora.
                      </p>
                    )}
                  </div>

                  {!!data.buildAdvice?.fullBuildTips?.length && (
                    <div className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Notas del sistema
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                        {data.buildAdvice.fullBuildTips.map((tip, index) => (
                          <li key={index}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!data.coach?.watchEnemy?.length && (
                    <div className="rounded-2xl bg-[var(--bg-elevated)] p-4">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Qué está mostrando el enemigo
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                        {data.coach.watchEnemy.map((tip, index) => (
                          <li key={index}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
