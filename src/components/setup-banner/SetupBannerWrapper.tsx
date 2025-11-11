/**
 * Setup Banner Wrapper
 * Client component that fetches setup status and shows banner if needed
 */

"use client";

import { useSetupStatus } from "@/lib/client/hooks/useSetupStatus";
import { SetupBanner } from "@/components/setup-banner/SetupBanner";

export function SetupBannerWrapper() {
  const { flags, isLoading } = useSetupStatus();

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  return <SetupBanner flags={flags} />;
}
