import { useEffect, useState, useMemo } from 'react';
import BackButton from '../components/common/BackButton';
import { fetchChampions } from '../services/champions';
import { useNavigate } from 'react-router-dom';

export default function ChampionPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');

        const result = await fetchChampions();
        setData(result);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'No se pudo cargar champions');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredChampions = useMemo(() => {
    if (!data?.champions) return [];
    if (!search.trim()) return data.champions;
    
    const query = search.toLowerCase();
    return data.champions.filter((champ: any) => 
      champ.name.toLowerCase().includes(query) || 
      champ.title.toLowerCase().includes(query)
    );
  }, [data?.champions, search]);

  return (
    <main className="page-shell">
      <div className="pointer-events-none absolute inset-0 bg-[var(--gradient-glow)]" />
      
      <div className="page-container">
        <BackButton />

        {/* Header */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/25">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">Catalogo de Campeones</h1>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Explora todos los campeones disponibles en League of Legends.
            </p>
          </div>

          {data?.champions && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-card)] px-4 py-2 border border-[var(--border-default)]">
              <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{data.champions.length}</span> campeones
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        {!loading && !error && data?.champions && (
          <div className="mt-8">
            <div className="relative max-w-md">
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar campeon..."
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-3 pl-12 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Cargando campeones...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/20">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-red-300">Error al cargar</h3>
              <p className="mt-1 text-sm text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Champions Grid */}
        {!loading && !error && (
          <div className="mt-8 animate-fade-in">
            {filteredChampions.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredChampions.map((champ: any) => (
                  <div
                    key={champ.id}
                    className="card-hover group cursor-pointer rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
                    onClick={() => navigate(`/builds/${encodeURIComponent(champ.name)}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-tertiary)] text-lg font-bold text-[var(--text-muted)] transition-colors group-hover:from-yellow-500/20 group-hover:to-amber-500/20 group-hover:text-yellow-400">
                        {champ.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{champ.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate capitalize">{champ.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
                  <svg className="h-6 w-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm text-[var(--text-muted)]">No se encontraron campeones con "{search}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
