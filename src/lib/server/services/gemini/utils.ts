import type { CommentThread } from "@/models/InstagramRecipePost";
import type { ExtractRecipeParams } from "./types";

export function buildUserPrompt(params: ExtractRecipeParams): string {
  const parts: string[] = [];

  if (params.caption) {
    parts.push(`CAPTION\n${params.caption}`);
  }
  if (params.hashtags?.length) {
    parts.push(`HASHTAGS\n${params.hashtags.map((t) => `#${t}`).join(" ")}`);
  }

  const ownerComments = collectOwnerComments(
    params.ownerUsername,
    params.latestComments
  );
  if (ownerComments.length) {
    parts.push(
      `AUTHOR COMMENTS\n${ownerComments.map((c) => `- ${c}`).join("\n")}`
    );
  }

  parts.push(
    `MEDIA\nA media file is attached; use it only to infer missing specifics (quantities, doneness, timings).`
  );
  parts.push(
    `Now extract the given recipe - if you are not able to determine specifics infer.`
  );

  return parts.join("\n\n");
}

export function collectOwnerComments(
  ownerUsername?: string,
  comments?: CommentThread[]
): string[] {
  if (!ownerUsername || !Array.isArray(comments)) {
    return [];
  }

  return comments
    .filter(
      (comment) =>
        comment.ownerUsername === ownerUsername &&
        typeof comment.text === "string" &&
        comment.text.trim().length > 0
    )
    .map((comment) => comment.text.trim())
    .slice(0, 3);
}
