export interface AddLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { url: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  className?: string;
}
