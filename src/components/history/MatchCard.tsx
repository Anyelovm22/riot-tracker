import { Clock, Crosshair, Eye, Coins, Sword } from "lucide-react";
import type { MatchRow } from "../../types/riot";
import { formatK } from "../../utils/format";
import GlassCard from "../shared/GlassCard";

const ddVersion = "16.6.1";
const ddragonItem = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/item/${id}.png`;

export default function MatchCard({ match }: { match: MatchRow }) {
  const kda = ((match.kills + match.assists) / Math.max(1, match.deaths)).toFixed(2);
  const isWin = match.result === "W";
  const accentColor = isWin ? "#00d4ff" : "#ff4f6d";

  return (
    <GlassCard className="overflow-hidden p-0" hover>
      <div 
        className="flex flex-col gap-4 border-l-4 px-4 py-4 lg:flex-row lg:items-center lg:gap-6 lg:px-6"
        style={{ borderColor: accentColor }}
      >
        {/* Champion info */}
        <div className="flex min-w-[220px] items-center gap-4">
          <div className="relative">
            <img 
              src={match.championIcon} 
              alt={match.championName} 
              className="h-14 w-14 rounded-xl object-cover ring-2"
              style={{ ringColor: `${accentColor}40` }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{match.championName}</span>
              <span 
                className="rounded px-1.5 py-0.5 text-xs font-bold"
                style={{ 
                  backgroundColor: `${accentColor}20`,
                  color: accentColor
                }}
              >
                {isWin ? "Victoria" : "Derrota"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
              <Clock className="h-3 w-3" />
              <span>{match.queueLabel}</span>
              <span>-</span>
              <span>{match.ago}</span>
            </div>
          </div>
        </div>

        {/* KDA */}
        <div className="flex items-center gap-6 lg:flex-1">
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              <span className="text-[#00d4ff]">{match.kills}</span>
              <span className="text-white/30"> / </span>
              <span className="text-[#ff4f6d]">{match.deaths}</span>
              <span className="text-white/30"> / </span>
              <span className="text-amber-400">{match.assists}</span>
            </div>
            <div className="text-xs text-white/40">{kda} KDA</div>
          </div>

          {/* Stats */}
          <div className="hidden flex-1 items-center justify-center gap-6 lg:flex">
            <StatPill icon={Crosshair} value={match.cs} label="CS" />
            <StatPill icon={Sword} value={formatK(match.damage)} label="DMG" />
            <StatPill icon={Coins} value={formatK(match.gold)} label="Gold" />
            <StatPill icon={Eye} value={match.vision} label="Vision" />
          </div>
        </div>

        {/* Items */}
        <div className="flex flex-wrap items-center gap-1.5 lg:w-[200px] lg:justify-end">
          {match.items.map((item, i) => (
            <img 
              key={`${match.matchId}-${item}-${i}`} 
              src={ddragonItem(item)} 
              alt={`Item ${item}`} 
              className="h-8 w-8 rounded-md border border-white/[0.06] bg-black/40 transition-transform hover:scale-110" 
            />
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function StatPill({ 
  icon: Icon, 
  value, 
  label 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  value: string | number; 
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-white/40" />
      <div className="text-center">
        <div className="text-sm font-semibold text-white">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/30">{label}</div>
      </div>
    </div>
  );
}
