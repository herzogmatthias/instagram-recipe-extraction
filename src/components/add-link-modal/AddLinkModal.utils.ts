export const INSTAGRAM_URL_REGEX =
  /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[^\s/?#]+/i;

export function getValidationError(value: string): string | null {
  if (!value.trim()) {
    return "Please paste an Instagram post URL.";
  }

  if (!INSTAGRAM_URL_REGEX.test(value.trim())) {
    return "Enter a valid Instagram post, reel, or IGTV link.";
  }

  return null;
}

export function getHelperText(error: string | null, url: string): string {
  if (error) {
    return error;
  }

  if (url.trim()) {
    return "We'll pull the caption, media, and comments automatically.";
  }

  return "Paste any Instagram post URL. We'll take it from there.";
}
