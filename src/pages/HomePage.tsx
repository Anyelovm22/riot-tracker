import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerHub } from '../hooks/usePlayerHub';
import { captureDisplayScreenshot } from '../utils/screenshot';

function parseRiotId(input: string) {
  const parts = input.trim().split('#');

  if (parts.length !== 2) {
    throw new Error('Usa el formato Nombre#TAG');
  }

  const gameName = parts[0].trim();
  const tagLine = parts[1].trim();

  if (!gameName || !tagLine) {
    throw new Error('Nombre o TAG invalidos');
  }

  return { gameName, tagLine };
}

function getProfileIconUrl(iconId?: number) {
  if (!iconId) return '';
  return `https://ddragon.leagueoflegends.com/cdn/15.7.1/img/profileicon/${iconId}.png`;
}

const navCards = [
  {
    key: 'matches',
    path: '/matches',
    title: 'Historial',
    desc: 'SoloQ, Flex, Normals, ARAM y mas.',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'meta',
    path: '/meta',
    title: 'Analisis Pro',
    desc: 'Tendencia, roles, campeones y problemas.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    color: 'from-purple-500 to-pink-500',
  },
  {
    key: 'live',
    path: '/live',
    title: 'Live',
    desc: 'Partida en vivo si existe.',
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    color: 'from-red-500 to-orange-500',
  },
  {
    key: 'builds',
    path: '/builds',
    title: 'Builds',
    desc: 'Items frecuentes con imagenes.',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    key: 'champions',
    path: '/champions',
    title: 'Champions',
    desc: 'Catalogo completo.',
    icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'from-yellow-500 to-amber-500',
  },
];

const featureCards = [
  { title: 'Historial', desc: 'Partidas recientes con filtros e items.', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { title: 'Ranked', desc: 'Analisis profundo del rendimiento.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { title: 'Live', desc: 'Partida activa del jugador.', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { title: 'Builds', desc: 'Items frecuentes e imagenes.', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { title: 'Champions', desc: 'Catalogo de campeones.', icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function HomePage() {
  const [searchValue, setSearchValue] = useState('');
  const [region, setRegion] = useState('la2');
  const [inputError, setInputError] = useState('');
  const {
    loading,
    error,
    warnings,
    profile: summary,
    runSearch,
    reset,
  } = usePlayerHub();

  const navigate = useNavigate();

  async function handleSearch() {
    try {
      setInputError('');
      const { gameName, tagLine } = parseRiotId(searchValue);
      await runSearch({ gameName, tagLine, region });
    } catch (err) {
      setInputError(err instanceof Error ? err.message : 'Riot ID invalido');
    }
  }

  function handleReset() {
    reset();
    setSearchValue('');
    setInputError('');
  }

  async function handleScreenshot() {
    try {
      await captureDisplayScreenshot();
    } catch (err) {
      setInputError(err instanceof Error ? err.message : 'No se pudo tomar screenshot');
    }
  }

  return (
    <main className="page-shell md:px-6">
      <section className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.5fr,1fr]">
        <div className="surface-card relative overflow-hidden p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_5%_0%,rgba(99,119,255,.26),transparent_35%),radial-gradient(circle_at_90%_15%,rgba(35,208,255,.18),transparent_33%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Mobalytics style dashboard</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              Analiza tu cuenta y domina la
              <span className="ml-2 bg-gradient-to-r from-[#8ea0ff] to-[#3bd7ff] bg-clip-text text-transparent">Grieta</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] text-[var(--text-secondary)]">
              Experiencia completa tipo companion app: perfil, historial, live game, builds y rendimiento por campeones en una sola vista.
            </p>

            <div className="mt-7 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Nombre#TAG (ej: Dandrel10#LAN)"
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-3.5 pl-12 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#6f86ff] focus:outline-none"
                  />
                </div>

                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3.5 text-[var(--text-primary)] focus:border-[#6f86ff] focus:outline-none"
                >
                  <option value="la2">LAS</option>
                  <option value="la1">LAN</option>
                  <option value="na1">NA</option>
                  <option value="br1">BR</option>
                  <option value="euw1">EUW</option>
                  <option value="eun1">EUNE</option>
                  <option value="kr">KR</option>
                  <option value="jp1">JP</option>
                </select>

                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5f79ff] to-[#2cd4ff] px-6 py-3.5 font-semibold text-white shadow-[0_10px_22px_rgba(76,112,255,.33)] transition hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Buscando...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      Buscar
                    </>
                  )}
                </button>
                <button
                  onClick={handleScreenshot}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                >
                  Screenshot
                </button>
              </div>

              {(error || inputError) && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-300">{inputError || error}</p>
                </div>
              )}

              {!!warnings.length && (
                <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  {warnings[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Acciones rapidas</h2>
          <div className="mt-4 grid gap-3">
            {navCards.slice(0, 4).map((card) => (
              <button
                key={`quick-${card.key}`}
                onClick={() => navigate(card.path)}
                className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-left transition hover:border-[#5f79ff]"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} text-white`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">{card.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{card.desc}</p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl">
        {!summary ? (
          <div className="surface-card p-6">
            <h2 className="mb-6 text-sm font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Funcionalidades disponibles
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className="card-hover group rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors group-hover:bg-[var(--accent-primary)]/10 group-hover:text-[var(--accent-primary)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{card.title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)]">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
              <div className="h-24 bg-gradient-to-r from-[#5f79ff]/30 via-[#8e6bff]/20 to-[#23d0ff]/20" />
              <div className="px-6 pb-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-end gap-4">
                    <div className="-mt-12 overflow-hidden rounded-2xl border-4 border-[var(--bg-card)] shadow-xl">
                      <img
                        src={getProfileIconUrl(summary.summoner?.profileIconId)}
                        alt="Profile icon"
                        className="h-24 w-24 object-cover"
                      />
                    </div>
                    <div className="pb-1">
                      <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                        {summary.account.gameName}
                        <span className="text-[var(--text-muted)]">#{summary.account.tagLine}</span>
                      </h2>
                      <div className="mt-1 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1.5">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                          </svg>
                          Nivel {summary.summoner.summonerLevel}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                          </svg>
                          {summary.resolvedPlatform.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar busqueda
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {navCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => navigate(card.path)}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 text-left transition-all hover:border-[var(--border-hover)] hover:shadow-lg"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 transition-opacity group-hover:opacity-5`} />
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{card.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{card.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)]">
                    Ver mas
                    <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
