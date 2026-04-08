import {
  BookOpen,
  Lightbulb,
  Shield,
  Sparkles,
  Swords,
  Wand2,
  Trophy,
  Target,
  Zap,
  Users,
  TrendingUp,
  Crosshair,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Crown,
  Flame,
  Heart,
  Eye,
  Check,
  Info
} from "lucide-react";
import GlassCard from "../shared/GlassCard";
import type { SearchResponse } from "../../types/riot";
import { getChampionIcon, getItemIcon } from "../../utils/ddragon";
import { useEffect, useMemo, useState, useCallback } from "react";
import { 
  getLiveGameBuild, 
  getFullBuildWithMatchup, 
  getBuildVsEnemy,
  type FullBuildRecommendation, 
  type FullItemData, 
  type FullRuneData,
  type VsEnemyBuildRecommendation,
  type BuildType
} from "../../services/buildApi";

const ROLE_ORDER = ["Top", "Jungle", "Mid", "ADC", "Support", "Unknown"];

const ROLE_LABELS: Record<string, string> = {
  Top: "Top",
  Jungle: "Jungla",
  Mid: "Mid",
  ADC: "ADC",
  Support: "Soporte",
  Unknown: "Desc."
};

const ROLE_COLORS: Record<string, string> = {
  Top: "from-amber-500 to-orange-600",
  Jungle: "from-emerald-500 to-green-600",
  Mid: "from-blue-500 to-indigo-600",
  ADC: "from-red-500 to-rose-600",
  Support: "from-cyan-500 to-teal-600",
  Unknown: "from-gray-500 to-slate-600"
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
  return [...players].sort((a, b) => {
    const roleA = normalizePosition(a.position);
    const roleB = normalizePosition(b.position);
    return ROLE_ORDER.indexOf(roleA) - ROLE_ORDER.indexOf(roleB);
  });
}

// Component for item display with image
function ItemDisplay({ item, size = "md" }: { item: FullItemData | string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  const isFullItem = typeof item !== "string";
  const name = isFullItem ? item.name : item;
  const image = isFullItem ? item.image : getItemIcon(item);

  return (
    <div className="group relative">
      <img
        src={image}
        alt={name}
        className={`${sizeClasses[size]} rounded-lg border border-white/10 transition-transform group-hover:scale-110`}
        crossOrigin="anonymous"
      />
      <div className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {name}
        {isFullItem && item.gold > 0 && (
          <span className="ml-1 text-amber-400">({item.gold}g)</span>
        )}
      </div>
    </div>
  );
}

// Component for rune display
function RuneDisplay({ rune, isKeystone = false }: { rune: FullRuneData | string; isKeystone?: boolean }) {
  const isFullRune = typeof rune !== "string";
  const name = isFullRune ? rune.name : rune;
  const image = isFullRune ? rune.image : null;

  if (!image) {
    return (
      <div className={`rounded-lg px-2 py-1 text-sm ${isKeystone ? "bg-amber-500/20 font-medium text-amber-400" : "bg-white/[0.04] text-white/70"}`}>
        {name}
      </div>
    );
  }

  return (
    <div className="group relative flex items-center gap-2">
      <img
        src={image}
        alt={name}
        className={`rounded-full border border-white/10 ${isKeystone ? "h-10 w-10" : "h-7 w-7"}`}
        crossOrigin="anonymous"
      />
      {isKeystone && <span className="font-medium text-amber-400">{name}</span>}
      {!isKeystone && (
        <div className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {name}
        </div>
      )}
    </div>
  );
}

// Threat indicator component
function ThreatBadge({ threat }: { threat: "low" | "medium" | "high" }) {
  const config = {
    low: { color: "bg-emerald-500/20 text-emerald-400", label: "Bajo" },
    medium: { color: "bg-amber-500/20 text-amber-400", label: "Medio" },
    high: { color: "bg-red-500/20 text-red-400", label: "Alto" }
  };
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${config[threat].color}`}>
      {config[threat].label}
    </span>
  );
}

// Build type badge component
function BuildTypeBadge({ buildType, isOffMeta }: { buildType: BuildType; isOffMeta?: boolean }) {
  const config: Record<BuildType, { color: string; label: string }> = {
    ap: { color: "bg-purple-500/20 text-purple-400", label: "AP" },
    ad: { color: "bg-orange-500/20 text-orange-400", label: "AD" },
    tank: { color: "bg-slate-500/20 text-slate-300", label: "TANK" },
    hybrid: { color: "bg-pink-500/20 text-pink-400", label: "HYBRID" },
    support: { color: "bg-teal-500/20 text-teal-400", label: "SUPP" },
    unknown: { color: "bg-gray-500/20 text-gray-400", label: "?" }
  };
  
  const { color, label } = config[buildType] || config.unknown;
  
  return (
    <div className="flex items-center gap-1">
      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${color}`}>
        {label}
      </span>
      {isOffMeta && (
        <span className="rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[8px] font-bold text-amber-300 animate-pulse">
          OFF-META
        </span>
      )}
    </div>
  );
}

