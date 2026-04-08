import { Gamepad2, Github } from "lucide-react";

export default function TopNav() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
      <a href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#00b4d8]">
          <Gamepad2 className="h-5 w-5 text-black" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          Riot<span className="text-[#00d4ff]">Tracker</span>
        </span>
      </a>

      <div className="flex items-center gap-3">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/50 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
