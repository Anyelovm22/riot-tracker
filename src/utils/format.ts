import type { RankEntry } from "../types/riot";

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function tierLabel(entry: RankEntry | null) {
  if (!entry) return "Sin clasificar";
  return `${capitalize(entry.tier)} ${entry.rank}`;
}

export function winrate(wins = 0, losses = 0) {
  const total = wins + losses;
  if (!total) return "0.0";
  return ((wins / total) * 100).toFixed(1);
}

export function formatK(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}