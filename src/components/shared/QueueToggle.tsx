import type { ReactNode } from "react";

export default function QueueToggle({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
        active 
          ? "bg-[#00d4ff] text-black shadow-[0_0_15px_rgba(0,212,255,0.3)]" 
          : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
      }`}
    >
      {children}
    </button>
  );
}
