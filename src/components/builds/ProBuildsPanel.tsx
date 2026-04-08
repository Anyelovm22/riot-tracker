import { useMemo, useState, useEffect } from "react";
import type { SearchResponse } from "../../types/riot";
import { getChampionIcon, getItemIcon } from "../../utils/ddragon";
import { getFullBuild, type FullBuildResponse, type ItemWithImage, type RuneWithImage } from "../../services/buildApi";
import { ShoppingCart, Sword, Shield, Zap, Target, TrendingUp, Star, ChevronRight } from "lucide-react";

// DDragon version for rune icons
const DD_VERSION = "16.6.1";

// Role styling
const ROLE_ORDER = ["Top", "Jungle", "Mid", "ADC", "Support", "Unknown"] as const;
const ROLE_COLORS: Record<string, string> = {
  Top: "from-amber-500 to-orange-600",
  Jungle: "from-green-500 to-emerald-600",
  Mid: "from-blue-500 to-indigo-600",
  ADC: "from-red-500 to-rose-600",
  Support: "from-cyan-500 to-teal-600",
  Unknown: "from-gray-500 to-slate-600"
};

const ROLE_LABELS: Record<string, string> = {
  Top: "TOP",
  Jungle: "JNG",
  Mid: "MID",
  ADC: "BOT",
  Support: "SUP",
  Unknown: "?"
};

// Rune name to key mapping for icon URLs
const RUNE_KEYS: Record<string, { path: string; id: string }> = {
  // Precision
  "Press the Attack": { path: "Precision", id: "PressTheAttack" },
  "Lethal Tempo": { path: "Precision", id: "LethalTempo" },
  "Fleet Footwork": { path: "Precision", id: "FleetFootwork" },
  "Conqueror": { path: "Precision", id: "Conqueror" },
  "Triumph": { path: "Precision", id: "Triumph" },
  "Presence of Mind": { path: "Precision", id: "PresenceOfMind" },
  "Legend: Alacrity": { path: "Precision", id: "LegendAlacrity" },
  "Legend: Tenacity": { path: "Precision", id: "LegendTenacity" },
  "Legend: Bloodline": { path: "Precision", id: "LegendBloodline" },
  "Coup de Grace": { path: "Precision", id: "CoupDeGrace" },
  "Cut Down": { path: "Precision", id: "CutDown" },
  "Last Stand": { path: "Precision", id: "LastStand" },
  // Domination
  "Electrocute": { path: "Domination", id: "Electrocute" },
  "Predator": { path: "Domination", id: "Predator" },
  "Dark Harvest": { path: "Domination", id: "DarkHarvest" },
  "Hail of Blades": { path: "Domination", id: "HailOfBlades" },
  "Cheap Shot": { path: "Domination", id: "CheapShot" },
  "Taste of Blood": { path: "Domination", id: "TasteOfBlood" },
  "Sudden Impact": { path: "Domination", id: "SuddenImpact" },
  "Eyeball Collection": { path: "Domination", id: "EyeballCollection" },
  "Zombie Ward": { path: "Domination", id: "ZombieWard" },
  "Ghost Poro": { path: "Domination", id: "GhostPoro" },
  "Treasure Hunter": { path: "Domination", id: "TreasureHunter" },
  "Relentless Hunter": { path: "Domination", id: "RelentlessHunter" },
  "Ultimate Hunter": { path: "Domination", id: "UltimateHunter" },
  // Sorcery
  "Summon Aery": { path: "Sorcery", id: "SummonAery" },
  "Arcane Comet": { path: "Sorcery", id: "ArcaneComet" },
  "Phase Rush": { path: "Sorcery", id: "PhaseRush" },
  "Nullifying Orb": { path: "Sorcery", id: "NullifyingOrb" },
  "Manaflow Band": { path: "Sorcery", id: "ManaflowBand" },
  "Nimbus Cloak": { path: "Sorcery", id: "NimbusCloak" },
  "Transcendence": { path: "Sorcery", id: "Transcendence" },
  "Celerity": { path: "Sorcery", id: "Celerity" },
  "Absolute Focus": { path: "Sorcery", id: "AbsoluteFocus" },
  "Scorch": { path: "Sorcery", id: "Scorch" },
  "Waterwalking": { path: "Sorcery", id: "Waterwalking" },
  "Gathering Storm": { path: "Sorcery", id: "GatheringStorm" },
  // Resolve
  "Grasp of the Undying": { path: "Resolve", id: "GraspOfTheUndying" },
  "Aftershock": { path: "Resolve", id: "Aftershock" },
  "Guardian": { path: "Resolve", id: "Guardian" },
  "Demolish": { path: "Resolve", id: "Demolish" },
  "Font of Life": { path: "Resolve", id: "FontOfLife" },
  "Shield Bash": { path: "Resolve", id: "ShieldBash" },
  "Conditioning": { path: "Resolve", id: "Conditioning" },
  "Second Wind": { path: "Resolve", id: "SecondWind" },
  "Bone Plating": { path: "Resolve", id: "BonePlating" },
  "Overgrowth": { path: "Resolve", id: "Overgrowth" },
  "Revitalize": { path: "Resolve", id: "Revitalize" },
  "Unflinching": { path: "Resolve", id: "Unflinching" },
  // Inspiration
  "Glacial Augment": { path: "Inspiration", id: "GlacialAugment" },
  "Unsealed Spellbook": { path: "Inspiration", id: "UnsealedSpellbook" },
  "First Strike": { path: "Inspiration", id: "FirstStrike" },
  "Hextech Flashtraption": { path: "Inspiration", id: "HextechFlashtraption" },
  "Magical Footwear": { path: "Inspiration", id: "MagicalFootwear" },
  "Biscuit Delivery": { path: "Inspiration", id: "BiscuitDelivery" },
  "Cosmic Insight": { path: "Inspiration", id: "CosmicInsight" },
  "Approach Velocity": { path: "Inspiration", id: "ApproachVelocity" },
  "Time Warp Tonic": { path: "Inspiration", id: "TimeWarpTonic" },
};

