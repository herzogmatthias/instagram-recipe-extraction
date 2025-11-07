import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import type {
  ScrapeInstagramPostParams,
  ScrapeInstagramPostOptions,
  RawApifyInstagramPost,
} from "./types";
import { InstagramScrapeError } from "./types";
import { getApifyClient, ACTOR_BY_TYPE } from "./client";
import {
  normalizeInstagramUrl,
  detectPostType,
  buildActorInput,
  transformApifyItem,
  withRetry,
} from "./utils";
import { handleApifyError } from "./errors";

export async function scrapeInstagramPost(
  params: ScrapeInstagramPostParams,
  options?: ScrapeInstagramPostOptions
): Promise<InstagramRecipePost> {
  const normalizedUrl = normalizeInstagramUrl(params.url);
  const contentType = detectPostType(normalizedUrl);
  const actorId = ACTOR_BY_TYPE[contentType];
  const input = buildActorInput(normalizedUrl);

  const rawPost = await withRetry(async () => {
    const client = getApifyClient();

    let run;
    try {
      run = await client.actor(actorId).call(input);
    } catch (error) {
      handleApifyError(error);
    }

    if (!run?.defaultDatasetId) {
      throw new InstagramScrapeError(
        "TRANSIENT_ERROR",
        "Apify run did not provide a dataset identifier"
      );
    }

    let datasetItems;
    try {
      datasetItems = await client.dataset(run.defaultDatasetId).listItems({
        limit: 1,
        clean: true,
      });
    } catch (error) {
      handleApifyError(error);
    }

    const items = datasetItems?.items ?? [];
    if (!items.length) {
      throw new InstagramScrapeError(
        "PRIVATE_POST",
        "Apify returned no data. The Instagram post might be private or unavailable."
      );
    }

    return items[0] as RawApifyInstagramPost;
  }, options);

  return transformApifyItem(rawPost, normalizedUrl, contentType);
}
