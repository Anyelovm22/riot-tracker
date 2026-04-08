import { Gamepad2, RefreshCw, Search, Sparkles } from "lucide-react";
import type { RegionCode } from "../../types/riot";
import GlassCard from "../shared/GlassCard";

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

export default function LandingSearch(props: {
  riotId: string;
  setRiotId: (value: string) => void;
  region: RegionCode;
  setRegion: (value: RegionCode) => void;
  onSearch: () => void;
  loading: boolean;
  error: string | null;
  onDemo?: () => void;
}) {
  const { riotId, setRiotId, region, setRegion, onSearch, loading, error, onDemo } = props;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      onSearch();
    }
  };

  return (
    <section className="mx-auto flex min-h-[85vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      {/* Logo and title */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#00d4ff]/60 shadow-[0_0_30px_rgba(0,212,255,0.4)]">
          <Gamepad2 className="h-7 w-7 text-black" />
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
          Riot<span className="text-[#00d4ff] text-glow-primary">Tracker</span>
        </h1>
      </div>

      <p className="mb-10 max-w-md text-lg text-white/50">
        Busca cualquier invocador y analiza sus estadisticas, historial de partidas y builds recomendadas
      </p>

      {/* Search card */}
      <GlassCard className="w-full p-6" glow="primary" hover={false}>
        <div className="flex flex-col gap-4">
          {/* Input row */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
              <input
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nombre#TAG (ej: Faker#KR1)"
                className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-12 pr-4 text-base text-white outline-none transition-all placeholder:text-white/30 focus:border-[#00d4ff]/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#00d4ff]/20"
              />
            </div>

            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as RegionCode)}
              className="h-14 cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-5 text-base font-medium text-white outline-none transition-all hover:border-white/20 focus:border-[#00d4ff]/40"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#0a0a0f] text-white">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search button */}
          <button
            onClick={onSearch}
            disabled={loading}
            className="group relative inline-flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#00b4d8] px-6 text-base font-bold text-black transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-70"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            {loading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {loading ? "Buscando..." : "Buscar Invocador"}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg border border-[#ff4f6d]/20 bg-[#ff4f6d]/10 px-4 py-3 text-sm text-[#ff4f6d]">
            {error}
          </div>
        )}

        {/* Demo button */}
        {onDemo && (
          <button
            onClick={onDemo}
            className="mt-4 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-sm font-medium text-white/50 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white/70"
          >
            Ver demo (sin API key)
          </button>
        )}
      </GlassCard>

      {/* Features hint */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
        <span className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00d4ff]" />
          Estadisticas en vivo
        </span>
        <span className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00d4ff]" />
          Builds recomendadas
        </span>
        <span className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00d4ff]" />
          Historial de LP
        </span>
      </div>
    </section>
  );
}
