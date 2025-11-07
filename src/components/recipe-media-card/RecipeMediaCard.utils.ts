export function formatDuration(seconds?: number | null): string {
  if (!seconds) return "—";
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatCount(value?: number | null): string {
  if (!value || value < 0) return "—";
  if (value < 1000) return value.toString();
  if (value < 1_000_000)
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}
