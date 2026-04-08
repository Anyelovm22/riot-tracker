export default function StatCell({
  title,
  value,
  sub
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">{title}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-white/35">{sub}</div>
    </div>
  );
}