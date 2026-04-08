import { Award, Globe, Star } from "lucide-react";
import type { Profile } from "../../types/riot";
import GlassCard from "../shared/GlassCard";

const ddVersion = "16.6.1";
const ddragonProfileIcon = (id: number) =>
  `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/profileicon/${id}.png`;

export default function SummonerCard({ 
  profile,
  challenges 
}: { 
  profile: Profile;
  challenges?: { totalPoints: number; level: string; percentile: number };
}) {
  return (
    <GlassCard className="relative overflow-hidden p-6" glow="primary">
      {/* Background glow effect */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#00d4ff]/10 blur-3xl" />
      
      <div className="relative flex items-start gap-5">
        {/* Profile icon with level badge */}
        <div className="relative flex-shrink-0">
          <img
            src={ddragonProfileIcon(profile.profileIconId)}
            alt={profile.gameName}
            className="h-20 w-20 rounded-xl border-2 border-[#00d4ff]/30 object-cover shadow-[0_0_20px_rgba(0,212,255,0.2)]"
          />
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#00b4d8] text-xs font-bold text-black shadow-lg">
            {profile.summonerLevel}
          </div>
        </div>

        {/* Profile info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {profile.gameName}
            </h1>
            <span className="text-lg font-medium text-white/30">#{profile.tagLine}</span>
          </div>
          
          {/* Stats row */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-white/50">
              <Globe className="h-4 w-4" />
              <span>{profile.region}</span>
            </div>
            
            {challenges && challenges.totalPoints > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-[#00d4ff]">
                  <Award className="h-4 w-4" />
                  <span className="font-medium">{challenges.totalPoints.toLocaleString()} pts</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="h-4 w-4" />
                  <span className="font-medium">{challenges.level}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
