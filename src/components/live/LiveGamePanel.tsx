import {
  Clock,
  Radio,
  Users,
  Zap,
  Swords,
  Shield,
  Target,
  TrendingUp,
  Eye,
  Coins,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import GlassCard from "../shared/GlassCard";
import type {
  LiveGamePlayer,
  LiveSnapshot,
  SearchResponse,
  TeamPlayerSnapshot
} from "../../types/riot";
import { getChampionIcon } from "../../utils/ddragon";
import { useMemo } from "react";

const ROLE_ORDER = ["Top", "Jungle", "Mid", "ADC", "Support", "Unknown"];

const ROLE_LABELS: Record<string, string> = {
  Top: "Top",
  Jungle: "Jungla",
  Mid: "Mid",
  ADC: "ADC",
  Support: "Soporte",
  Unknown: "Desconocido",
  UTILITY: "Soporte",
  BOTTOM: "ADC",
  MIDDLE: "Mid",
  TOP: "Top",
  JUNGLE: "Jungla"
};

function normalizePosition(position: string | null | undefined): string {
  if (!position) return "Unknown";

  const upper = position.toUpperCase();

  const positionMap: Record<string, string> = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    MID: "Mid",
    BOTTOM: "ADC",
    BOT: "ADC",
    ADC: "ADC",
    UTILITY: "Support",
    SUPPORT: "Support",
    SUP: "Support",
    UNKNOWN: "Unknown"
  };

  return positionMap[upper] || "Unknown";
}

function sortPlayersByRole<T extends { position?: string | null }>(players: T[]): T[] {
  if (players.length === 0) return players;

  return [...players].sort((a, b) => {
    const roleA = normalizePosition(a.position);
    const roleB = normalizePosition(b.position);

    const indexA = ROLE_ORDER.indexOf(roleA);
    const indexB = ROLE_ORDER.indexOf(roleB);

    return indexA - indexB;
  });
}

