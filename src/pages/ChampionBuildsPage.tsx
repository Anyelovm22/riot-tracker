import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
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

  const decodedChampion = decodeURIComponent(championName);

  useEffect(() => {
    getLatestDdragonVersion().then(setDdragonVersion);
    fetchChampions()
      .then((response) => setChampions(response?.champions || []))
      .catch(() => setChampions([]));
  }, []);

  async function loadInsights(nextVersus?: string) {
    try {
      setLoading(true);
      setError('');
      const result = await fetchChampionBuildInsights({
        champion: decodedChampion,
        platform: profile?.resolvedPlatform || 'la1',
        versusChampion: nextVersus || undefined,
      });
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo cargar el análisis de builds');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!decodedChampion) return;
    loadInsights();
  }, [decodedChampion]);

  const championOptions = useMemo(() => champions.map((champ: any) => champ.name), [champions]);
  const maxRoleGames = Math.max(1, ...(data?.roleStats || []).map((row: any) => row.games || 0));
  const maxMatchupGames = Math.max(1, ...(data?.topMatchups || []).map((row: any) => row.games || 0));
  const maxBuildGames = Math.max(1, ...(data?.topBuilds || []).map((build: any) => build.games || 0));

  return (
    <main className="page-shell">
      <div className="page-container space-y-6">
        <BackButton />

        <section className="rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(110deg,rgba(16,185,129,0.14),rgba(9,9,11,0.92)_35%,rgba(59,130,246,0.2))] p-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{decodedChampion} · Pro Build Lab</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Partidas recientes de high elo, builds más jugadas y recomendación por rival.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Rival de línea (opcional)</label>
              <select
                value={versusChampion}
                onChange={(e) => setVersusChampion(e.target.value)}
                className="mt-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                <option value="">Todos los rivales</option>
                {championOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => loadInsights(versusChampion)}
              className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Actualizar recomendación
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

            <section className="grid gap-4 sm:grid-cols-3">
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
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{data.versusChampion || 'Todos'}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Builds más jugadas</h2>
              <div className="mt-4 space-y-3">
                {(data.topBuilds || []).map((build: any, index: number) => (
                  <div key={index} className="rounded-xl border border-[var(--border-default)] bg-[linear-gradient(130deg,rgba(59,130,246,0.14),rgba(9,9,11,0.88)_45%,rgba(16,185,129,0.12))] p-4 shadow-lg shadow-black/10">
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

            <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Partidas recientes high elo</h2>
              <div className="mt-3 space-y-3">
                {(data.proMatches || []).map((match: any) => (
                  <div key={match.matchId} className="rounded-xl bg-[var(--bg-elevated)] p-4 text-sm">
                    <p className="font-medium text-[var(--text-primary)]">
                      {match.proPlayer} · {match.role} · VS {match.opponentChampion}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      KDA {match.kda} · LP {match.leaguePoints} · {match.win ? 'Victoria' : 'Derrota'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(match.items || []).map((itemId: number) => (
                        <img
                          key={`${match.matchId}-${itemId}`}
                          src={getItemIconUrl(ddragonVersion, itemId)}
                          className="h-8 w-8 rounded border border-[var(--border-default)]"
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
