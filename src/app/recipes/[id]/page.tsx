import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { cache } from "react";
import { WatchReelFab } from "@/components/watch-reel-fab/WatchReelFab";
import { fetchRecipeDetail } from "@/lib/server/services/firestore";
//
import { RecipeDetailProvider } from "@/lib/client/state/recipeDetailStore";
import { RecipeVariantProvider } from "@/components/recipe-variant-provider/RecipeVariantProvider";
import { RecipeDetailContent } from "@/components/recipe-detail-content/RecipeDetailContent";

const getRecipeDetail = cache(fetchRecipeDetail);

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipeDetail(id);
  if (!recipe) {
    return {
      title: "Recipe not found",
    };
  }

  const title = recipe.recipe_data?.title || recipe.caption || "Recipe";
  return {
    title: `${title} • Instagram Recipe`,
    description: recipe.caption?.slice(0, 160),
    openGraph: {
      title,
      description: recipe.caption?.slice(0, 160) || undefined,
      images: recipe.displayUrl ? [{ url: recipe.displayUrl }] : undefined,
    },
  };
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const recipe = await getRecipeDetail(id);

  if (!recipe) {
    notFound();
  }

  const recipeReady = Boolean(recipe.recipe_data);
  const hasVideo = Boolean(recipe.videoUrl);

  return (
    <RecipeDetailProvider recipe={recipe}>
      <RecipeVariantProvider recipe={recipe}>
        <div className="bg-background pb-12">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
            {!recipeReady && <PendingBanner />}
            <RecipeDetailContent recipe={recipe} />
          </div>
          {hasVideo && <WatchReelFab />}
        </div>
      </RecipeVariantProvider>
    </RecipeDetailProvider>
  );
}

function PendingBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary-foreground">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="font-semibold">Recipe extraction in progress</p>
        <p className="text-muted-foreground/90">
          We&apos;ll surface ingredients, steps, and chat tools right here as
          soon as Gemini finishes analyzing this post.
        </p>
      </div>
    </div>
  );
}

// PlaceholderCard removed after implementing real sidebar components.
