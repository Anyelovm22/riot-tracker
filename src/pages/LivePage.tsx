import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import { fetchLiveGame } from '../services/live';
import { readStoredProfile } from '../utils/profileStorage';

const DDRAGON_VERSION = '15.7.1';

type ChampionData = {
  id: string;
  key: string;
  name: string;
  image: {
    full: string;
  };
};

type ChampionMap = Record<number, ChampionData>;

export default function LivePage() {
  const navigate = useNavigate();
  const profile = readStoredProfile();

  const [data, setData] = useState<any>(null);
  const [championMap, setChampionMap] = useState<ChampionMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');

      const [result, champRes] = await Promise.all([
        fetchLiveGame({
          puuid: profile.account.puuid,
          platform: profile.resolvedPlatform,
        }),
        fetch(
          `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/champion.json`
        ),
      ]);

      if (!champRes.ok) {
        throw new Error('No se pudo cargar la data de campeones');
      }

      const champJson = await champRes.json();
      const map: ChampionMap = {};

      Object.values(champJson.data).forEach((champ: any) => {
        map[Number(champ.key)] = champ;
      });

      setChampionMap(map);
      setData(result);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No se pudo cargar live game'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!profile?.account?.puuid || !profile?.resolvedPlatform) {
      setError('No hay perfil cargado');
      setLoading(false);
      return;
    }

    load();
  }, [profile?.account?.puuid, profile?.resolvedPlatform]);

  function getChampionImage(championId: number) {
    const champ = championMap[championId];
    if (!champ?.image?.full) return '';
    return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${champ.image.full}`;
  }

  function getChampionName(championId: number) {
    return championMap[championId]?.name || `Champion ${championId}`;
  }

  function getQueueLabel(queueId?: number) {
    const map: Record<number, string> = {
      420: 'Ranked Solo/Duo',
      440: 'Ranked Flex',
      450: 'ARAM',
      400: 'Normal Draft',
      430: 'Normal Blind',
      490: 'Quickplay',
      700: 'Clash',
      1700: 'Arena',
    };

    return map[queueId || 0] || `Queue ${queueId ?? '-'}`;
  }

  function getParticipantDisplayName(p: any) {
    if (p.riotId) return p.riotId;
    if (p.riotIdGameName && p.riotIdTagline) {
      return `${p.riotIdGameName}#${p.riotIdTagline}`;
    }
    return p.summonerName || 'Jugador';
  }

  function renderParticipant(
    p: any,
    index: number,
    teamColor: 'blue' | 'red'
  ) {
    const championImage = getChampionImage(p.championId);
    const championName = getChampionName(p.championId);
    const riotId = getParticipantDisplayName(p);

    return (
      <div
        key={`${p.puuid || p.summonerName || index}-${index}`}
        className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--bg-elevated)]"
      >
        <div className="h-12 w-12 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
          {championImage ? (
            <img
              src={championImage}
              alt={championName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center text-xs font-bold ${
                teamColor === 'blue' ? 'text-blue-400' : 'text-red-400'
              }`}
            >
              {p.championId}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--text-primary)]">
            {riotId}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{championName}</p>
          <p className="text-xs text-[var(--text-muted)]">
            Spells: {p.spell1Id} / {p.spell2Id}
          </p>
        </div>
      </div>
    );
  }

  const blueTeam =
    data?.activeGame?.participants?.filter((p: any) => p.teamId === 100) || [];

  const redTeam =
    data?.activeGame?.participants?.filter((p: any) => p.teamId === 200) || [];

  return (
    <main className="page-shell">
      <div className="pointer-events-none absolute inset-0 bg-[var(--gradient-glow)]" />

      <div className="page-container max-w-6xl">
        <BackButton />

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/25">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
                Partida en Vivo
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Información en tiempo real del match activo.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/live/analyze')}
              className="rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-primary-hover)]"
            >
              Ver análisis
            </button>

            <button
              onClick={() => load()}
              disabled={loading}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--bg-elevated)] disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Refrescar'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Buscando partida en vivo...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
            <h3 className="font-medium text-red-300">Error al cargar</h3>
            <p className="mt-1 text-sm text-red-300/80">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="mt-8">
            {data?.activeGame ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      Partida Activa
                    </h2>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                      <p className="text-xs text-[var(--text-muted)]">Game ID</p>
                      <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
                        {data.activeGame.gameId}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                      <p className="text-xs text-[var(--text-muted)]">Cola</p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                        {getQueueLabel(data.activeGame.gameQueueConfigId)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                      <p className="text-xs text-[var(--text-muted)]">Jugadores</p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                        {data.activeGame.participants?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-blue-500/20 bg-[var(--bg-card)]">
                    <div className="border-b border-blue-500/20 bg-blue-500/10 px-5 py-3">
                      <h3 className="font-semibold text-blue-400">Equipo Azul</h3>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {blueTeam.map((p: any, index: number) =>
                        renderParticipant(p, index, 'blue')
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-[var(--bg-card)]">
                    <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-3">
                      <h3 className="font-semibold text-red-400">Equipo Rojo</h3>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {redTeam.map((p: any, index: number) =>
                        renderParticipant(p, index, 'red')
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
                <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
                  No hay partida activa
                </h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  El jugador no está en una partida en este momento.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
