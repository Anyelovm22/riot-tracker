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
                  <div key={index} className="rounded-xl bg-[var(--bg-elevated)] p-4">
                    <p className="text-sm text-[var(--text-secondary)]">
                      {build.games} partidas · WR {build.winRate}%
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(build.items || []).map((item: any) => (
                        <img
                          key={`${index}-${item.itemId}`}
                          src={getItemIconUrl(ddragonVersion, item.itemId)}
                          title={item.name}
                          className="h-10 w-10 rounded-md border border-[var(--border-default)]"
                        />
                      ))}
                    </div>
                  </div>
                ))}
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
