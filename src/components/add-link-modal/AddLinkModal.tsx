"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddLinkModalProps } from "./AddLinkModal.types";
import { getHelperText, getValidationError } from "./AddLinkModal.utils";
import { useSetupStatus } from "@/lib/client/hooks/useSetupStatus";

export function AddLinkModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting: isSubmittingProp = false,
  className,
}: AddLinkModalProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);
  const { flags } = useSetupStatus();

  const isSubmitting = isSubmittingProp || isSubmittingInternal;
  const isDisabled = !flags.extractionReady || isSubmitting;

  const resetState = useCallback(() => {
    setUrl("");
    setError(null);
    setIsSubmittingInternal(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const validationError = getValidationError(url);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        setError(null);
        setIsSubmittingInternal(true);
        await onSubmit({
          url: url.trim(),
        });
        resetState();
        onOpenChange(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message || "We couldn't add that link just now."
            : "We couldn't add that link just now.";
        setError(message);
      } finally {
        setIsSubmittingInternal(false);
      }
    },
    [onSubmit, onOpenChange, resetState, url]
  );

  const helperText = useMemo(() => getHelperText(error, url), [error, url]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex h-dvh w-full max-w-none flex-col overflow-hidden rounded-none border-none bg-background p-0",
          "sm:h-auto sm:max-w-xl sm:rounded-2xl sm:border sm:p-0",
          className
        )}
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-lg font-semibold">
            Add an Instagram recipe
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground/70">
            Drop the post link below and we&apos;ll queue it for extraction.
          </DialogDescription>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-4 top-4 rounded-full text-foreground/70"
              aria-label="Close add recipe modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 px-6 py-6">
            <label className="space-y-2" htmlFor="instagram-url-input">
              <span className="text-sm font-medium text-foreground">
                Instagram URL
              </span>
              <Input
                id="instagram-url-input"
                data-testid="instagram-url-input"
                placeholder="https://www.instagram.com/p/..."
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby="add-link-helper"
              />
            </label>
            <p
              id="add-link-helper"
              className={cn(
                "text-sm",
                error ? "text-destructive" : "text-foreground/60"
              )}
            >
              {helperText}
            </p>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <div className="w-full space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isDisabled}
                data-testid="submit-instagram-url"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting
                  ? "Adding..."
                  : !flags.extractionReady
                  ? "Setup Required"
                  : "Add recipe"}
              </Button>
              {!flags.extractionReady && (
                <p className="text-xs text-center text-muted-foreground">
                  Complete setup in Settings to enable recipe extraction
                </p>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { AddLinkModalProps } from "./AddLinkModal.types";
