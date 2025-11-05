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

interface AddLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (instagramUrl: string) => Promise<void> | void;
  isSubmitting?: boolean;
  className?: string;
}

const INSTAGRAM_URL_REGEX =
  /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[^\s/?#]+/i;

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

  const isSubmitting = isSubmittingProp || isSubmittingInternal;

  const resetState = useCallback(() => {
    setUrl("");
    setError(null);
    setIsSubmittingInternal(false);
  }, []);

  const validateUrl = useCallback((value: string) => {
    if (!value.trim()) {
      return "Please paste an Instagram post URL.";
    }

    if (!INSTAGRAM_URL_REGEX.test(value.trim())) {
      return "Enter a valid Instagram post, reel, or IGTV link.";
    }

    return null;
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

      const validationError = validateUrl(url);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        setError(null);
        setIsSubmittingInternal(true);
        await onSubmit(url.trim());
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
    [onSubmit, onOpenChange, resetState, url, validateUrl]
  );

  const helperText = useMemo(() => {
    if (error) {
      return error;
    }
    if (url.trim()) {
      return "We'll pull the caption, media, and comments automatically.";
    }
    return "Paste any Instagram post URL. We'll take it from there.";
  }, [error, url]);

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
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="submit-instagram-url"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Adding..." : "Add recipe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
