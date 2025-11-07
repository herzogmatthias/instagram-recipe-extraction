import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import { Timestamp } from "./client";
import type {
  RecipeDocument,
  RecipeImportFirestoreRecord,
  RecipeFirestoreRecord,
  RecipeVariantDocument,
  RecipeVariantFirestoreRecord,
} from "./types";

export function toIsoString(value?: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

export function coerceTimestamp(
  value?: string | Date | Timestamp
): Timestamp | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Timestamp) {
    return value;
  }
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (typeof value === "string") {
    return Timestamp.fromDate(new Date(value));
  }
  return undefined;
}

export function deserializeImport(
  snapshot: FirebaseFirestore.DocumentSnapshot<RecipeImportFirestoreRecord>
): RecipeImportDocument {
  const data = snapshot.data();
  if (!data) {
    throw new Error(`Import ${snapshot.id} has no data`);
  }
  return {
    id: snapshot.id,
    inputUrl: data.inputUrl,
    status: data.status,
    stage: data.stage,
    progress: data.progress,
    recipeId: data.recipeId,
    error: data.error,
    metadata: data.metadata ?? {},
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function deserializeRecipe(
  snapshot: FirebaseFirestore.DocumentSnapshot<RecipeFirestoreRecord>
): RecipeDocument {
  const data = snapshot.data();
  if (!data) {
    throw new Error(`Recipe ${snapshot.id} has no data`);
  }
  return {
    ...(data as unknown as Omit<
      RecipeDocument,
      "id" | "createdAt" | "updatedAt"
    >),
    id: snapshot.id,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function deserializeVariant(
  snapshot: FirebaseFirestore.DocumentSnapshot<RecipeVariantFirestoreRecord>
): RecipeVariantDocument {
  const data = snapshot.data();
  if (!data) {
    throw new Error(`Variant ${snapshot.id} has no data`);
  }
  return {
    id: snapshot.id,
    recipeId: data.recipeId,
    name: data.name,
    isOriginal: data.isOriginal,
    recipe_data: data.recipe_data,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function expandRecipeDocument(doc: RecipeDocument): InstagramRecipePost {
  const fallbackStepMedia =
    doc.recipe_data?.steps
      ?.map((step) => step.chefs_note)
      .find(
        (note): note is string =>
          typeof note === "string" && note.startsWith("http")
      ) ?? null;

  const displayUrl =
    doc.displayUrl ?? doc.images?.find(Boolean) ?? fallbackStepMedia;

  return {
    inputUrl: doc.inputUrl,
    id: doc.id,
    type: doc.type ?? "Video",
    shortCode: doc.shortCode ?? doc.id,
    caption: doc.caption ?? "",
    hashtags: doc.hashtags ?? [],
    mentions: doc.mentions ?? [],
    url: doc.url ?? doc.inputUrl,
    commentsCount: doc.commentsCount ?? 0,
    firstComment: doc.firstComment ?? null,
    latestComments: doc.latestComments ?? [],
    dimensionsHeight: doc.dimensionsHeight ?? null,
    dimensionsWidth: doc.dimensionsWidth ?? null,
    displayUrl,
    images: doc.images ?? (displayUrl ? [displayUrl] : []),
    videoUrl: doc.videoUrl ?? null,
    alt: doc.alt ?? null,
    likesCount: doc.likesCount ?? 0,
    videoViewCount: doc.videoViewCount ?? null,
    videoPlayCount: doc.videoPlayCount ?? null,
    timestamp: doc.timestamp ?? doc.createdAt ?? new Date().toISOString(),
    childPosts: doc.childPosts ?? [],
    ownerFullName: doc.ownerFullName ?? null,
    ownerUsername: doc.ownerUsername ?? "unknown",
    ownerId: doc.ownerId ?? "unknown",
    productType: doc.productType ?? "feed",
    videoDuration: doc.videoDuration ?? null,
    isSponsored: doc.isSponsored ?? false,
    musicInfo: doc.musicInfo,
    isCommentsDisabled: doc.isCommentsDisabled ?? false,
    recipe_data: doc.recipe_data,
    status: doc.status ?? "ready",
    progress: typeof doc.progress === "number" ? doc.progress : 100,
    error: doc.error,
    createdAt: doc.createdAt,
  };
}
