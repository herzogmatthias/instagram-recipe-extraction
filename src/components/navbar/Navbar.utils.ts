export function getProcessingBadgeLabel(count: number): string | null {
  if (count <= 0) {
    return null;
  }

  return count > 9 ? "9+" : count.toString();
}

export function getFilterBadgeValue(count: number): number | null {
  if (count <= 0) {
    return null;
  }

  return Math.min(count, 9);
}

