import type { TeamPlayerSnapshot } from "../../types/riot";

const ddVersion = "16.6.1";
const ddragonChampion = (name: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${name}.png`;

const ddragonItem = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/item/${id}.png`;

export default function TeamPlayerCard({
  player,
}: {
  player: TeamPlayerSnapshot;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <img
          src={ddragonChampion(player.championName)}
          alt={player.championName}
          className="h-12 w-12 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">{player.championName}</div>
          <div className="text-sm text-white/45">
            {player.summonerName}
            {player.position ? ` · ${player.position}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <div className="text-white/40">KDA</div>
          <div className="mt-1 font-semibold">{player.kda}</div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <div className="text-white/40">CS</div>
          <div className="mt-1 font-semibold">{player.cs}</div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <div className="text-white/40">Vision</div>
          <div className="mt-1 font-semibold">{player.vision}</div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <div className="text-white/40">Gold</div>
          <div className="mt-1 font-semibold">
            {player.gold !== null ? player.gold : "N/D"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {player.items.length > 0 ? (
          player.items.map((item) => (
            <img
              key={`${player.summonerName}-${item}`}
              src={ddragonItem(item)}
              alt={item}
              className="h-9 w-9 rounded-lg border border-white/10 bg-black/20"
            />
          ))
        ) : (
          <span className="text-sm text-white/40">Sin items</span>
        )}
      </div>
    </div>
  );
}