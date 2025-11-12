/**
 * Setup Banner Wrapper
 * Client component that fetches setup status and shows banner if needed
 */

"use client";

import { useEffect } from "react";
import { useSetupStatus } from "@/lib/client/hooks/useSetupStatus";
import { SetupBanner } from "@/components/setup-banner/SetupBanner";

export function SetupBannerWrapper() {
  const { flags, isLoading } = useSetupStatus();
  const isShown = !isLoading && !flags.isComplete;

  // Add padding to body when banner is shown
  useEffect(() => {
    if (isShown) {
      document.body.style.setProperty("--setup-banner-height", "80px");
    } else {
      document.body.style.setProperty("--setup-banner-height", "0px");
    }
  }, [isShown]);

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  return <SetupBanner flags={flags} />;
}
