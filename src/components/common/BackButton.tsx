import { useNavigate } from 'react-router-dom';

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
    >
      <span aria-hidden>←</span> Volver
    </button>
  );
}
