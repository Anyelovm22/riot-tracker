import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { LpPoint, RankEntry } from "../../types/riot";
import { tierLabel, winrate } from "../../utils/format";
import GlassCard from "../shared/GlassCard";

export default function LpChartPanel({
  queueView,
  currentRank,
  lpData,
  hasHistory
}: {
  queueView: "solo" | "flex";
  currentRank: RankEntry | null;
  lpData: LpPoint[];
  hasHistory: boolean;
}) {
  // Calculate LP change
  const lpChange = lpData.length >= 2 ? lpData[lpData.length - 1].lp - lpData[0].lp : 0;
  const isPositive = lpChange >= 0;

  if (!hasHistory || lpData.length === 0) {
    return (
      <GlassCard className="mt-6 p-6 lg:p-8" glow="primary">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d4ff]/10">
            <TrendingUp className="h-5 w-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Progreso de LP</h2>
            <p className="text-sm text-white/50">
              {queueView === "solo" ? "Solo/Duo" : "Flex"} - {tierLabel(currentRank)}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatBox label="LP Actual" value={currentRank?.leaguePoints ?? 0} accent="#00d4ff" />
          <StatBox label="Victorias" value={currentRank?.wins ?? 0} accent="#22c55e" />
          <StatBox label="Win Rate" value={`${winrate(currentRank?.wins ?? 0, currentRank?.losses ?? 0)}%`} accent="#ff4f6d" />
        </div>

        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-white/40">
          No hay suficientes partidas ranked recientes para mostrar el progreso de LP.
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mt-6 overflow-hidden p-6 lg:p-8" glow="primary">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d4ff]/10">
            <TrendingUp className="h-5 w-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Progreso de LP</h2>
            <p className="text-sm text-white/50">
              {queueView === "solo" ? "Solo/Duo" : "Flex"} - {tierLabel(currentRank)} - {currentRank?.leaguePoints ?? 0} LP
            </p>
          </div>
        </div>

        {/* LP change badge */}
        <div 
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2"
          style={{ 
            backgroundColor: isPositive ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 79, 109, 0.1)",
            color: isPositive ? "#22c55e" : "#ff4f6d"
          }}
        >
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="font-bold">{isPositive ? "+" : ""}{lpChange} LP</span>
          <span className="text-sm opacity-70">ultimas {lpData.length} partidas</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={lpData} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="lpGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#00d4ff" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis 
              dataKey="game" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 12 }}
              tickFormatter={(value) => `#${value}`}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 12 }}
              tickFormatter={(value) => `${value} LP`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "rgba(10, 10, 15, 0.95)", 
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff"
              }}
              formatter={(value: number) => [`${value} LP`, "LP"]}
              labelFormatter={(label) => `Partida #${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="lp" 
              stroke="#00d4ff" 
              strokeWidth={2.5} 
              fill="url(#lpGradient)"
              dot={{ fill: "#00d4ff", strokeWidth: 0, r: 4 }}
              activeDot={{ fill: "#00d4ff", strokeWidth: 2, stroke: "#fff", r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
      <div className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}
