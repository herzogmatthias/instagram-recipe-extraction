import { toast } from "sonner";

export async function copyTextToClipboard(
  text: string,
  successMessage = "Copied to clipboard."
): Promise<void> {
  if (!text) return;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    toast.success(successMessage);
  } catch (error) {
    console.error("Clipboard copy failed", error);
    toast.error("Unable to copy to clipboard.");
  }
}
