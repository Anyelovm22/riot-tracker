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
  const [roleFilter, setRoleFilter] = useState('');
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
  const roleOptions = useMemo<string[]>(
    () =>
      Array.from(
        new Set<string>(
          (data?.proMatches || [])
            .map((match: any) => String(match.role || '').trim())
            .filter(Boolean)
        )
      ),
    [data]
  );
  const filteredMatches = useMemo(
    () =>
      (data?.proMatches || []).filter((match: any) =>
        roleFilter ? match.role === roleFilter : true
      ),
    [data, roleFilter]
  );

  return (
    <main className="page-shell">
      <div className="page-container space-y-6">
        <BackButton />

        <section className="rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(110deg,rgba(16,185,129,0.14),rgba(9,9,11,0.92)_35%,rgba(59,130,246,0.2))] p-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{decodedChampion} · Pro Build Lab</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Partidas high elo, variantes de builds, runas y spells más usados por jugadores top.
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
              Actualizar Pro Build Lab
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

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Items más frecuentes</h3>
                <div className="mt-3 space-y-2">
                  {(data.recommendedItems || []).slice(0, 8).map((item: any) => (
                    <div key={item.itemId} className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={getItemIconUrl(ddragonVersion, item.itemId)}
                          title={item.name}
                          className="h-7 w-7 rounded-md border border-[var(--border-default)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">{item.name}</span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">{item.count} games</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Runas más usadas</h3>
                <div className="mt-3 space-y-2">
                  {(data.topRunePages || []).map((rune: any, index: number) => (
                    <div key={`${rune.primaryStyleId}-${rune.secondaryStyleId}-${index}`} className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-sm">
                      <p className="text-[var(--text-primary)]">
                        Primaria {rune.primaryStyleId || 'N/A'} · Secundaria {rune.secondaryStyleId || 'N/A'}
                      </p>
                      <p className="text-[var(--text-secondary)]">{rune.games} games · WR {rune.winRate}%</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Hechizos de invocador</h3>
                <div className="mt-3 space-y-2">
                  {(data.topSummonerSpells || []).map((spell: any, index: number) => (
                    <div key={`${spell.spells?.join('-')}-${index}`} className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-sm">
                      <p className="text-[var(--text-primary)]">Spells: {(spell.spells || []).join(' + ') || 'N/A'}</p>
                      <p className="text-[var(--text-secondary)]">{spell.games} games · WR {spell.winRate}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Partidas recientes high elo</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">Filtrar rol:</span>
                <button
                  onClick={() => setRoleFilter('')}
                  className={`rounded-lg px-3 py-1 text-xs ${!roleFilter ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}
                >
                  Todos
                </button>
                {roleOptions.map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`rounded-lg px-3 py-1 text-xs ${roleFilter === role ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <div className="mt-3 space-y-3">
                {filteredMatches.map((match: any) => (
                  <div key={match.matchId} className="rounded-xl bg-[var(--bg-elevated)] p-4 text-sm">
                    <p className="font-medium text-[var(--text-primary)]">
                      {match.proPlayer} · {match.role} · VS {match.opponentChampion}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      KDA {match.kda} · CS {match.cs} · LP {match.leaguePoints} · {match.queueLabel}
                    </p>
                    <p className={`${match.win ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {match.win ? 'Victoria' : 'Derrota'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(match.items || []).map((itemId: number) => (
                        <img
                          key={`${match.matchId}-${itemId}`}
                          src={getItemIconUrl(ddragonVersion, itemId)}
                          className="h-8 w-8 rounded-md border border-[var(--border-default)]"
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
