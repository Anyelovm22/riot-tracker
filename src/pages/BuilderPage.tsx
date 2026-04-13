import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import { fetchChampions } from '../services/champions';

export default function BuilderPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [champions, setChampions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const result = await fetchChampions();
        setChampions(result?.champions || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'No se pudo cargar el catálogo de campeones');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return champions;
    const query = search.toLowerCase();
    return champions.filter((champion: any) => champion?.name?.toLowerCase().includes(query));
  }, [champions, search]);

  return (
    <main className="page-shell">
      <div className="page-container space-y-6">
        <BackButton />
        <section className="rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(120deg,rgba(16,185,129,0.16),rgba(14,14,14,0.88)_40%,rgba(37,99,235,0.14))] p-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Build Center</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Elige cualquier campeón para abrir su laboratorio de builds con partidas high elo, core builds y recomendación por matchup.
          </p>
          <div className="mt-4 max-w-md">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar campeón..."
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)]"
            />
          </div>
        </section>

        {loading ? <div className="rounded-2xl bg-[var(--bg-card)] p-6">Cargando campeones...</div> : null}
        {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">{error}</div> : null}

        {!loading && !error ? (
          <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((champ: any) => (
              <button
                key={champ.id}
                onClick={() => navigate(`/builds/${encodeURIComponent(champ.name)}`)}
                className="group rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-[var(--bg-elevated)]"
              >
                <p className="font-semibold text-[var(--text-primary)]">{champ.name}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{champ.title}</p>
                <p className="mt-3 text-xs font-medium text-emerald-300">Abrir análisis de build →</p>
              </button>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
