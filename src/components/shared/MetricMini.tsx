type Props = {
  label: string;
  value: string;
  accent: "cyan" | "rose" | "white";
};

export default function MetricMini({ label, value, accent }: Props) {
  const colorClass =
    accent === "cyan"
      ? "text-cyan-300"
      : accent === "rose"
      ? "text-rose-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</div>
      <div className={`mt-1 text-xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}