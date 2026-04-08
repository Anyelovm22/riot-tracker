import { Shield, Trophy } from "lucide-react";
import type { RankEntry } from "../../types/riot";
import { tierLabel, winrate } from "../../utils/format";
import GlassCard from "../shared/GlassCard";

const TIER_COLORS: Record<string, string> = {
  IRON: "#5c5c5c",
  BRONZE: "#cd7f32",
  SILVER: "#c0c0c0",
  GOLD: "#ffd700",
  PLATINUM: "#00c9a7",
  EMERALD: "#50c878",
  DIAMOND: "#b9f2ff",
  MASTER: "#9d4dbb",
  GRANDMASTER: "#ff4040",
  CHALLENGER: "#f0e68c"
};

export default function RankCard({
  title,
  entry,
  accent
}: {
  title: string;
  entry: RankEntry | null;
  accent: "primary" | "secondary";
}) {
  const wins = entry?.wins ?? 0;
  const losses = entry?.losses ?? 0;
  const total = wins + losses;
  const progress = total ? (wins / total) * 100 : 0;
  const tierColor = entry?.tier ? TIER_COLORS[entry.tier.toUpperCase()] || "#00d4ff" : "#666";

  const accentColor = accent === "primary" ? "#00d4ff" : "#ff4f6d";
  const accentColorLight = accent === "primary" ? "rgba(0,212,255,0.1)" : "rgba(255,79,109,0.1)";

  return (
    <GlassCard className="p-6" glow={accent}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/50">
          {accent === "primary" ? (
            <Trophy className="h-4 w-4" style={{ color: accentColor }} />
          ) : (
            <Shield className="h-4 w-4" style={{ color: accentColor }} />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        </div>
        {entry && (
          <div 
            className="rounded-md px-2 py-1 text-xs font-bold"
            style={{ backgroundColor: accentColorLight, color: accentColor }}
          >
            {entry.leaguePoints} LP
          </div>
        )}
      </div>

      {/* Rank display */}
      <div className="mb-4">
        <div 
          className="text-3xl font-black tracking-tight text-glow-primary"
          style={{ color: tierColor }}
        >
          {tierLabel(entry)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${accentColor}, ${tierColor})`
          }} 
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#00d4ff]">{wins}V</span>
        <span className="text-white/40">{total} partidas</span>
        <span className="font-semibold text-[#ff4f6d]">{losses}D</span>
      </div>
      
      {/* Win rate badge */}
      {total > 0 && (
        <div className="mt-3 flex justify-center">
          <div className="rounded-full bg-white/[0.04] px-3 py-1 text-sm font-medium text-white/60">
            {winrate(wins, losses)}% Win Rate
          </div>
        </div>
      )}
    </GlassCard>
  );
}
