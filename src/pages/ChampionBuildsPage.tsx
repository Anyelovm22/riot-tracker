import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import { fetchChampions } from '../services/champions';
import { fetchChampionBuildInsights, fetchChampionBuildSummary } from '../services/builds';
import { getItemIconUrl, getLatestDdragonVersion } from '../utils/ddragonVersion';

const BuildWinrateChart = lazy(() => import('../components/builds/BuildWinrateChart'));

export default function ChampionBuildsPage() {
  const { championName = '' } = useParams();
  const [champions, setChampions] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [ddragonVersion, setDdragonVersion] = useState('15.7.1');
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [versusInput, setVersusInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('MIDDLE');
  const [selectedPlatform, setSelectedPlatform] = useState('la1');
  const [selectedRank, setSelectedRank] = useState('ALL');
  const [selectedPatch, setSelectedPatch] = useState('latest');
  const requestIdRef = useRef(0);
  const initialLoadKeyRef = useRef('');

  const decodedChampion = decodeURIComponent(championName);

  useEffect(() => {
    getLatestDdragonVersion().then(setDdragonVersion);
    fetchChampions()
      .then((response) => setChampions(response?.champions || []))
      .catch(() => setChampions([]));
  }, []);

  const loadDetailsDeferred = (params: any, requestId: number) => {
    const run = () => {
      setLoadingDetails(true);
      fetchChampionBuildInsights(params)
        .then((result) => {
          if (requestIdRef.current !== requestId) return;
          setDetailsData(result);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setDetailsData(null);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) {
            setLoadingDetails(false);
          }
        });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(run, { timeout: 900 });
      return;
    }

    setTimeout(run, 80);
  };

  async function loadInsights(nextVersus?: string) {
    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;

    const selectedVersus = (nextVersus || '').trim();
    const sharedParams = {
      champion: decodedChampion,
      platform: selectedPlatform,
      versusChampion: selectedVersus || undefined,
      role: selectedRole,
      rank: selectedRank,
      patch: selectedPatch,
    };

    try {
      setLoadingSummary(true);
      setLoadingDetails(false);
      setError('');
      setDetailsData(null);

      const summaryResult = await fetchChampionBuildSummary(sharedParams);
      if (requestIdRef.current !== nextRequestId) return;

      setSummaryData(summaryResult);
      setVersusInput(selectedVersus);
      loadDetailsDeferred(sharedParams, nextRequestId);
    } catch (err: any) {
      if (requestIdRef.current !== nextRequestId) return;
      setError(err?.response?.data?.message || 'No se pudo cargar el análisis de builds');
    } finally {
      if (requestIdRef.current === nextRequestId) {
        setLoadingSummary(false);
      }
    }
  }

  useEffect(() => {
    if (!decodedChampion) return;
    const initialLoadKey = `${decodedChampion}:${selectedPlatform}:${selectedRole}:${selectedRank}:${selectedPatch}`;
    if (initialLoadKeyRef.current === initialLoadKey) return;
    initialLoadKeyRef.current = initialLoadKey;
    setVersusInput('');
    loadInsights('');
  }, [decodedChampion, selectedPlatform, selectedRole, selectedRank, selectedPatch]);

  const championOptions = useMemo(() => champions.map((champ: any) => champ.name), [champions]);
  const filteredChampionOptions = useMemo(() => {
    const normalizedQuery = versusInput.trim().toLowerCase();
    if (!normalizedQuery) return championOptions.slice(0, 40);

    return championOptions.filter((name) => name.toLowerCase().includes(normalizedQuery)).slice(0, 40);
  }, [championOptions, versusInput]);

  const data = detailsData || summaryData;
  const maxRoleGames = Math.max(1, ...(data?.charts?.roleDistribution?.values || [0]));
  const maxMatchupGames = Math.max(1, ...((detailsData?.secondary?.matchups || []).map((row: any) => row.games || 0)));

  return (
    <main className="page-shell">
      <div className="page-container space-y-6">
        <BackButton />

        <section className="rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(110deg,rgba(16,185,129,0.14),rgba(9,9,11,0.92)_35%,rgba(59,130,246,0.2))] p-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{decodedChampion} · Pro Build Lab</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Build principal, runas y métricas agregadas de alto elo por parche.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Rol</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]">
                <option value="TOP">Top</option>
                <option value="JUNGLE">Jungle</option>
                <option value="MIDDLE">Mid</option>
                <option value="BOTTOM">ADC</option>
                <option value="UTILITY">Support</option>
                <option value="ALL">Todos</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Región</label>
              <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]">
                <option value="la1">LAN</option>
                <option value="la2">LAS</option>
                <option value="na1">NA</option>
                <option value="euw1">EUW</option>
                <option value="eun1">EUNE</option>
                <option value="kr">KR</option>
                <option value="jp1">JP</option>
                <option value="br1">BR</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Elo</label>
              <select value={selectedRank} onChange={(e) => setSelectedRank(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]">
                <option value="ALL">Todos</option>
                <option value="CHALLENGER">Challenger</option>
                <option value="GRANDMASTER">Grandmaster</option>
                <option value="MASTER">Master</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Patch</label>
              <input value={selectedPatch} onChange={(e) => setSelectedPatch(e.target.value || 'latest')} placeholder="latest o 16.7" className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]" />
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Buscar matchup VS campeón</label>
              <input
                list="champion-vs-options"
                value={versusInput}
                onChange={(e) => setVersusInput(e.target.value)}
                placeholder="Ej: Graves, Viego, Ahri..."
                className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <datalist id="champion-vs-options">
                {filteredChampionOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <button onClick={() => loadInsights(versusInput)} className="h-fit self-end rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white">
              Aplicar VS
            </button>
          </div>
        </section>

        {loadingSummary ? (
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="mt-3 h-6 w-24 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : null}

        {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">{error}</div> : null}

        {!loadingSummary && !error && data ? (
          <>
            {data?.appliedFallback ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">{data.fallbackReason}</div> : null}

            <section className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"><p className="text-xs uppercase text-[var(--text-muted)]">Winrate</p><p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{data.winRate}%</p></div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"><p className="text-xs uppercase text-[var(--text-muted)]">Pickrate</p><p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{data.pickRate}%</p></div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"><p className="text-xs uppercase text-[var(--text-muted)]">Sample size</p><p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{data.sampleSize || 0}</p></div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"><p className="text-xs uppercase text-[var(--text-muted)]">Patch / Región</p><p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{data.patch} · {data.region}</p></div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Build principal</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{data?.overview?.primaryBuild?.games || 0} partidas · WR {data?.overview?.primaryBuild?.winRate || 0}%</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data?.overview?.primaryBuild?.items || []).map((item: any) => (
                    <img key={`primary-${item.itemId}`} src={getItemIconUrl(ddragonVersion, item.itemId)} title={item.name} className="h-10 w-10 rounded-md border border-[var(--border-default)]" loading="lazy" decoding="async" />
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-secondary)]">Skill order más jugado: {(data?.overview?.skillOrder || []).join(' > ') || '-'}</div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Items por posición</h2>
                <div className="mt-3 space-y-3 text-xs">
                  {Object.entries(data?.itemStats?.bySlot || {}).map(([slot, items]: [string, any]) => (
                    <div key={slot}>
                      <p className="mb-1 font-medium uppercase text-[var(--text-muted)]">{slot}</p>
                      <div className="flex flex-wrap gap-2">
                        {(items || []).slice(0, 5).map((item: any) => (
                          <div key={`${slot}-${item.itemId}`} className="relative">
                            <img src={getItemIconUrl(ddragonVersion, item.itemId)} title={`${item.name} · WR ${item.winRate}%`} className="h-9 w-9 rounded-md border border-[var(--border-default)]" loading="lazy" decoding="async" />
                            {!item.sampleQualified ? <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 px-1 text-[9px] text-black">!</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Builds más populares</h2>
                <div className="mt-3 space-y-2">
                  {(data?.builds?.mostPopular || []).map((build: any, index: number) => (
                    <div key={`popular-${index}`} className="rounded-lg bg-[var(--bg-elevated)] p-3 text-xs">
                      <p className="text-[var(--text-secondary)]">{build.games} partidas · WR {build.winRate}% · Pick {build.popularity}% {!build.sampleQualified ? '· muestra baja' : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Builds con mejor performance</h2>
                <div className="mt-3 space-y-2">
                  {(data?.builds?.bestPerformance || []).map((build: any, index: number) => (
                    <div key={`best-${index}`} className="rounded-lg bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-secondary)]">{build.games} partidas · WR {build.winRate}%</div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Winrate por build</h2>
                <div className="mt-4 h-72">
                  <Suspense fallback={<div className="h-full animate-pulse rounded-lg bg-white/5" />}>
                    <BuildWinrateChart
                      labels={data?.charts?.buildWinrate?.labels || []}
                      percentages={data?.charts?.buildWinrate?.percentages || []}
                      values={data?.charts?.buildWinrate?.values || []}
                    />
                  </Suspense>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Distribución por rol</h2>
                <div className="mt-4 space-y-3">
                  {(data?.charts?.roleDistribution?.labels || []).map((label: string, index: number) => {
                    const games = data?.charts?.roleDistribution?.values?.[index] || 0;
                    const wr = data?.charts?.roleDistribution?.percentages?.[index] || 0;
                    return (
                      <div key={`role-${label}`}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--text-primary)]">{label}</span>
                          <span className="text-[var(--text-secondary)]">{games} partidas · WR {wr}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${Math.max(8, (games / maxRoleGames) * 100)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {loadingDetails ? (
              <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <div className="h-4 w-44 animate-pulse rounded bg-white/10" />
              </section>
            ) : null}

            {!loadingDetails && detailsData ? (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Matchups frecuentes</h2>
                  <div className="mt-4 space-y-3">
                    {(detailsData?.secondary?.matchups || []).map((row: any) => (
                      <div key={`matchup-${row.championName}`}>
                        <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium text-[var(--text-primary)]">{row.championName}</span><span className="text-[var(--text-secondary)]">{row.games} partidas · WR {row.winRate}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.max(8, (row.games / maxMatchupGames) * 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Counters (muestra mínima)</h2>
                  <div className="mt-3 space-y-2">
                    {(detailsData?.secondary?.counters || []).map((row: any) => (
                      <div key={`counter-${row.championName}`} className="rounded-lg bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-secondary)]">{row.championName} · {row.games} partidas · WR {row.winRate}%</div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
