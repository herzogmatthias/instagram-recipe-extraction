import { FilterState } from "./FilterBar.types";

export function toggleSelection(value: string, selections: string[]): string[] {
  return selections.includes(value)
    ? selections.filter((candidate) => candidate !== value)
    : [...selections, value];
}

export function hasActiveFilters(state: FilterState): boolean {
  return (
    state.searchQuery.trim().length > 0 ||
    state.selectedCuisines.length > 0 ||
    state.selectedTags.length > 0
  );
}

