import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import BackButton from '../components/common/BackButton';
import { fetchChampions } from '../services/champions';
import { fetchChampionBuildInsights } from '../services/builds';
import { readStoredProfile } from '../utils/profileStorage';
import { getItemIconUrl, getLatestDdragonVersion } from '../utils/ddragonVersion';

export default function ChampionBuildsPage() {
  const { championName = '' } = useParams();
  const profile = readStoredProfile();
  const [champions, setChampions] = useState<any[]>([]);
  const [versusChampion, setVersusChampion] = useState('');
  const [data, setData] = useState<any>(null);
  const [ddragonVersion, setDdragonVersion] = useState('15.7.1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [versusInput, setVersusInput] = useState('');
  const requestIdRef = useRef(0);

  const decodedChampion = decodeURIComponent(championName);

  useEffect(() => {
    getLatestDdragonVersion().then(setDdragonVersion);
    fetchChampions()
      .then((response) => setChampions(response?.champions || []))
      .catch(() => setChampions([]));
  }, []);

  async function loadInsights(nextVersus?: string) {
    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;
    try {
      setLoading(true);
      setError('');
      const selectedVersus = (nextVersus || '').trim();
      const result = await fetchChampionBuildInsights({
        champion: decodedChampion,
        platform: profile?.resolvedPlatform || 'la1',
        versusChampion: selectedVersus  || undefined,
      });

      if (requestIdRef.current !== nextRequestId) {
        return;
      }
      setData(result);
      setVersusChampion(selectedVersus);
      setVersusInput(selectedVersus);
    } catch (err: any) {
      if (requestIdRef.current !== nextRequestId) {
        return;
      }
      setError(err?.response?.data?.message || 'No se pudo cargar el análisis de builds');
    } finally {
      if (requestIdRef.current === nextRequestId) {
        setLoading(false);
      }
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!decodedChampion) return;
    setVersusInput('');
    setVersusChampion('');
    loadInsights('');
  }, [decodedChampion]);

  const championOptions = useMemo(() => champions.map((champ: any) => champ.name), [champions]);
  const filteredChampionOptions = useMemo(() => {
    const normalizedQuery = versusInput.trim().toLowerCase();
    if (!normalizedQuery) return championOptions.slice(0, 40);

    return championOptions
      .filter((name) => name.toLowerCase().includes(normalizedQuery))
      .slice(0, 40);
  }, [championOptions, versusInput]);
  const maxRoleGames = Math.max(1, ...(data?.roleStats || []).map((row: any) => row.games || 0));
  const maxMatchupGames = Math.max(1, ...(data?.topMatchups || []).map((row: any) => row.games || 0));
  const maxBuildGames = Math.max(1, ...(data?.topBuilds || []).map((build: any) => build.games || 0));
  const buildWinrateChart = useMemo(
    () =>
      (data?.topBuilds || []).map((build: any, index: number) => ({
        name: `Build ${index + 1}`,
        winRate: build.winRate,
        games: build.games,
      })),
    [data]
  );

  return (
    <main className="page-shell">
      <div className="page-container space-y-6">
        <BackButton />

        <section className="rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(110deg,rgba(16,185,129,0.14),rgba(9,9,11,0.92)_35%,rgba(59,130,246,0.2))] p-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{decodedChampion} · Pro Build Lab</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Builds por campeón con winrate por composición, runas e información de matchups en high elo.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
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
            <button
              onClick={() => loadInsights(versusInput)}
              className="h-fit self-end rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Aplicar VS
            </button>
          </div>
        </section>

        {loading ? <div className="rounded-2xl bg-[var(--bg-card)] p-6">Cargando datos de pro players...</div> : null}
        {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">{error}</div> : null}

        {!loading && !error && data ? (
          <>
            {data?.appliedFallback ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                {data.fallbackReason}
              </div>
            ) : null}

            <section className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                <p className="text-xs uppercase text-[var(--text-muted)]">Campeón</p>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{data.champion}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                <p className="text-xs uppercase text-[var(--text-muted)]">Sample size</p>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{data.sampleSize || 0}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                <p className="text-xs uppercase text-[var(--text-muted)]">Filtro VS</p>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{versusChampion || 'Todos'}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                <p className="text-xs uppercase text-[var(--text-muted)]">Última actualización</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {data?.cacheMeta?.generatedAt
                    ? new Date(data.cacheMeta.generatedAt).toLocaleString()
                    : 'En vivo'}
                </p>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Builds más jugadas</h2>
                <div className="mt-4 space-y-3">
                  {(data.topBuilds || []).map((build: any, index: number) => (
                    <div
                      key={index}
                      className="rounded-xl border border-[var(--border-default)] bg-[linear-gradient(130deg,rgba(59,130,246,0.14),rgba(9,9,11,0.88)_45%,rgba(16,185,129,0.12))] p-4 shadow-lg shadow-black/10"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-[var(--text-secondary)]">
                          {build.games} partidas · WR {build.winRate}%
                        </p>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                          Build #{index + 1}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${Math.max(10, (build.games / maxBuildGames) * 100)}%` }}
                        />
                        </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(build.items || []).map((item: any) => (
                          <img
                            key={`${index}-${item.itemId}`}
                            src={getItemIconUrl(ddragonVersion, item.itemId)}
                            title={item.name}
                            className="h-10 w-10 rounded-md border border-[var(--border-default)]"
                            loading="lazy"
                            decoding="async"
                          />
                        ))}
                      </div>
                    </div>
                   ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Winrate por build</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Comparación de WR y volumen de partidas por build.</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buildWinrateChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip
                        formatter={(value: any, key: any) =>
                          key === 'winRate' ? [`${value}%`, 'Win rate'] : [value, 'Partidas']
                        }
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          background: '#0b1120',
                        }}
                      />
                      <Bar dataKey="winRate" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Items recomendados</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Frecuencia total en partidas high elo del campeón.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(data.recommendedItems || []).map((item: any) => (
                    <div key={`recommended-${item.itemId}`} className="group relative">
                      <img
                        src={getItemIconUrl(ddragonVersion, item.itemId)}
                        title={`${item.name} · ${item.count} partidas`}
                        className="h-11 w-11 rounded-md border border-[var(--border-default)]"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="absolute -bottom-2 -right-2 rounded-full bg-[var(--accent-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Runas más usadas</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Setup primario/secundario + keystone.</p>
                <div className="mt-4 space-y-2">
                  {(data.topRunes || []).map((rune: any, index: number) => (
                    <div key={`rune-${index}`} className="rounded-lg bg-[var(--bg-elevated)] p-3 text-sm">
                      <p className="font-medium text-[var(--text-primary)]">
                        Keystone {rune.keystone} · Style {rune.primaryStyle}/{rune.subStyle}
                      </p>
                      <p className="text-[var(--text-secondary)]">
                        {rune.games} partidas · WR {rune.winRate}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Gráfica por línea</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Distribución de partidas por rol (línea).</p>
                <div className="mt-4 space-y-3">
                  {(data.roleStats || []).map((row: any) => (
                    <div key={`role-${row.role}`}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">{row.role}</span>
                        <span className="text-[var(--text-secondary)]">
                          {row.games} partidas · WR {row.winRate}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          style={{ width: `${Math.max(8, (row.games / maxRoleGames) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Gráfica de matchups de línea</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Rivales más frecuentes en línea.</p>
                <div className="mt-4 space-y-3">
                  {(data.topMatchups || []).map((row: any) => (
                    <div key={`matchup-${row.championName}`}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">{row.championName}</span>
                        <span className="text-[var(--text-secondary)]">
                          {row.games} partidas · WR {row.winRate}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          style={{ width: `${Math.max(8, (row.games / maxMatchupGames) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
