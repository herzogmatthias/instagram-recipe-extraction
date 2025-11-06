import { type ReactNode } from "react";
import { RecipeStatus } from "@/models/InstagramRecipePost";

export interface ProcessingQueueItem {
  id: string;
  url: string;
  username: string;
  status: RecipeStatus;
  stage: RecipeStatus;
  progress: number;
  createdAt: string;
  displayUrl?: string | null;
  title?: string;
  error?: string | null;
  recipeId?: string;
}

export interface ProcessingQueuePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ProcessingQueueItem[];
  trigger: ReactNode;
  onViewHistory?: () => void;
  onRemoveItem?: (id: string) => void;
  onRetryItem?: (id: string) => void;
}