function getChampionRoleLabel(position?: string | null): string {
  const role = normalizePosition(position);
  return ROLE_LABELS[role] || role;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "N/D";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

function calculateTeamStats(players: TeamPlayerSnapshot[]) {
  return {
    gold: players.reduce((sum, p) => sum + (p.gold || 0), 0),
    kills: players.reduce((sum, p) => sum + p.kills, 0),
    deaths: players.reduce((sum, p) => sum + p.deaths, 0),
    assists: players.reduce((sum, p) => sum + p.assists, 0),
    cs: players.reduce((sum, p) => sum + p.cs, 0),
    vision: players.reduce((sum, p) => sum + p.vision, 0)
  };
}

function DiffIndicator({
  value,
  showSign = true
}: {
  value: number;
  showSign?: boolean;
}) {
  if (value === 0) return <Minus className="h-3 w-3 text-white/40" />;

  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const color = isPositive ? "text-emerald-400" : "text-[#ff4f6d]";

  return (
    <span className={`flex items-center gap-0.5 text-sm font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {showSign && (isPositive ? "+" : "")}
      {formatNumber(Math.abs(value))}
    </span>
  );
}

function PlayerStatsCard({
  player,
  isAlly,
  opponentPlayer
}: {
  player: TeamPlayerSnapshot;
  isAlly: boolean;
  opponentPlayer?: TeamPlayerSnapshot;
}) {
  const accentColor = isAlly ? "#00d4ff" : "#ff4f6d";
  const position = getChampionRoleLabel(player.position);

  const diffs = opponentPlayer
    ? {
        cs: player.cs - opponentPlayer.cs,
        gold: (player.gold || 0) - (opponentPlayer.gold || 0),
        vision: player.vision - opponentPlayer.vision
      }
    : null;

  return (
    <div
      className="rounded-xl border bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
      style={{ borderColor: `${accentColor}20` }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="relative">
          <img
            src={getChampionIcon(player.championName)}
            alt={player.championName}
            className="h-12 w-12 rounded-lg border-2"
            style={{ borderColor: `${accentColor}50` }}
            crossOrigin="anonymous"
          />
          <span
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold"
            style={{
              backgroundColor: accentColor,
              color: isAlly ? "black" : "white"
            }}
          >
            {position.charAt(0)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{player.championName}</p>
          <p className="truncate text-xs text-white/50">{player.summonerName}</p>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-white">{player.kda}</p>
          <p className="text-xs text-white/40">KDA</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-black/30 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-white/40">
            <Target className="h-3 w-3" />
            <span className="text-[10px]">CS</span>
          </div>
          <p className="text-sm font-semibold text-white">{player.cs}</p>
          {diffs && (
            <div className="mt-0.5">
              <DiffIndicator value={diffs.cs} />
            </div>
          )}
        </div>

        <div className="rounded-lg bg-black/30 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-yellow-400/60">
            <Coins className="h-3 w-3" />
            <span className="text-[10px]">GOLD</span>
          </div>
          <p className="text-sm font-semibold text-yellow-400">
            {formatNumber(player.gold)}
          </p>
          {diffs && (
            <div className="mt-0.5">
              <DiffIndicator value={diffs.gold} />
            </div>
          )}
        </div>

        <div className="rounded-lg bg-black/30 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-[#00d4ff]/60">
            <Eye className="h-3 w-3" />
            <span className="text-[10px]">VISION</span>
          </div>
          <p className="text-sm font-semibold text-[#00d4ff]">{player.vision}</p>
          {diffs && (
            <div className="mt-0.5">
              <DiffIndicator value={diffs.vision} />
            </div>
          )}
        </div>

        <div className="rounded-lg bg-black/30 p-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-orange-400/60">
            <Flame className="h-3 w-3" />
            <span className="text-[10px]">DMG</span>
          </div>
          <p className="text-sm font-semibold text-orange-400">--</p>
        </div>
      </div>
    </div>
  );
}

export default function LiveGamePanel({
  riotData,
  liveData
}: {
  riotData: SearchResponse;
  liveData: LiveSnapshot | null;
}) {
  const isInGame = riotData.liveGame.isInGame;
  const allies = riotData.liveGame.allies;
  const enemies = riotData.liveGame.enemies;

  const sortedAllies = useMemo(() => {
    return sortPlayersByRole(allies);
  }, [allies]);

  const sortedEnemies = useMemo(() => {
    return sortPlayersByRole(enemies);
  }, [enemies]);

  const sortedLiveAllies = useMemo(() => {
    return sortPlayersByRole(liveData?.allies || []);
  }, [liveData?.allies]);

  const sortedLiveEnemies = useMemo(() => {
    return sortPlayersByRole(liveData?.enemies || []);
  }, [liveData?.enemies]);

  const teamStats = useMemo(() => {
    if (!liveData) return null;

    const allyStats = calculateTeamStats(liveData.allies || []);
    const enemyStats = calculateTeamStats(liveData.enemies || []);

    return {
      ally: allyStats,
      enemy: enemyStats,
      diff: {
        gold: allyStats.gold - enemyStats.gold,
        kills: allyStats.kills - enemyStats.kills,
        cs: allyStats.cs - enemyStats.cs,
        vision: allyStats.vision - enemyStats.vision
      }
    };
  }, [liveData]);

  return (
    <div className="mt-6 space-y-4">
      <GlassCard className="p-6" glow={isInGame ? "primary" : undefined}>
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              isInGame ? "bg-[#00d4ff]/10" : "bg-white/[0.04]"
            }`}
          >
            <Radio
              className={`h-6 w-6 ${
                isInGame ? "animate-pulse text-[#00d4ff]" : "text-white/30"
              }`}
            />
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">
              {isInGame ? "En partida" : "No está en partida"}
            </h2>

            {isInGame && riotData.liveGame.gameMode && (
              <div className="mt-1 flex items-center gap-3 text-sm text-white/50">
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  {riotData.liveGame.gameMode}
                </span>

                {riotData.liveGame.gameLength && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {Math.floor(riotData.liveGame.gameLength / 60)}:
                    {String(riotData.liveGame.gameLength % 60).padStart(2, "0")}
                  </span>
                )}
              </div>
            )}
          </div>

          {isInGame && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#00d4ff]">EN VIVO</span>
              <div className="h-3 w-3 animate-pulse rounded-full bg-[#00d4ff]" />
            </div>
          )}
        </div>
      </GlassCard>

      {!isInGame && (
        <GlassCard className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Users className="h-8 w-8 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white/70">
            Sin datos de partida en vivo
          </h3>
          <p className="mt-2 text-sm text-white/40">
            Cuando el invocador entre a una partida, podrás ver las estadísticas en
            tiempo real aquí.
          </p>
        </GlassCard>
      )}

      {isInGame && teamStats && (
        <GlassCard className="p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/70">
            <TrendingUp className="h-4 w-4" />
            Comparación de equipos
          </h3>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-4 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Coins className="h-5 w-5 text-yellow-400" />
                <span className="text-xs text-white/50">Diferencia oro</span>
              </div>
              <DiffIndicator value={teamStats.diff.gold} />
            </div>

            <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-4 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Swords className="h-5 w-5 text-red-400" />
                <span className="text-xs text-white/50">Diferencia kills</span>
              </div>
              <DiffIndicator value={teamStats.diff.kills} />
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-4 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Target className="h-5 w-5 text-amber-400" />
                <span className="text-xs text-white/50">Diferencia CS</span>
              </div>
              <DiffIndicator value={teamStats.diff.cs} />
            </div>

            <div className="rounded-xl border border-[#00d4ff]/20 bg-gradient-to-br from-[#00d4ff]/10 to-transparent p-4 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Eye className="h-5 w-5 text-[#00d4ff]" />
                <span className="text-xs text-white/50">Diferencia visión</span>
              </div>
              <DiffIndicator value={teamStats.diff.vision} />
            </div>
          </div>
        </GlassCard>
      )}

      {isInGame && liveData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard className="p-4" hover>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">Tu KDA</p>
                <p className="text-lg font-bold text-white">
                  {liveData.kills}/{liveData.deaths}/{liveData.assists}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4" hover>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Target className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">CS</p>
                <p className="text-lg font-bold text-white">{liveData.cs}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4" hover>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00d4ff]/10">
                <Eye className="h-5 w-5 text-[#00d4ff]" />
              </div>
              <div>
                <p className="text-xs text-white/50">Vision Score</p>
                <p className="text-lg font-bold text-white">{liveData.vision}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4" hover>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Coins className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-white/50">Oro</p>
                <p className="text-lg font-bold text-white">
                  {formatNumber(liveData.gold)}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {isInGame && !liveData && (allies.length > 0 || enemies.length > 0) && (
        <>
          {/* Team composition overview */}
          <GlassCard className="p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/70">
              <Users className="h-4 w-4" />
              Composicion de equipos
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-xl border border-[#00d4ff]/20 bg-gradient-to-br from-[#00d4ff]/5 to-transparent p-4">
                <p className="text-2xl font-bold text-[#00d4ff]">{sortedAllies.length}</p>
                <p className="text-xs text-white/50">Aliados</p>
              </div>
              <div className="rounded-xl border border-[#ff4f6d]/20 bg-gradient-to-br from-[#ff4f6d]/5 to-transparent p-4">
                <p className="text-2xl font-bold text-[#ff4f6d]">{sortedEnemies.length}</p>
                <p className="text-xs text-white/50">Enemigos</p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-white/30">
              Conecta el agente local para ver estadisticas en tiempo real (oro, CS, damage, etc.)
            </p>
            <p className="mt-2 text-center text-xs text-[#00d4ff]/60">
              Tip: Ve a la pestana de Builds para ver recomendaciones contra cada campeon enemigo
            </p>
          </GlassCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#00d4ff]" />
                  <h3 className="font-semibold text-white">Equipo aliado</h3>
                </div>
                <Shield className="h-4 w-4 text-[#00d4ff]" />
              </div>

              <div className="space-y-2">
                {sortedAllies.map((player) => (
                  <div
                    key={`ally-${player.summonerName}-${player.championName}`}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 transition-colors hover:border-[#00d4ff]/20"
                  >
                    <div className="relative">
                      <img
                        src={getChampionIcon(player.championName)}
                        alt={player.championName}
                        className="h-10 w-10 rounded-lg border border-[#00d4ff]/30"
                        crossOrigin="anonymous"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded bg-[#00d4ff] text-[8px] font-bold text-black">
                        {getChampionRoleLabel(player.position).charAt(0)}
                      </span>
                    </div>

                    <div className="flex-1">
                      <span className="text-sm font-medium text-white">
                        {player.championName}
                      </span>
                      <p className="text-xs text-white/40">
                        {getChampionRoleLabel(player.position)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#ff4f6d]" />
                  <h3 className="font-semibold text-white">Equipo enemigo</h3>
                </div>
                <Swords className="h-4 w-4 text-[#ff4f6d]" />
              </div>

              <div className="space-y-2">
                {sortedEnemies.length > 0 ? (
                  sortedEnemies.map((player) => (
                    <div
                      key={`enemy-${player.summonerName}-${player.championName}`}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 transition-colors hover:border-[#ff4f6d]/20"
                    >
                      <div className="relative">
                        <img
                          src={getChampionIcon(player.championName)}
                          alt={player.championName}
                          className="h-10 w-10 rounded-lg border border-[#ff4f6d]/30"
                          crossOrigin="anonymous"
                        />
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded bg-[#ff4f6d] text-[8px] font-bold text-white">
                          {getChampionRoleLabel(player.position).charAt(0)}
                        </span>
                      </div>

                      <div className="flex-1">
                        <span className="text-sm font-medium text-white">
                          {player.championName}
                        </span>
                        <p className="text-xs text-white/40">
                          {getChampionRoleLabel(player.position)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Swords className="h-8 w-8 text-[#ff4f6d]/30 mb-2" />
                    <p className="text-sm text-white/50">Cargando equipo enemigo...</p>
                    <p className="text-xs text-white/30 mt-1">Los datos aparecerán cuando inicie la partida</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {isInGame && liveData && (
        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#00d4ff]" />
                <h3 className="font-semibold text-white">Equipo aliado</h3>
              </div>
              <Shield className="h-4 w-4 text-[#00d4ff]" />
            </div>

            <div className="space-y-3">
              {sortedLiveAllies.map((player, i) => (
                <PlayerStatsCard
                  key={`ally-${player.summonerName}-${i}`}
                  player={player}
                  isAlly={true}
                  opponentPlayer={sortedLiveEnemies.find(
                    (enemy) =>
                      normalizePosition(enemy.position) ===
                      normalizePosition(player.position)
                  )}
                />
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#ff4f6d]" />
                <h3 className="font-semibold text-white">Equipo enemigo</h3>
              </div>
              <Swords className="h-4 w-4 text-[#ff4f6d]" />
            </div>

            <div className="space-y-3">
              {sortedLiveEnemies.map((player, i) => (
                <PlayerStatsCard
                  key={`enemy-${player.summonerName}-${i}`}
                  player={player}
                  isAlly={false}
                  opponentPlayer={sortedLiveAllies.find(
                    (ally) =>
                      normalizePosition(ally.position) ===
                      normalizePosition(player.position)
                  )}
                />
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