// Extended player type with optional items for VS build analysis
type EnemyPlayerWithItems = {
  summonerName: string;
  championName: string;
  position?: string | null;
  items?: Array<string | { name: string; image?: string } | null>;
};

export default function BuildPanel({ data }: { data: SearchResponse }) {
  const rec = data.recommendation;
  const liveGame = data.liveGame;

  const [fullBuild, setFullBuild] = useState<FullBuildRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"lane" | "team" | "vsEnemy">("lane");
  
  // New state for VS enemy feature
  const [selectedEnemyTarget, setSelectedEnemyTarget] = useState<string | null>(null);
  const [vsEnemyBuild, setVsEnemyBuild] = useState<VsEnemyBuildRecommendation | null>(null);
  const [vsEnemyLoading, setVsEnemyLoading] = useState(false);

  const sortedEnemies = useMemo<EnemyPlayerWithItems[]>(() => {
    const enemies = liveGame.isInGame ? liveGame.enemies : [];
    // Cast to our extended type - items will be undefined for basic live game data
    return sortPlayersByRole(enemies as EnemyPlayerWithItems[]);
  }, [liveGame.enemies, liveGame.isInGame]);

  const hasEnemyContext = sortedEnemies.length > 0;

  // Find the player's role and lane opponent (using server-provided data)
  const playerRole = useMemo(() => {
    if (liveGame.isInGame && liveGame.playerRole) {
      return normalizePosition(liveGame.playerRole);
    }
    return "Mid";
  }, [liveGame]);

  const playerChampion = useMemo(() => {
    return liveGame.playerChampion || rec.champion;
  }, [liveGame.playerChampion, rec.champion]);

  const laneOpponent = useMemo(() => {
    // Use the server-provided enemy laner if available
    if (liveGame.enemyLaner) {
      return sortedEnemies.find(e => e.championName === liveGame.enemyLaner) || null;
    }
    // Fallback to finding by role
    return sortedEnemies.find(e => normalizePosition(e.position) === playerRole) || null;
  }, [sortedEnemies, playerRole, liveGame.enemyLaner]);

  // Fetch full build data when we have live game context
  useEffect(() => {
    if (!liveGame.isInGame) return;

    const fetchBuild = async () => {
      setLoading(true);
      try {
        const enemyTeam = sortedEnemies.map(e => e.championName);
        const build = await getLiveGameBuild(
          playerChampion,
          playerRole,
          laneOpponent?.championName || null,
          enemyTeam
        );
        setFullBuild(build);
      } catch (error) {
        console.error("Failed to fetch build:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBuild();
  }, [liveGame.isInGame, playerChampion, playerRole, laneOpponent?.championName, sortedEnemies]);

  // Handler to select an enemy target for VS build
  const handleSelectEnemyTarget = useCallback(async (championName: string) => {
    // If clicking the same enemy, deselect
    if (selectedEnemyTarget === championName) {
      setSelectedEnemyTarget(null);
      setVsEnemyBuild(null);
      setActiveTab("lane");
      return;
    }

    setSelectedEnemyTarget(championName);
    setActiveTab("vsEnemy");
    setVsEnemyLoading(true);

    try {
      // Helper to extract item name from either string or object
      const getItemName = (item: string | { name: string; image?: string } | null | undefined): string => {
        if (!item) return "";
        if (typeof item === "string") return item;
        return item.name || "";
      };

      // Get enemy's items from live data
      const targetEnemy = sortedEnemies.find(e => e.championName === championName);
      const targetItems = targetEnemy?.items?.map(getItemName).filter(Boolean) || [];
      
      // Prepare all enemies data for team analysis
      const allEnemiesData = sortedEnemies.map(e => ({
        champion: e.championName,
        items: e.items?.map(getItemName).filter(Boolean) || [],
        runeKeystone: undefined // We don't have rune data from live game
      }));

      const build = await getBuildVsEnemy(
        playerChampion,
        playerRole,
        championName,
        targetItems,
        undefined,
        allEnemiesData
      );
      
      setVsEnemyBuild(build);
    } catch (error) {
      console.error("Failed to fetch vs enemy build:", error);
    } finally {
      setVsEnemyLoading(false);
    }
  }, [selectedEnemyTarget, sortedEnemies, playerChampion, playerRole]);

  // Bot lane enemies for specific warnings
  const botLaneEnemies = useMemo(() => {
    return sortedEnemies.filter(
      (e) => normalizePosition(e.position) === "ADC" || normalizePosition(e.position) === "Support"
    );
  }, [sortedEnemies]);

  return (
    <div className="mt-6 space-y-4">
      {/* Header with champion info */}
      <GlassCard className="p-6" glow="primary">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={fullBuild?.championImage || getChampionIcon(rec.champion)}
                alt={rec.champion}
                className="h-16 w-16 rounded-xl border-2 border-[#00d4ff]/30"
                crossOrigin="anonymous"
              />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#00d4ff] to-[#00b4d8]">
                <Sparkles className="h-3 w-3 text-black" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">Build recomendada</h2>
              <p className="text-white/50">
                <span className="text-[#00d4ff]">{playerChampion}</span>
                {laneOpponent && (
                  <span className="text-[#ff4f6d]"> vs {laneOpponent.championName}</span>
                )}
                {!laneOpponent && rec.versus && (
                  <span className="text-[#ff4f6d]"> vs {rec.versus}</span>
                )}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full bg-gradient-to-r ${ROLE_COLORS[playerRole]} px-2 py-0.5 text-xs font-medium text-white`}>
                  {ROLE_LABELS[playerRole]}
                </span>
                {rec.skillOrder && (
                  <span className="text-xs text-white/40">
                    Skills: <span className="text-[#00d4ff]">{rec.skillOrder}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">{rec.winRate.toFixed(1)}% WR</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-[#00d4ff]/10 px-3 py-1.5 text-sm">
              <Users className="h-3.5 w-3.5 text-[#00d4ff]" />
              <span className="text-[#00d4ff]">{rec.pickRate.toFixed(1)}% Pick</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-[#ff4f6d]/10 px-3 py-1.5 text-sm">
              <Crosshair className="h-3.5 w-3.5 text-[#ff4f6d]" />
              <span className="text-[#ff4f6d]">{rec.banRate.toFixed(1)}% Ban</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Loading state */}
      {loading && (
        <GlassCard className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#00d4ff]" />
          <span className="ml-3 text-white/60">Cargando build optimizada...</span>
        </GlassCard>
      )}

      {/* Pro Players */}
      {rec.proPlayers && rec.proPlayers.length > 0 && (
        <GlassCard className="p-5" hover>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Jugadores Pro</h3>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
              ProBuilds
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {rec.proPlayers.map((player) => (
              <div
                key={`${player.name}-${player.team}`}
                className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{player.name}</p>
                  <p className="text-xs text-white/40">
                    {player.team} - {player.region}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Enemy Team Section */}
      {hasEnemyContext && (
        <GlassCard className="border-[#ff4f6d]/20 p-5" glow="secondary">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff4f6d]/10">
                <Swords className="h-4 w-4 text-[#ff4f6d]" />
              </div>
              <h3 className="text-lg font-bold text-white">Equipo enemigo</h3>
              <span className="rounded-full bg-[#ff4f6d]/20 px-2 py-0.5 text-xs text-[#ff4f6d]">
                En vivo
              </span>
            </div>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Target className="h-3.5 w-3.5" />
              <span>Click para build VS</span>
            </div>
          </div>

          {/* Enemy team grid - clickable for VS builds */}
          <div className="grid grid-cols-5 gap-3">
            {sortedEnemies.map((enemy) => {
              const role = normalizePosition(enemy.position);
              const roleLabel = ROLE_LABELS[role] || role;
              const isLaneOpponent = laneOpponent?.championName === enemy.championName;
              const isSelected = selectedEnemyTarget === enemy.championName;
              const threat = fullBuild?.teamBuild.enemyTeamComp.find(e => e.champion === enemy.championName);
              
              // Get build type from vsEnemyBuild if this enemy was analyzed
              const enemyBuildInfo = vsEnemyBuild?.teamContext.enemies.find(e => e.champion === enemy.championName);

              return (
                <button
                  key={`${enemy.summonerName}-${enemy.championName}`}
                  onClick={() => handleSelectEnemyTarget(enemy.championName)}
                  className={`relative flex flex-col items-center rounded-xl border p-3 transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#00d4ff]/70 bg-[#00d4ff]/15 ring-2 ring-[#00d4ff]/40"
                      : isLaneOpponent 
                        ? "border-[#ff4f6d]/50 bg-[#ff4f6d]/10 ring-2 ring-[#ff4f6d]/30 hover:ring-[#00d4ff]/30" 
                        : "border-white/[0.06] bg-white/[0.02] hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/5"
                  }`}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#00b4d8] px-2 py-0.5 text-[9px] font-bold text-black shadow-lg flex items-center gap-1">
                      <Eye className="h-2.5 w-2.5" />
                      BUILD VS
                    </div>
                  )}
                  {/* Lane opponent indicator (only show if not selected) */}
                  {isLaneOpponent && !isSelected && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ff4f6d] to-[#ff6b81] px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
                      TU RIVAL
                    </div>
                  )}
                  <div className="relative">
                    <img
                      src={getChampionIcon(enemy.championName)}
                      alt={enemy.championName}
                      className={`h-12 w-12 rounded-lg border-2 transition-all ${
                        isSelected ? "border-[#00d4ff]" : isLaneOpponent ? "border-[#ff4f6d]" : "border-white/20"
                      }`}
                      crossOrigin="anonymous"
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-gradient-to-r ${ROLE_COLORS[role]} flex items-center justify-center`}>
                      <span className="text-[8px] font-bold text-white">{role.charAt(0)}</span>
                    </div>
                    {/* Check mark when selected */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#00d4ff] flex items-center justify-center">
                        <Check className="h-3 w-3 text-black" />
                      </div>
                    )}
                  </div>
                  <span className="mt-2 text-center text-xs font-medium text-white/90 line-clamp-1">
                    {enemy.championName}
                  </span>
                  <span className="text-[10px] text-white/50">{roleLabel}</span>
                  
                  {/* Show build type if available */}
                  {enemyBuildInfo ? (
                    <BuildTypeBadge buildType={enemyBuildInfo.detectedBuildType} isOffMeta={enemyBuildInfo.isOffMeta} />
                  ) : threat ? (
                    <ThreatBadge threat={threat.threat} />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Team Analysis */}
          {fullBuild?.teamBuild.teamAnalysis && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {fullBuild.teamBuild.teamAnalysis.healerCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-pink-500/10 px-2 py-1.5">
                  <Heart className="h-3.5 w-3.5 text-pink-400" />
                  <span className="text-xs text-pink-400">{fullBuild.teamBuild.teamAnalysis.healerCount} Healers</span>
                </div>
              )}
              {fullBuild.teamBuild.teamAnalysis.tankCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-500/10 px-2 py-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400">{fullBuild.teamBuild.teamAnalysis.tankCount} Tanks</span>
                </div>
              )}
              {fullBuild.teamBuild.teamAnalysis.apThreat > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2 py-1.5">
                  <Wand2 className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-xs text-purple-400">{fullBuild.teamBuild.teamAnalysis.apThreat} AP</span>
                </div>
              )}
              {fullBuild.teamBuild.teamAnalysis.adThreat > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2 py-1.5">
                  <Swords className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs text-orange-400">{fullBuild.teamBuild.teamAnalysis.adThreat} AD</span>
                </div>
              )}
              {fullBuild.teamBuild.teamAnalysis.ccCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs text-cyan-400">{fullBuild.teamBuild.teamAnalysis.ccCount} CC</span>
                </div>
              )}
            </div>
          )}

          {/* Bot lane warning */}
          {botLaneEnemies.length === 2 && (playerRole === "ADC" || playerRole === "Support") && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                <ShieldAlert className="h-4 w-4" />
                <span>Bot lane enemiga</span>
              </div>
              <p className="mt-1 text-xs text-white/60">
                {botLaneEnemies[0]?.championName} + {botLaneEnemies[1]?.championName} - 
                Cuidado con su sinergia en trades y all-ins
              </p>
            </div>
          )}
        </GlassCard>
      )}

      {/* Build Tabs */}
      {hasEnemyContext && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("lane")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "lane"
                ? "bg-[#00d4ff] text-black"
                : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            <Target className="h-4 w-4" />
            Build vs Linea
            {laneOpponent && <span className="ml-1 text-xs opacity-75">({laneOpponent.championName})</span>}
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "team"
                ? "bg-[#ff4f6d] text-white"
                : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            Build vs Equipo
          </button>
          {/* VS Enemy Tab - only show when a target is selected */}
          {selectedEnemyTarget && (
            <button
              onClick={() => setActiveTab("vsEnemy")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "vsEnemy"
                  ? "bg-gradient-to-r from-[#00d4ff] to-[#00b4d8] text-black"
                  : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              <Eye className="h-4 w-4" />
              VS {selectedEnemyTarget}
              {vsEnemyBuild?.targetEnemy.isOffMeta && (
                <span className="ml-1 rounded bg-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300">OFF-META</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Build Content */}
      {activeTab === "lane" && (
        <>
          {/* Starting items and spells */}
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Zap className="h-4 w-4 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Inicio</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs text-white/40">Items iniciales</p>
                  <div className="flex flex-wrap gap-3">
                    {(fullBuild?.laneBuild.startingItems || rec.startingItems.map(name => ({ name, image: getItemIcon(name), gold: 0, description: "" }))).map((item, idx) => (
                      <ItemDisplay key={typeof item === 'string' ? item : `${item.name}-${idx}`} item={item} size="md" />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs text-white/40">Hechizos de invocador</p>
                  <div className="flex flex-wrap gap-2">
                    {(fullBuild?.laneBuild.summonerSpells || rec.summonerSpells).map((spell) => (
                      <span
                        key={spell}
                        className="rounded-md bg-[#00d4ff]/10 px-3 py-1.5 text-sm font-medium text-[#00d4ff]"
                      >
                        {spell}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Runes */}
            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Wand2 className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Runas</h3>
              </div>

              {fullBuild?.laneBuild.runes ? (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs text-white/40">{fullBuild.laneBuild.runes.primaryTree}</p>
                    <RuneDisplay rune={fullBuild.laneBuild.runes.keystone} isKeystone />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {fullBuild.laneBuild.runes.primaryRunes.map((rune, idx) => (
                        <RuneDisplay key={`primary-${idx}`} rune={rune} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs text-white/40">{fullBuild.laneBuild.runes.secondaryTree}</p>
                    <div className="flex flex-wrap gap-2">
                      {fullBuild.laneBuild.runes.secondaryRunes.map((rune, idx) => (
                        <RuneDisplay key={`secondary-${idx}`} rune={rune} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : rec.runeDetails ? (
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-xs text-white/40">{rec.runeDetails.primary}</p>
                    <p className="font-medium text-amber-400">{rec.runeDetails.keystone}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rec.runeDetails.primaryRunes.map((rune) => (
                        <span key={rune} className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white/70">
                          {rune}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-white/40">{rec.runeDetails.secondary}</p>
                    <div className="flex flex-wrap gap-2">
                      {rec.runeDetails.secondaryRunes.map((rune) => (
                        <span key={rune} className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white/70">
                          {rune}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/50">Runas no disponibles</p>
              )}
            </GlassCard>
          </div>

          {/* Core Build for Lane */}
          <GlassCard className="p-5" hover>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00d4ff]/10">
                  <Swords className="h-4 w-4 text-[#00d4ff]" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {laneOpponent ? `Build vs ${laneOpponent.championName}` : "Build de Linea"}
                </h3>
              </div>
              {fullBuild?.laneBuild.winRate && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                  {fullBuild.laneBuild.winRate.toFixed(1)}% WR
                </span>
              )}
            </div>

            {fullBuild?.laneBuild.description && (
              <p className="mb-4 text-sm text-white/60">{fullBuild.laneBuild.description}</p>
            )}

            <div className="space-y-4">
              {/* Boots */}
              <div>
                <p className="mb-2 text-xs text-white/40">Botas</p>
                <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <ItemDisplay item={fullBuild?.laneBuild.boots || rec.boots} size="lg" />
                  <div>
                    <span className="text-white">
                      {typeof fullBuild?.laneBuild.boots === 'string' 
                        ? fullBuild.laneBuild.boots 
                        : fullBuild?.laneBuild.boots?.name || rec.boots}
                    </span>
                    {fullBuild?.laneBuild.boots && typeof fullBuild.laneBuild.boots !== 'string' && fullBuild.laneBuild.boots.gold > 0 && (
                      <span className="ml-2 text-sm text-amber-400">{fullBuild.laneBuild.boots.gold}g</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Core Items */}
              <div>
                <p className="mb-2 text-xs text-white/40">Items core</p>
                <div className="flex flex-wrap gap-3">
                  {(fullBuild?.laneBuild.items || rec.coreItems.map(name => ({ name, image: getItemIcon(name), gold: 0, description: "" }))).map((item, idx) => (
                    <div key={typeof item === 'string' ? item : `${item.name}-${idx}`} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                      <ItemDisplay item={item} size="lg" />
                      <span className="max-w-[80px] text-center text-[10px] text-white/60 line-clamp-1">
                        {typeof item === 'string' ? item : item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Lane Tips */}
          {(fullBuild?.laneBuild.tips || rec.tips).length > 0 && (
            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Tips para la linea</h3>
              </div>

              <div className="space-y-2">
                {(fullBuild?.laneBuild.tips || rec.tips).slice(0, 5).map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00d4ff]" />
                    <span className="text-sm text-white/75">{tip}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}

      {activeTab === "team" && (
        <>
          {/* Team Build Items */}
          <GlassCard className="p-5" hover>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff4f6d]/10">
                  <Flame className="h-4 w-4 text-[#ff4f6d]" />
                </div>
                <h3 className="text-lg font-bold text-white">Build vs Equipo Enemigo</h3>
              </div>
            </div>

            {fullBuild?.teamBuild.description && (
              <p className="mb-4 text-sm text-white/60">{fullBuild.teamBuild.description}</p>
            )}

            <div className="space-y-4">
              {/* Core Items for Team */}
              <div>
                <p className="mb-2 text-xs text-white/40">Items recomendados</p>
                <div className="flex flex-wrap gap-3">
                  {(fullBuild?.teamBuild.items || rec.coreItems.map(name => ({ name, image: getItemIcon(name), gold: 0, description: "" }))).map((item, idx) => (
                    <div key={typeof item === 'string' ? item : `${item.name}-${idx}`} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                      <ItemDisplay item={item} size="lg" />
                      <span className="max-w-[80px] text-center text-[10px] text-white/60 line-clamp-1">
                        {typeof item === 'string' ? item : item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Situational Items */}
              <div>
                <p className="mb-2 text-xs text-white/40">Items situacionales</p>
                <div className="flex flex-wrap gap-3">
                  {(fullBuild?.teamBuild.situationalItems || rec.situationalItems.map(name => ({ name, image: getItemIcon(name), gold: 0, description: "" }))).map((item, idx) => (
                    <div key={typeof item === 'string' ? item : `${item.name}-${idx}`} className="flex flex-col items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                      <ItemDisplay item={item} size="md" />
                      <span className="max-w-[70px] text-center text-[10px] text-white/60 line-clamp-1">
                        {typeof item === 'string' ? item : item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Team Tips */}
          {(fullBuild?.teamBuild.tips || rec.tips).length > 0 && (
            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Tips vs Equipo</h3>
              </div>

              <div className="space-y-2">
                {(fullBuild?.teamBuild.tips || rec.tips).slice(0, 5).map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#ff4f6d]" />
                    <span className="text-sm text-white/75">{tip}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Matchup adjustments */}
          {rec.vsSpecific && rec.vsSpecific.length > 0 && (
            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00d4ff]/10">
                  <BookOpen className="h-4 w-4 text-[#00d4ff]" />
                </div>
                <h3 className="text-lg font-bold text-white">Ajustes por composicion</h3>
              </div>

              <div className="space-y-3">
                {rec.vsSpecific.map((entry) => (
                  <div
                    key={entry.label}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <p className="font-medium text-white">{entry.label}</p>
                    <p className="mt-1 text-sm text-white/50">{entry.reason}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.items.map((item, idx) => (
                        <div
                          key={`${entry.label}-${item}-${idx}`}
                          className="flex items-center gap-2 rounded-md bg-white/[0.05] px-2 py-1"
                        >
                          <img
                            src={getItemIcon(item)}
                            alt={item}
                            className="h-6 w-6 rounded"
                            crossOrigin="anonymous"
                          />
                          <span className="text-xs text-white/80">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* VS Specific Enemy Tab Content */}
      {activeTab === "vsEnemy" && selectedEnemyTarget && (
        <>
          {vsEnemyLoading ? (
            <GlassCard className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#00d4ff]" />
              <span className="ml-3 text-white/60">Analizando build de {selectedEnemyTarget}...</span>
            </GlassCard>
          ) : vsEnemyBuild ? (
            <>
              {/* Target Enemy Analysis Card */}
              <GlassCard className="border-[#00d4ff]/30 p-5" glow="primary">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={vsEnemyBuild.targetEnemy.championImage}
                        alt={vsEnemyBuild.targetEnemy.champion}
                        className="h-16 w-16 rounded-xl border-2 border-[#00d4ff]/50"
                        crossOrigin="anonymous"
                      />
                      {vsEnemyBuild.targetEnemy.isOffMeta && (
                        <div className="absolute -top-2 -right-2 rounded-full bg-amber-500 p-1">
                          <AlertTriangle className="h-3 w-3 text-black" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Build VS {vsEnemyBuild.targetEnemy.champion}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <BuildTypeBadge 
                          buildType={vsEnemyBuild.targetEnemy.detectedBuildType} 
                          isOffMeta={vsEnemyBuild.targetEnemy.isOffMeta} 
                        />
                        <span className="text-xs text-white/50">
                          {Math.round(vsEnemyBuild.targetEnemy.confidence * 100)}% confianza
                        </span>
                      </div>
                      {vsEnemyBuild.targetEnemy.expectedBuildType !== vsEnemyBuild.targetEnemy.detectedBuildType && (
                        <p className="text-xs text-amber-400 mt-1">
                          Normalmente es {vsEnemyBuild.targetEnemy.expectedBuildType.toUpperCase()}, pero esta yendo {vsEnemyBuild.targetEnemy.detectedBuildType.toUpperCase()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enemy's current items */}
                {vsEnemyBuild.targetEnemy.items.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs text-white/40">Items actuales del enemigo</p>
                    <div className="flex flex-wrap gap-2">
                      {vsEnemyBuild.targetEnemy.items.map((item, idx) => (
                        <ItemDisplay key={`enemy-item-${idx}`} item={item} size="md" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Counter tips for this enemy */}
                {vsEnemyBuild.targetEnemy.tips.length > 0 && (
                  <div className="rounded-lg bg-[#00d4ff]/5 p-3 border border-[#00d4ff]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-[#00d4ff]" />
                      <span className="text-sm font-medium text-[#00d4ff]">Tips contra {vsEnemyBuild.targetEnemy.champion}</span>
                    </div>
                    <div className="space-y-1">
                      {vsEnemyBuild.targetEnemy.tips.map((tip, idx) => (
                        <p key={idx} className="text-xs text-white/70">{tip}</p>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Recommended Counter Build */}
              <GlassCard className="p-5" hover>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00d4ff]/10">
                    <Shield className="h-4 w-4 text-[#00d4ff]" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Build Counter Recomendada</h3>
                </div>

                <div className="space-y-4">
                  {/* Core items */}
                  <div>
                    <p className="mb-2 text-xs text-white/40">Items Core</p>
                    <div className="flex flex-wrap gap-3">
                      {vsEnemyBuild.recommendedBuild.coreItems.map((item, idx) => (
                        <div key={`core-${idx}`} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                          <ItemDisplay item={item} size="lg" />
                          <span className="max-w-[80px] text-center text-[10px] text-white/60 line-clamp-1">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Counter items specific to this enemy */}
                  {vsEnemyBuild.recommendedBuild.counterItems.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs text-white/40">
                        Items Counter vs {vsEnemyBuild.targetEnemy.detectedBuildType.toUpperCase()}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {vsEnemyBuild.recommendedBuild.counterItems.map((item, idx) => (
                          <div key={`counter-${idx}`} className="flex flex-col items-center gap-1.5 rounded-lg border border-[#00d4ff]/30 bg-[#00d4ff]/10 p-2">
                            <ItemDisplay item={item} size="lg" />
                            <span className="max-w-[80px] text-center text-[10px] text-[#00d4ff] font-medium line-clamp-1">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Boots */}
                  {vsEnemyBuild.recommendedBuild.boots && (
                    <div>
                      <p className="mb-2 text-xs text-white/40">Botas</p>
                      <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <ItemDisplay item={vsEnemyBuild.recommendedBuild.boots} size="lg" />
                        <span className="text-white">{vsEnemyBuild.recommendedBuild.boots.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Runes for this matchup */}
              <GlassCard className="p-5" hover>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Wand2 className="h-4 w-4 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Runas</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs text-white/40">{vsEnemyBuild.recommendedBuild.runes.primaryTree}</p>
                    <RuneDisplay rune={vsEnemyBuild.recommendedBuild.runes.keystone} isKeystone />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {vsEnemyBuild.recommendedBuild.runes.primaryRunes.map((rune, idx) => (
                        <RuneDisplay key={`primary-${idx}`} rune={rune} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs text-white/40">{vsEnemyBuild.recommendedBuild.runes.secondaryTree}</p>
                    <div className="flex flex-wrap gap-2">
                      {vsEnemyBuild.recommendedBuild.runes.secondaryRunes.map((rune, idx) => (
                        <RuneDisplay key={`secondary-${idx}`} rune={rune} />
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Tips */}
              {vsEnemyBuild.recommendedBuild.tips.length > 0 && (
                <GlassCard className="p-5" hover>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Tips de Partida</h3>
                  </div>

                  <div className="space-y-2">
                    {vsEnemyBuild.recommendedBuild.tips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                      >
                        <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00d4ff]" />
                        <span className="text-sm text-white/75">{tip}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Team Context - other enemies analysis */}
              <GlassCard className="p-5" hover>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff4f6d]/10">
                      <Users className="h-4 w-4 text-[#ff4f6d]" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Contexto del Equipo Enemigo</h3>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    vsEnemyBuild.teamContext.primaryThreat === 'ap' 
                      ? 'bg-purple-500/20 text-purple-400'
                      : vsEnemyBuild.teamContext.primaryThreat === 'ad'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-pink-500/20 text-pink-400'
                  }`}>
                    {vsEnemyBuild.teamContext.primaryThreat === 'ap' ? 'Principalmente AP' :
                     vsEnemyBuild.teamContext.primaryThreat === 'ad' ? 'Principalmente AD' : 'Dano Mixto'}
                  </span>
                </div>

                {/* Other enemies */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {vsEnemyBuild.teamContext.enemies.map((enemy) => (
                    <div 
                      key={enemy.champion}
                      className={`flex flex-col items-center rounded-lg p-2 ${
                        enemy.champion === selectedEnemyTarget 
                          ? 'bg-[#00d4ff]/10 border border-[#00d4ff]/30' 
                          : 'bg-white/[0.02] border border-white/[0.06]'
                      }`}
                    >
                      <img
                        src={enemy.championImage}
                        alt={enemy.champion}
                        className="h-10 w-10 rounded-lg"
                        crossOrigin="anonymous"
                      />
                      <span className="mt-1 text-[10px] text-white/70 line-clamp-1">{enemy.champion}</span>
                      <BuildTypeBadge buildType={enemy.detectedBuildType} isOffMeta={enemy.isOffMeta} />
                    </div>
                  ))}
                </div>

                {/* Team priority items */}
                {vsEnemyBuild.teamContext.teamPriorityItems.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-white/40">Items prioritarios vs TODO el equipo</p>
                    <div className="flex flex-wrap gap-2">
                      {vsEnemyBuild.teamContext.teamPriorityItems.map((item, idx) => (
                        <div key={`team-priority-${idx}`} className="flex items-center gap-2 rounded-lg border border-[#ff4f6d]/20 bg-[#ff4f6d]/5 px-2 py-1.5">
                          <ItemDisplay item={item} size="sm" />
                          <span className="text-xs text-white/70">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team tips */}
                {vsEnemyBuild.teamContext.teamTips.length > 0 && (
                  <div className="mt-4 rounded-lg bg-[#ff4f6d]/5 p-3 border border-[#ff4f6d]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-[#ff4f6d]" />
                      <span className="text-sm font-medium text-[#ff4f6d]">Tips vs Equipo Completo</span>
                    </div>
                    <div className="space-y-1">
                      {vsEnemyBuild.teamContext.teamTips.map((tip, idx) => (
                        <p key={idx} className="text-xs text-white/70">{tip}</p>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </>
          ) : (
            <GlassCard className="p-5">
              <p className="text-white/60 text-center">No se pudo cargar la build vs {selectedEnemyTarget}</p>
            </GlassCard>
          )}
        </>
      )}

      {/* General Tips (when no live game) */}
      {!hasEnemyContext && (
        <>
          {/* Starting items and spells */}
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Zap className="h-4 w-4 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Inicio</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs text-white/40">Items iniciales</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.startingItems.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 rounded-md bg-white/[0.06] px-2 py-1"
                      >
                        <img
                          src={getItemIcon(item)}
                          alt={item}
                          className="h-6 w-6 rounded"
                          crossOrigin="anonymous"
                        />
                        <span className="text-sm text-white/80">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs text-white/40">Hechizos</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.summonerSpells.map((spell) => (
                      <span
                        key={spell}
                        className="rounded-md bg-[#00d4ff]/10 px-2 py-1 text-sm text-[#00d4ff]"
                      >
                        {spell}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            {rec.runeDetails && (
              <GlassCard className="p-5" hover>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Wand2 className="h-4 w-4 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Runas</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-xs text-white/40">{rec.runeDetails.primary}</p>
                    <p className="font-medium text-amber-400">{rec.runeDetails.keystone}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rec.runeDetails.primaryRunes.map((rune) => (
                        <span
                          key={rune}
                          className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white/70"
                        >
                          {rune}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-white/40">{rec.runeDetails.secondary}</p>
                    <div className="flex flex-wrap gap-2">
                      {rec.runeDetails.secondaryRunes.map((rune) => (
                        <span
                          key={rune}
                          className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white/70"
                        >
                          {rune}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Core Build */}
          <div className="grid gap-4 lg:grid-cols-3">
            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#00d4ff]" />
                <h3 className="text-lg font-bold text-white">Botas</h3>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <img
                  src={getItemIcon(rec.boots)}
                  alt={rec.boots}
                  className="h-10 w-10 rounded"
                  crossOrigin="anonymous"
                />
                <span className="text-white">{rec.boots}</span>
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <Swords className="h-4 w-4 text-[#ff4f6d]" />
                <h3 className="text-lg font-bold text-white">Core</h3>
              </div>

              <div className="space-y-2">
                {rec.coreItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2"
                  >
                    <img
                      src={getItemIcon(item)}
                      alt={item}
                      className="h-9 w-9 rounded"
                      crossOrigin="anonymous"
                    />
                    <span className="text-sm text-white/85">{item}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover>
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Situacionales</h3>
              </div>

              <div className="space-y-2">
                {rec.situationalItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2"
                  >
                    <img
                      src={getItemIcon(item)}
                      alt={item}
                      className="h-9 w-9 rounded"
                      crossOrigin="anonymous"
                    />
                    <span className="text-sm text-white/85">{item}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Tips */}
          <GlassCard className="p-5" hover>
            <div className="mb-4 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Tips</h3>
            </div>

            <div className="space-y-2">
              {rec.tips.map((tip, index) => (
                <div
                  key={`${index}-${tip}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/75"
                >
                  {tip}
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
