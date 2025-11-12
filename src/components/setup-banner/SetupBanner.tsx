/**
 * Setup Banner Component
 * Global banner shown when configuration is incomplete
 */

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getMissingConfigMessage,
  getSetupProgress,
} from "@/lib/client/utils/readinessFlags";
import type { ReadinessFlags } from "@/lib/client/utils/readinessFlags";
import { Progress } from "@/components/ui/progress";

export type SetupBannerProps = {
  flags: ReadinessFlags;
  onDismiss?: () => void;
};

export function SetupBanner({ flags, onDismiss }: SetupBannerProps) {
  // Don't show banner if setup is complete
  if (flags.isComplete) {
    return null;
  }

  const progress = getSetupProgress(flags);
  const message = getMissingConfigMessage(flags);

  return (
    <div className="fixed top-16 left-0 right-0 z-40 border-b border-[#F3C6A5] bg-[#F3C6A5]/20 backdrop-blur supports-[backdrop-filter]:bg-[#F3C6A5]/30">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="Setup">
                ⚙️
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#333333]">
                  Complete setup to unlock all features
                </p>
                <p className="text-xs text-[#333333]/60">{message}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={progress} className="h-2 w-32" />
                  <span className="text-xs font-medium text-[#333333]">
                    {progress}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="text-[#333333]/60 hover:text-[#333333]"
              >
                Dismiss
              </Button>
            )}
            <Link href="/settings">
              <Button
                size="sm"
                className="bg-[#D6E2C3] text-[#333333] hover:bg-[#D6E2C3]/90"
              >
                Go to Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
