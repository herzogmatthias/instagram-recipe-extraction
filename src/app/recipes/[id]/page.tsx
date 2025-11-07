import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { cache } from "react";
import {
  RecipeDetailHeader,
  RecipeMediaCard,
  RecipeMediaInline,
  RecipeMetaStrip,
  WatchReelFab,
  IngredientPanel,
  StepsPanel,
  CookModeDialog,
} from "@/components/recipe-detail";
import { fetchRecipeDetail } from "@/lib/server/services/firestore";
import { cn } from "@/lib/utils";
import { RecipeDetailProvider } from "@/lib/state/recipeDetailStore";

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
      <div className="bg-background pb-12">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
          {!recipeReady && <PendingBanner />}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <section className="space-y-6">
              <RecipeDetailHeader recipe={recipe} />
              <RecipeMetaStrip recipe={recipe} />
              <IngredientPanel recipe={recipe} />
              <StepsPanel recipe={recipe} />
              {hasVideo && <RecipeMediaInline recipe={recipe} />}
            </section>

            <aside className="space-y-4">
              {hasVideo && (
                <RecipeMediaCard
                  recipe={recipe}
                  className="sticky top-20 hidden md:block"
                />
              )}
              <PlaceholderCard title="Macros & variants" compact />
              <PlaceholderCard title="Quick actions & quality" compact />
              <PlaceholderCard title="Source info" compact />
            </aside>
          </div>
        </div>
        {hasVideo && <WatchReelFab />}
        <CookModeDialog recipe={recipe} />
      </div>
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

function PlaceholderCard({
  title,
  compact = false,
}: {
  title: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/80 bg-card/80 text-sm text-muted-foreground",
        compact ? "px-4 py-4" : "px-6 py-8"
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 text-muted-foreground">
        This section will arrive in the next iteration to power the full cooking
        workflow.
      </p>
    </div>
  );
}
