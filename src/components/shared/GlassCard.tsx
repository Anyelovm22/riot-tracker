import type { ReactNode } from "react";

export default function GlassCard({
  className = "",
  children,
  glow,
  hover = true
}: {
  className?: string;
  children: ReactNode;
  glow?: "primary" | "secondary";
  hover?: boolean;
}) {
  const glowClass = glow === "primary" 
    ? "border-[#00d4ff]/20 shadow-[0_0_30px_rgba(0,212,255,0.1)]" 
    : glow === "secondary" 
    ? "border-[#ff4f6d]/20 shadow-[0_0_30px_rgba(255,79,109,0.1)]"
    : "border-white/[0.06]";

  const hoverClass = hover 
    ? "transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]" 
    : "";

  return (
    <div className={`rounded-2xl border bg-white/[0.02] backdrop-blur-xl ${glowClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
