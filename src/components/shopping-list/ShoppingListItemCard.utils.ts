export function formatAddedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getDisplayValue(
  value?: string | null,
  fallback: string = "—"
): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}
