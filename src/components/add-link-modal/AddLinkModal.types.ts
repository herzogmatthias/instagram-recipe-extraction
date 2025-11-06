export interface AddLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (instagramUrl: string) => Promise<void> | void;
  isSubmitting?: boolean;
  className?: string;
}

