export interface FilterState {
  searchQuery: string;
  selectedCuisines: string[];
  selectedTags: string[];
  maxTotalTime?: number | null; // in minutes, null means no filter
  selectedDifficulties: string[]; // "easy", "medium", "hard"
}

export interface FilterBarProps {
  cuisines?: string[];
  tags?: string[];
  difficulties?: string[];
  onFilterChange?: (filters: FilterState) => void;
  className?: string;
  variant?: "inline" | "sidebar" | "modal";
  value?: FilterState;
}
