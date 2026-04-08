import type { TeamPlayerSnapshot } from "../../types/riot";
import GlassCard from "../shared/GlassCard";
import TeamPlayerCard from "./TeamPlayerCard";

export default function TeamPanel({
  title,
  players,
}: {
  title: string;
  players: TeamPlayerSnapshot[];
}) {
  return (
    <GlassCard className="p-5">
      <div className="text-xl font-bold">{title}</div>

      <div className="mt-4 grid gap-4">
        {players.length === 0 ? (
          <div className="text-white/45">No data</div>
        ) : (
          players.map((player) => (
            <TeamPlayerCard
              key={`${title}-${player.summonerName}-${player.championName}`}
              player={player}
            />
          ))
        )}
      </div>
    </GlassCard>
  );
}