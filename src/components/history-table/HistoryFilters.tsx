"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, X } from "lucide-react";
import { HistoryFilters, HISTORY_STATUS_OPTIONS } from "./HistoryTable.types";

interface HistoryFiltersProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
}

export function HistoryFiltersComponent({
  filters,
  onFiltersChange,
}: HistoryFiltersProps) {
  const hasActiveFilters =
    filters.status.length > 0 || filters.dateFrom || filters.dateTo;

  const handleClearFilters = () => {
    onFiltersChange({
      status: [],
      dateFrom: "",
      dateTo: "",
    });
  };

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-foreground/60" />
        <span className="text-sm font-medium text-foreground">Filters:</span>
      </div>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            Status
            {filters.status.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {filters.status.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {HISTORY_STATUS_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.status.includes(option.value)}
              onCheckedChange={() => toggleStatus(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date From */}
      <div className="flex items-center gap-2">
        <label htmlFor="date-from" className="text-sm text-foreground/60">
          From:
        </label>
        <Input
          id="date-from"
          type="date"
          value={filters.dateFrom}
          onChange={(e) =>
            onFiltersChange({ ...filters, dateFrom: e.target.value })
          }
          className="h-9 w-40"
        />
      </div>

      {/* Date To */}
      <div className="flex items-center gap-2">
        <label htmlFor="date-to" className="text-sm text-foreground/60">
          To:
        </label>
        <Input
          id="date-to"
          type="date"
          value={filters.dateTo}
          onChange={(e) =>
            onFiltersChange({ ...filters, dateTo: e.target.value })
          }
          className="h-9 w-40"
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 text-foreground/60 hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
