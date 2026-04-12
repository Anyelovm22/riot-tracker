import { useState } from 'react';
import BackButton from '../components/common/BackButton';
import { fetchBuildsByChampion } from '../services/builds';
import { readStoredProfile } from '../utils/profileStorage';
import { readCache, readCacheMeta, saveCache } from '../utils/appCache';
import { getApiErrorMessage } from '../utils/httpError';

export default function BuilderPage() {
  const profile = readStoredProfile();
  const cached = readCache<any>('builds');
  const cacheMeta = readCacheMeta('builds');

  const [champion, setChampion] = useState('');
  const [data, setData] = useState<any>(cached || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLoad() {
    try {
      setLoading(true);
      setError('');

      const result = await fetchBuildsByChampion({
        puuid: profile.account.puuid,
        platform: profile.resolvedPlatform,
        champion: champion || undefined,
      });

      setData(result);
      saveCache('builds', result);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'No se pudo cargar builds'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen px-6 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[var(--gradient-glow)]" />
      
      <div className="relative mx-auto max-w-7xl">
        <BackButton />

        {/* Header */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">Builds</h1>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Analiza los items mas frecuentes usados en tus partidas recientes.
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Filtrar por campeon
              </label>
              <input
                value={champion}
                onChange={(e) => setChampion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                placeholder="Ej: Ahri (dejar vacio para todos)"
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>

            <button
              onClick={handleLoad}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Cargando...' : 'Cargar builds'}
            </button>

            {cacheMeta?.savedAt && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ultima carga: {new Date(cacheMeta.savedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500/20">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-yellow-200">Error al cargar</h3>
              <p className="mt-1 text-sm text-yellow-200/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Cargando builds...</p>
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <div className="mt-8 space-y-6 animate-fade-in">
            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-card)] px-4 py-2 border border-[var(--border-default)]">
                <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-sm text-[var(--text-secondary)]">
                  Muestra: <span className="font-semibold text-[var(--text-primary)]">{data.sampleSize}</span> partidas
                </span>
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.topItems?.length ? (
                data.topItems.map((item: any, index: number) => (
                  <div
                    key={item.itemId}
                    className="card-hover group rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        {item.icon ? (
                          <img
                            src={item.icon}
                            alt={item.name}
                            className="h-14 w-14 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
                            <svg className="h-6 w-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-white">
                          {index + 1}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{item.name}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            {item.count}x
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">usado</span>
                        </div>
                      </div>
                    </div>

                    {item.description && (
                      <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)] line-clamp-2">{item.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
                    <svg className="h-6 w-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">No hay items para mostrar.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !data && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
              <svg className="h-8 w-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">No hay builds cargadas</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Presiona el boton para cargar los items mas usados.</p>
          </div>
        )}
      </div>
    </main>
  );
}