function getRuneIcon(runeName: string): string {
  const runeInfo = RUNE_KEYS[runeName];
  if (runeInfo) {
    return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${runeInfo.path}/${runeInfo.id}/${runeInfo.id}.png`;
  }
  return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/profileicon/0.png`;
}

function getTreeIcon(treeName: string): string {
  const treeMap: Record<string, string> = {
    "Precision": "7201_Precision",
    "Domination": "7200_Domination", 
    "Sorcery": "7202_Sorcery",
    "Resolve": "7204_Resolve",
    "Inspiration": "7203_Whimsy"
  };
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${treeMap[treeName] || "7201_Precision"}.png`;
}

function normalizePosition(pos: string | undefined): string {
  if (!pos) return "Unknown";
  const p = pos.toLowerCase();
  if (p.includes("top")) return "Top";
  if (p.includes("jungle") || p.includes("jg")) return "Jungle";
  if (p.includes("mid")) return "Mid";
  if (p.includes("adc") || p.includes("bottom") || p.includes("bot") || p.includes("carry")) return "ADC";
  if (p.includes("sup") || p.includes("utility")) return "Support";
  return "Unknown";
}

// Enhanced Item component with image and tooltip
function ItemCard({ 
  name, 
  image, 
  gold, 
  size = "md",
  showName = false,
  highlight = false
}: { 
  name: string; 
  image?: string; 
  gold?: number;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  highlight?: boolean;
}) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-11 w-11",
    lg: "h-14 w-14",
    xl: "h-16 w-16"
  };

  const itemImage = image || getItemIcon(name);

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className={`relative ${highlight ? "ring-2 ring-[#00d4ff] ring-offset-2 ring-offset-[#0a0a0f]" : ""} rounded-lg`}>
        <img
          src={itemImage}
          alt={name}
          className={`${sizes[size]} rounded-lg border border-white/20 transition-all group-hover:border-[#00d4ff] group-hover:scale-110 bg-black/50`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = getItemIcon("Health Potion");
          }}
        />
        {gold && (
          <span className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">
            {gold}
          </span>
        )}
      </div>
      {showName && (
        <span className="text-[10px] text-white/60 text-center max-w-[60px] truncate">{name}</span>
      )}
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-[#0a0a0f] border border-white/20 rounded-lg p-3 shadow-xl min-w-[160px] whitespace-nowrap">
          <p className="text-sm font-semibold text-white">{name}</p>
          {gold && (
            <p className="text-xs text-yellow-400 mt-1">{gold}g</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced Rune component with image
function RuneCard({ 
  name, 
  tree,
  isKeystone = false,
  showName = false
}: { 
  name: string; 
  tree?: string;
  isKeystone?: boolean;
  showName?: boolean;
}) {
  const icon = getRuneIcon(name);

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <img
        src={icon}
        alt={name}
        className={`${isKeystone ? "h-14 w-14" : "h-9 w-9"} rounded-full border-2 ${
          isKeystone ? "border-yellow-500/60 shadow-lg shadow-yellow-500/20" : "border-white/20"
        } transition-all group-hover:border-[#00d4ff] group-hover:scale-110 bg-black/50`}
        onError={(e) => {
          (e.target as HTMLImageElement).src = getTreeIcon(tree || "Precision");
        }}
      />
      {showName && (
        <span className="text-[10px] text-white/60 text-center max-w-[70px] truncate">{name}</span>
      )}
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-[#0a0a0f] border border-white/20 rounded-lg p-3 shadow-xl min-w-[180px]">
          <p className="text-sm font-semibold text-white">{name}</p>
          {tree && <p className="text-xs text-[#00d4ff] mt-0.5">{tree}</p>}
        </div>
      </div>
    </div>
  );
}

// Pro player badge
function ProPlayerBadge({ name, team, region }: { name: string; team: string; region: string }) {
  return (
    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-xs">
        {name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="text-xs text-white/50">{team} - {region}</p>
      </div>
    </div>
  );
}

// Build order arrow
function BuildArrow() {
  return (
    <div className="flex items-center justify-center">
      <ChevronRight className="h-4 w-4 text-white/30" />
    </div>
  );
}

export default function ProBuildsPanel({ data }: { data: SearchResponse }) {
  const rec = data.recommendation;
  const liveGame = data.liveGame;
  const [fullBuild, setFullBuild] = useState<FullBuildResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Get player's champion from live game or recommendation
  const playerChampion = useMemo(() => {
    return liveGame.playerChampion || rec.champion;
  }, [liveGame.playerChampion, rec.champion]);

  const playerRole = useMemo(() => {
    if (liveGame.isInGame && liveGame.playerRole) {
      return normalizePosition(liveGame.playerRole);
    }
    return "Mid";
  }, [liveGame]);

  // Sort enemies by role
  const sortedEnemies = useMemo(() => {
    const enemies = liveGame?.enemies ?? [];
    return [...enemies].sort((a, b) => {
      const roleA = normalizePosition(a.position);
      const roleB = normalizePosition(b.position);
      return ROLE_ORDER.indexOf(roleA as typeof ROLE_ORDER[number]) - ROLE_ORDER.indexOf(roleB as typeof ROLE_ORDER[number]);
    });
  }, [liveGame?.enemies]);

  // Find lane opponent
  const laneOpponent = useMemo(() => {
    if (liveGame.enemyLaner) {
      return sortedEnemies.find(e => e.championName === liveGame.enemyLaner) || null;
    }
    return sortedEnemies.find(e => normalizePosition(e.position) === playerRole) || null;
  }, [sortedEnemies, playerRole, liveGame.enemyLaner]);

  // Fetch full build data
  useEffect(() => {
    const fetchBuild = async () => {
      setLoading(true);
      try {
        const build = await getFullBuild(playerChampion);
        setFullBuild(build);
      } catch (error) {
        console.error("Failed to fetch build:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBuild();
  }, [playerChampion]);

  if (loading) {
    return (
      <div className="mt-6 flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#00d4ff]" />
          <p className="text-white/50">Cargando Pro Builds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={getChampionIcon(playerChampion)}
              alt={playerChampion}
              className="h-16 w-16 rounded-xl border-2 border-[#00d4ff]/50 shadow-lg shadow-[#00d4ff]/20"
            />
            <div className={`absolute -bottom-1 -right-1 rounded-full bg-gradient-to-r ${ROLE_COLORS[playerRole]} px-2 py-0.5 text-[10px] font-bold text-white shadow-lg`}>
              {ROLE_LABELS[playerRole]}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Pro Build</h2>
            <p className="text-white/50">
              <span className="text-[#00d4ff]">{playerChampion}</span>
              {laneOpponent && (
                <span className="text-[#ff4f6d]"> vs {laneOpponent.championName}</span>
              )}
            </p>
          </div>
        </div>

        {/* Win Rate Stats */}
        {fullBuild && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{fullBuild.winRate?.toFixed(1) || "51.2"}%</p>
              <p className="text-xs text-white/40">Win Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{fullBuild.pickRate?.toFixed(1) || "8.5"}%</p>
              <p className="text-xs text-white/40">Pick Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{fullBuild.banRate?.toFixed(1) || "5.2"}%</p>
              <p className="text-xs text-white/40">Ban Rate</p>
            </div>
          </div>
        )}
      </div>

      {/* Pro Players Section */}
      {fullBuild?.proPlayers && fullBuild.proPlayers.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Jugadores Pro
          </h3>
          <div className="flex flex-wrap gap-3">
            {fullBuild.proPlayers.map((player, idx) => (
              <ProPlayerBadge key={idx} name={player.name} team={player.team} region={player.region} />
            ))}
          </div>
        </div>
      )}

      {/* Runas Section - Full Width */}
      <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-white/10 p-5">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <Star className="h-5 w-5 text-purple-400" />
          Runas Recomendadas
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Tree */}
          <div className="bg-gradient-to-br from-[#00d4ff]/5 to-transparent rounded-xl p-4 border border-[#00d4ff]/20">
            <div className="flex items-center gap-2 mb-4">
              <img src={getTreeIcon(fullBuild?.runes?.primary || rec.runeDetails?.primary || "Precision")} alt="" className="h-6 w-6" />
              <span className="text-sm font-medium text-[#00d4ff]">{fullBuild?.runes?.primary || rec.runeDetails?.primary || "Principal"}</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Keystone */}
              <RuneCard 
                name={fullBuild?.runes?.keystone || rec.runeDetails?.keystone || rec.keystone || "Electrocute"} 
                tree={fullBuild?.runes?.primary || rec.runeDetails?.primary}
                isKeystone 
                showName
              />
              {/* Primary Runes */}
              <div className="flex flex-col gap-2 flex-1">
                {(fullBuild?.runes?.primaryRunes || rec.runeDetails?.primaryRunes || []).map((runeName, idx) => (
                  <RuneCard key={idx} name={runeName} tree={fullBuild?.runes?.primary || rec.runeDetails?.primary} showName />
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Tree */}
          <div className="bg-gradient-to-br from-[#ff4f6d]/5 to-transparent rounded-xl p-4 border border-[#ff4f6d]/20">
            <div className="flex items-center gap-2 mb-4">
              <img src={getTreeIcon(fullBuild?.runes?.secondary || rec.runeDetails?.secondary || "Sorcery")} alt="" className="h-6 w-6" />
              <span className="text-sm font-medium text-[#ff4f6d]">{fullBuild?.runes?.secondary || rec.runeDetails?.secondary || "Secundario"}</span>
            </div>
            <div className="flex items-center gap-3">
              {(fullBuild?.runes?.secondaryRunes || rec.runeDetails?.secondaryRunes || []).map((runeName, idx) => (
                <RuneCard key={idx} name={runeName} tree={fullBuild?.runes?.secondary || rec.runeDetails?.secondary} showName />
              ))}
            </div>
            {/* Stat Shards */}
            {(fullBuild?.runes?.statShards) && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <span className="text-xs text-white/40 block mb-2">Fragmentos de Estadisticas</span>
                <div className="flex gap-2 flex-wrap">
                  {fullBuild.runes.statShards.map((shard, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/10 rounded-full text-[10px] text-white/70">{shard}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Build Order Section - MAIN FOCUS */}
      <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-yellow-500/20 p-5">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-yellow-400" />
          Orden de Compra Recomendado
        </h3>

        {/* Starting Items */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">INICIO</span>
            <span className="text-sm text-white/50">Items iniciales</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(rec.startingItems || ["Doran's Ring", "Health Potion x2"]).map((item, idx) => (
              <ItemCard key={idx} name={item} size="md" showName />
            ))}
          </div>
        </div>

        {/* Core Build with Arrows */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">CORE</span>
            <span className="text-sm text-white/50">Build principal - comprar en este orden</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap bg-white/5 rounded-xl p-4 border border-white/10">
            {(rec.coreItems || []).map((item, idx, arr) => (
              <div key={idx} className="flex items-center gap-2">
                <ItemCard name={item} size="xl" showName highlight={idx === 0} />
                {idx < arr.length - 1 && <BuildArrow />}
              </div>
            ))}
          </div>
        </div>

        {/* Boots */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded">BOTAS</span>
            <span className="text-sm text-white/50">Comprar despues del primer item o componentes</span>
          </div>
          <ItemCard name={rec.boots || "Sorcerer's Shoes"} size="lg" showName />
        </div>

        {/* Situational Items */}
        {rec.situationalItems && rec.situationalItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-bold rounded">SITUACIONAL</span>
              <span className="text-sm text-white/50">Segun la partida</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {rec.situationalItems.map((item, idx) => (
                <ItemCard key={idx} name={item} size="md" showName />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Counter Build Section */}
      <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-white/10 p-5">
        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <Target className="h-5 w-5 text-red-400" />
          Items Contra el Equipo Enemigo
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* VS AP */}
          <div className="bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-purple-400">VS MAGIA (AP)</span>
            </div>
            <div className="flex flex-col gap-2">
              {(rec.vsSpecific?.find(v => v.label.includes("AP"))?.items || ["Banshee's Veil", "Mercury's Treads"]).slice(0, 2).map((item, idx) => (
                <ItemCard key={idx} name={item} size="sm" showName />
              ))}
            </div>
          </div>

          {/* VS AD */}
          <div className="bg-gradient-to-br from-orange-500/10 to-transparent rounded-xl p-4 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sword className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-bold text-orange-400">VS FISICO (AD)</span>
            </div>
            <div className="flex flex-col gap-2">
              {(rec.vsSpecific?.find(v => v.label.includes("AD"))?.items || ["Zhonya's Hourglass"]).slice(0, 2).map((item, idx) => (
                <ItemCard key={idx} name={item} size="sm" showName />
              ))}
            </div>
          </div>

          {/* VS Tanks */}
          <div className="bg-gradient-to-br from-slate-500/10 to-transparent rounded-xl p-4 border border-slate-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-400">VS TANQUES</span>
            </div>
            <div className="flex flex-col gap-2">
              {(rec.vsSpecific?.find(v => v.label.includes("Tank"))?.items || ["Void Staff", "Liandry's Anguish"]).slice(0, 2).map((item, idx) => (
                <ItemCard key={idx} name={item} size="sm" showName />
              ))}
            </div>
          </div>

          {/* VS Healers */}
          <div className="bg-gradient-to-br from-green-500/10 to-transparent rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs font-bold text-green-400">VS CURACION</span>
            </div>
            <div className="flex flex-col gap-2">
              {(rec.vsSpecific?.find(v => v.label.includes("Heal"))?.items || ["Morellonomicon"]).slice(0, 2).map((item, idx) => (
                <ItemCard key={idx} name={item} size="sm" showName />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enemy Team Analysis */}
      {liveGame.isInGame && sortedEnemies.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-red-500/20 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Equipo Enemigo (Live)
          </h3>

          <div className="grid grid-cols-5 gap-3">
            {sortedEnemies.map((enemy) => {
              const role = normalizePosition(enemy.position);
              const isLaneOpponent = enemy.championName === laneOpponent?.championName;

              return (
                <div
                  key={`${enemy.summonerName}-${enemy.championName}`}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    isLaneOpponent
                      ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/50 ring-2 ring-red-500/30"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  {isLaneOpponent && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full uppercase">
                        Tu Rival
                      </span>
                    </div>
                  )}

                  <img
                    src={getChampionIcon(enemy.championName)}
                    alt={enemy.championName}
                    className={`h-12 w-12 rounded-xl border ${isLaneOpponent ? "border-red-500" : "border-white/20"}`}
                  />

                  <span className="text-sm font-medium text-white text-center">{enemy.championName}</span>

                  <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${ROLE_COLORS[role]} text-[10px] font-bold text-white`}>
                    {ROLE_LABELS[role]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Counter Items Section */}
      {fullBuild?.items && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VS AP Items */}
          {fullBuild.items.vsAP && fullBuild.items.vsAP.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-500" />
                Contra AP
              </h3>
              <div className="flex gap-2">
                {fullBuild.items.vsAP.map((item, idx) => (
                  <ItemSlot key={idx} item={item} size="md" />
                ))}
              </div>
            </div>
          )}

          {/* VS AD Items */}
          {fullBuild.items.vsAD && fullBuild.items.vsAD.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-orange-500/5 to-red-500/5 border border-orange-500/20 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-500" />
                Contra AD
              </h3>
              <div className="flex gap-2">
                {fullBuild.items.vsAD.map((item, idx) => (
                  <ItemSlot key={idx} item={item} size="md" />
                ))}
              </div>
            </div>
          )}

          {/* VS Tanks Items */}
          {fullBuild.items.vsTanks && fullBuild.items.vsTanks.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-slate-500/5 to-gray-500/5 border border-slate-500/20 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-500" />
                Contra Tanques
              </h3>
              <div className="flex gap-2">
                {fullBuild.items.vsTanks.map((item, idx) => (
                  <ItemSlot key={idx} item={item} size="md" />
                ))}
              </div>
            </div>
          )}

          {/* VS Healers Items */}
          {fullBuild.items.vsHealers && fullBuild.items.vsHealers.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/20 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500" />
                Contra Curación
              </h3>
              <div className="flex gap-2">
                {fullBuild.items.vsHealers.map((item, idx) => (
                  <ItemSlot key={idx} item={item} size="md" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips Section */}
      {fullBuild?.tips && fullBuild.tips.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-white/10 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tips de Pro
          </h3>
          <ul className="space-y-2">
            {fullBuild.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-[#00d4ff]/20 flex items-center justify-center text-[10px] font-bold text-[#00d4ff]">
                  {idx + 1}
                </span>
                <span className="text-sm text-white/70">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summoner Spells & Skill Order */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summoner Spells */}
        {fullBuild?.summonerSpells && (
          <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Hechizos de Invocador</h3>
            <div className="flex gap-3">
              {fullBuild.summonerSpells.map((spell, idx) => (
                <div key={idx} className="px-4 py-2 bg-white/5 rounded-lg text-sm text-white/80 border border-white/10">
                  {spell}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill Order */}
        {fullBuild?.skillOrder && (
          <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Orden de Habilidades</h3>
            <div className="flex items-center gap-2">
              {fullBuild.skillOrder.split(" > ").map((skill, idx, arr) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-gradient-to-br from-[#00d4ff]/20 to-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-lg text-sm font-bold text-[#00d4ff]">
                    {skill}
                  </span>
                  {idx < arr.length - 1 && (
                    <svg className="h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
