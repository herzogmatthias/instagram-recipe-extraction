import { ProcessingQueueItem } from "@/components/processing-queue-popover/ProcessingQueuePopover.types";

export interface NavbarProps {
  className?: string;
  onAddRecipe?: () => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  processingItems: ProcessingQueueItem[];
  processingOpen: boolean;
  onProcessingOpenChange: (open: boolean) => void;
  onRemoveFromQueue?: (id: string) => void;
  onRetryFromQueue?: (id: string) => void;
}
