import { Clock, Star } from "lucide-react";
import type { ChampionMasteryRow } from "../../types/riot";
import { formatK } from "../../utils/format";
import GlassCard from "../shared/GlassCard";

const RANK_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32", "#00d4ff", "#00d4ff"];

export default function ChampionCard({ champion, index }: { champion: ChampionMasteryRow; index: number }) {
  const rankColor = RANK_COLORS[index] || "#00d4ff";

  return (
    <GlassCard className="group overflow-hidden p-0" hover>
      {/* Champion image with overlay */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img 
          src={champion.championIcon} 
          alt={champion.championName} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* Rank badge */}
        <div 
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg font-bold text-black"
          style={{ backgroundColor: rankColor }}
        >
          #{index + 1}
        </div>

        {/* Mastery level badge */}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-sm font-bold text-amber-400">{champion.masteryLevel}</span>
        </div>

        {/* Champion info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white">{champion.championName}</h3>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span className="font-semibold text-[#00d4ff]">{formatK(champion.championPoints)} pts</span>
            <span className="flex items-center gap-1 text-white/50">
              <Clock className="h-3 w-3" />
              {champion.lastPlayTimeLabel}
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
