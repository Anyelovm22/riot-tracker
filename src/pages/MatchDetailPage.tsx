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
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] md:grid-cols-4">
          <div>KDA: {p.kills}/{p.deaths}/{p.assists}</div>
          <div>CS: {cs}</div>
          <div>Gold: {p.goldEarned}</div>
          <div>Vision: {p.visionScore}</div>
          <div>Nivel: {p.champLevel}</div>
          <div>Wards: {p.wardsPlaced}/{p.wardsKilled}</div>
          <div>Objetivos: {p.damageDealtToObjectives}</div>
          <div>Torres: {p.turretTakedowns}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.items?.map((item: any, idx: number) =>
            item?.icon ? (
              <img key={`${p.puuid}-${idx}`} src={item.icon} alt={`item-${item.id}`} className="h-9 w-9 rounded-md border border-[var(--border-default)]" />
            ) : (
              <div key={`${p.puuid}-${idx}`} className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)]" />
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <BackButton />
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Detalle de Partida</h1>

        {loading ? <div className="rounded-2xl bg-[var(--bg-card)] p-6">Cargando detalle...</div> : null}
        {error ? <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-yellow-200">{error}</div> : null}

        {!loading && !error && data ? (
          <>
            <div className="rounded-2xl border border-[var(--border-default)] bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-elevated)] p-5 text-sm text-[var(--text-secondary)]">
              {data.queueLabel} · {Math.floor(data.gameDuration / 60)}m · {new Date(data.gameCreation).toLocaleString()}
            </div>

            {data.player ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 lg:col-span-2">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Tu rendimiento</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-[var(--bg-elevated)] p-3 text-sm">KDA: {data.player.kills}/{data.player.deaths}/{data.player.assists}</div>
                    <div className="rounded-xl bg-[var(--bg-elevated)] p-3 text-sm">Daño: {data.player.totalDamageDealtToChampions}</div>
                    <div className="rounded-xl bg-[var(--bg-elevated)] p-3 text-sm">Daño recibido: {data.player.totalDamageTaken}</div>
                    <div className="rounded-xl bg-[var(--bg-elevated)] p-3 text-sm">Oro: {data.player.goldEarned}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[data.player.item0, data.player.item1, data.player.item2, data.player.item3, data.player.item4, data.player.item5, data.player.item6].map((itemId: number, idx: number) => {
                      const item = data.participants.find((p: any) => p.puuid === data.playerPuuid)?.items?.[idx];
                      return item?.icon ? (
                        <img key={`self-${idx}`} src={item.icon} alt={`item-${itemId}`} className="h-11 w-11 rounded-md border border-[var(--border-default)]" />
                      ) : (
                        <div key={`self-${idx}`} className="h-11 w-11 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)]" />
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                  <h3 className="font-semibold text-[var(--text-primary)]">Feedback inteligente</h3>
                  {data.aiRetrospective ? (
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm leading-relaxed text-cyan-100 whitespace-pre-wrap">
                      <div className="mb-1 text-sm font-semibold">Retrospectiva IA local</div>
                      {data.aiRetrospective}
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-2">
                    {(data.playerFeedback || []).map((tip: any, index: number) => (
                      <div
                        key={`${tip.title}-${index}`}
                        className={`rounded-xl border p-3 text-sm ${
                          tip.type === 'good'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                            : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100'
                        }`}
                      >
                        <div className="font-semibold">{tip.title}</div>
                        <div className="mt-1 text-xs opacity-90">{tip.detail}</div>
                      </div>
                    ))}
                    {(data.itemFeedback || []).map((tip: string, index: number) => (
                      <div
                        key={`item-tip-${index}`}
                        className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-100"
                      >
                        <div className="font-semibold">Optimización de build</div>
                        <div className="mt-1 text-xs opacity-90">{tip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {data.timelineSummary ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
                <h3 className="font-semibold text-[var(--text-primary)]">Resumen de timeline</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm text-[var(--text-secondary)]">
                  <div className="rounded-xl bg-[var(--bg-elevated)] p-3">Frames: {data.timelineSummary.frames}</div>
                  <div className="rounded-xl bg-[var(--bg-elevated)] p-3">Eventos: {data.timelineSummary.events}</div>
                  <div className="rounded-xl bg-[var(--bg-elevated)] p-3">Solo kills: {data.timelineSummary.soloKills}</div>
                  <div className="rounded-xl bg-[var(--bg-elevated)] p-3">Eventos objetivo: {data.timelineSummary.objectiveEvents}</div>
                  <div className="rounded-xl bg-[var(--bg-elevated)] p-3">Muertes en río: {data.timelineSummary.riskyRiverDeaths}</div>
                </div>
              </div>
            ) : null}

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
