import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import { fetchMatchDetail } from '../services/matches';
import { readStoredProfile } from '../utils/profileStorage';
import { getApiErrorMessage } from '../utils/httpError';

export default function MatchDetailPage() {
  const { matchId = '' } = useParams();
  const profile = readStoredProfile();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!profile?.account?.puuid || !profile?.resolvedPlatform || !matchId) {
        setError('No hay perfil o partida válida para cargar.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await fetchMatchDetail({
          matchId,
          puuid: profile.account.puuid,
          platform: profile.resolvedPlatform,
        });
        setData(response);
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'No se pudo cargar el detalle de la partida'));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [matchId, profile?.account?.puuid, profile?.resolvedPlatform]);

  const blueTeam = useMemo(
    () => (data?.participants || []).filter((p: any) => p.teamId === 100),
    [data?.participants]
  );
  const redTeam = useMemo(
    () => (data?.participants || []).filter((p: any) => p.teamId === 200),
    [data?.participants]
  );

  function renderParticipant(p: any) {
    const cs = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
    return (
      <div key={p.puuid} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
        <div className="flex items-center gap-3">
          {p.championIcon ? (
            <img src={p.championIcon} alt={p.championName} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--bg-card)] text-xs text-[var(--text-muted)]">
              ?
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--text-primary)]">
              {p.riotIdGameName ? `${p.riotIdGameName}#${p.riotIdTagline || ''}` : p.summonerName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{p.championName} · {p.individualPosition || 'N/A'}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-[var(--text-secondary)]">
          <div>KDA: {p.kills}/{p.deaths}/{p.assists}</div>
          <div>CS: {cs}</div>
          <div>Gold: {p.goldEarned}</div>
          <div>Vision: {p.visionScore}</div>
        </div>
      </div>
    );
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <BackButton />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Detalle de Partida</h1>

        {loading ? <div className="rounded-2xl bg-[var(--bg-card)] p-6">Cargando detalle...</div> : null}
        {error ? <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-yellow-200">{error}</div> : null}

        {!loading && !error && data ? (
          <>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">
              {data.queueLabel} · {Math.floor(data.gameDuration / 60)}m · {new Date(data.gameCreation).toLocaleString()}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h2 className="font-semibold text-blue-400">Equipo Azul</h2>
                {blueTeam.map(renderParticipant)}
              </div>
              <div className="space-y-3">
                <h2 className="font-semibold text-red-400">Equipo Rojo</h2>
                {redTeam.map(renderParticipant)}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
