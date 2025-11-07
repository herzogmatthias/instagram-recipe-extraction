export interface HistoryFilters {
  status: string[];
  dateFrom: string;
  dateTo: string;
}

export const HISTORY_STATUS_OPTIONS = [
  { value: "queued", label: "Queued" },
  { value: "scraping", label: "Scraping" },
  { value: "downloading_media", label: "Downloading" },
  { value: "uploading_media", label: "Uploading" },
  { value: "extracting", label: "Extracting" },
  { value: "ready", label: "Completed" },
  { value: "failed", label: "Failed" },
] as const;
