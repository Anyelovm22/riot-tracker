import { RefreshCw, Search, Sparkles } from "lucide-react";
import type { RegionCode } from "../../types/riot";

const REGIONS: { label: string; value: RegionCode }[] = [
  { label: "LAN", value: "LA1" },
  { label: "LAS", value: "LA2" },
  { label: "NA", value: "NA1" },
  { label: "EUW", value: "EUW1" },
  { label: "EUNE", value: "EUN1" },
  { label: "BR", value: "BR1" },
  { label: "KR", value: "KR" },
  { label: "JP", value: "JP1" },
  { label: "OCE", value: "OC1" },
  { label: "TR", value: "TR1" }
];

export default function CompactHeader(props: {
  riotId: string;
  setRiotId: (value: string) => void;
  region: RegionCode;
  setRegion: (value: RegionCode) => void;
  onSearch: () => void;
  loading: boolean;
  currentName: string;
}) {
  const { riotId, setRiotId, region, setRegion, onSearch, loading, currentName } = props;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      onSearch();
    }
  };

  return (
    <section className="mt-6 flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Current profile */}
      <div className="flex-shrink-0">
        <div className="text-xs font-medium uppercase tracking-wider text-white/40">Perfil actual</div>
        <div className="mt-1 text-xl font-bold tracking-tight text-white">{currentName}</div>
      </div>

      {/* Search form */}
      <div className="flex flex-1 flex-col gap-2 lg:max-w-xl lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar otro invocador..."
            className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-[#00d4ff]/30 focus:bg-white/[0.05]"
          />
        </div>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as RegionCode)}
          className="h-10 cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-sm font-medium text-white outline-none transition-all hover:border-white/10"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value} className="bg-[#0a0a0f]">
              {r.label}
            </option>
          ))}
        </select>

        <button
          onClick={onSearch}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#00b4d8] px-5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-70"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Buscar
        </button>
      </div>
    </section>
  );
}
