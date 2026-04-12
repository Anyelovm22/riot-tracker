import { useEffect, useMemo, useState } from 'react';
import BackButton from '../components/common/BackButton';
import { fetchMatchHistory } from '../services/matches';
import { readStoredProfile } from '../utils/profileStorage';
import { readCache, readCacheMeta, saveCache } from '../utils/appCache';
import { getApiErrorMessage } from '../utils/httpError';

type QueueFilter = 'ALL' | 'RANKED_SOLO' | 'RANKED_FLEX' | 'NORMALS' | 'ARAM';

type MatchPlayer = {
  championName: string;
  championIcon: string | null;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  individualPosition: string;
  items: { id: number; icon: string | null }[];
};

type MatchItem = {
  matchId: string;
  gameCreation: number;
  gameDuration: number;
  queueId: number;
  queueLabel: string;
  player: MatchPlayer | null;
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function getCs(player?: MatchPlayer | null) {
  if (!player) return 0;
  return (player.totalMinionsKilled || 0) + (player.neutralMinionsKilled || 0);
}

function getKdaRatio(player?: MatchPlayer | null) {
  if (!player) return '0.00';
  if (player.deaths === 0) return String(player.kills + player.assists);
  return ((player.kills + player.assists) / player.deaths).toFixed(2);
}

export default function MatchupPage() {
  const profile = readStoredProfile();
  const cached = readCache<any>('matches');
  const cacheMeta = readCacheMeta('matches');

  const [matches, setMatches] = useState<MatchItem[]>(cached?.matches || []);
  const [filter, setFilter] = useState<QueueFilter>('ALL');
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadMatches(force = false) {
    try {
      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const data = await ({
        puuid: profile.account.puuid,
        platform: profile.resolvedPlatform,
        count: 20,
      });

      setMatches(data.matches || []);
      saveCache('matches', data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'No se pudo cargar el historial'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!cached) {
      loadMatches(false);
    }
  }, []);

  const filteredMatches = useMemo(() => {
    if (filter === 'ALL') return matches;

    return matches.filter((match) => {
      if (filter === 'RANKED_SOLO') return match.queueId === 420;
      if (filter === 'RANKED_FLEX') return match.queueId === 440;
      if (filter === 'NORMALS') return [400, 430, 490].includes(match.queueId);
      if (filter === 'ARAM') return match.queueId === 450;
      return true;
    });
  }, [matches, filter]);

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <BackButton />

        <div className="mt-4 flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white">Historial completo</h1>
          <p className="text-zinc-400">
            Todas las partidas recientes en una sola vista, con filtros por cola.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => loadMatches(true)}
            disabled={refreshing}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {refreshing ? 'Refrescando...' : 'Refrescar historial'}
          </button>

          {cacheMeta?.savedAt ? (
            <span className="text-sm text-zinc-500">
              Última carga: {new Date(cacheMeta.savedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ['ALL', 'Todas'],
            ['RANKED_SOLO', 'SoloQ'],
            ['RANKED_FLEX', 'Flex'],
            ['NORMALS', 'Normals'],
            ['ARAM', 'ARAM'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value as QueueFilter)}
              className={`rounded-xl px-4 py-2 text-white transition ${
                filter === value ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-300">
            Cargando historial...
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-yellow-200">
            {error}
          </div>
        ) : null}

        {!loading && (
          <div className="mt-6 space-y-4">
            {filteredMatches.length ? (
              filteredMatches.map((match) => {
                const player = match.player;
                const win = !!player?.win;

                return (
                  <div
                    key={match.matchId}
                    className={`rounded-2xl border p-4 ${
                      win
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-red-500/20 bg-red-500/5'
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div className="shrink-0">
                          {player?.championIcon ? (
                            <img
                              src={player.championIcon}
                              alt={player.championName}
                              className="h-16 w-16 rounded-2xl border border-zinc-700 object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-xs text-zinc-500">
                              No img
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold text-white">
                              {player?.championName || 'Unknown'}
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                win
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-red-500/15 text-red-300'
                              }`}
                            >
                              {win ? 'Victory' : 'Defeat'}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-zinc-400">
                            {match.queueLabel} · {formatDuration(match.gameDuration)}
                          </p>

                          <p className="text-xs text-zinc-500">
                            {formatDate(match.gameCreation)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {player?.items?.map((item, idx) =>
                              item?.icon ? (
                                <img
                                  key={`${match.matchId}-${idx}`}
                                  src={item.icon}
                                  alt={`Item ${item.id}`}
                                  className="h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-900"
                                />
                              ) : (
                                <div
                                  key={`${match.matchId}-${idx}`}
                                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] text-zinc-600"
                                >
                                  —
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-500">KDA</p>
                          <p className="text-sm font-semibold text-white">
                            {player?.kills}/{player?.deaths}/{player?.assists}
                          </p>
                          <p className="text-xs text-zinc-400">
                            Ratio {getKdaRatio(player)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-500">CS</p>
                          <p className="text-sm font-semibold text-white">{getCs(player)}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Damage</p>
                          <p className="text-sm font-semibold text-white">
                            {player?.totalDamageDealtToChampions || 0}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Gold</p>
                          <p className="text-sm font-semibold text-white">
                            {player?.goldEarned || 0}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Role</p>
                          <p className="text-sm font-semibold text-white">
                            {player?.individualPosition || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
                No hay partidas para mostrar.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}