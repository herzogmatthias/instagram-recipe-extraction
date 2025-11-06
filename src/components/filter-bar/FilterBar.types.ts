export interface FilterState {
  searchQuery: string;
  selectedCuisines: string[];
  selectedTags: string[];
}

export interface FilterBarProps {
  cuisines?: string[];
  tags?: string[];
  onFilterChange?: (filters: FilterState) => void;
  className?: string;
  variant?: "inline" | "sidebar" | "modal";
  value?: FilterState;
}

