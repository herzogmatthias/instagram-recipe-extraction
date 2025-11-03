import { RecipeWorkspace } from '@/components/RecipeWorkspace';
import { getAllRecipes } from '@/lib/recipes';

export default async function HomePage() {
  const recipes = await getAllRecipes();

  return (
    <main className="space-y-10">
      <header className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Instagram Recipe Extraction</p>
        <h1 className="text-4xl font-bold text-white md:text-5xl">Recipe Studio Prototype</h1>
        <p className="mx-auto max-w-2xl text-base text-slate-300">
          Paste Instagram recipe posts, extract structured ingredients and chat with Gemini for tailored cooking guidance. This
          prototype uses local JSON exports and a live Gemini integration.
        </p>
      </header>
      <RecipeWorkspace initialRecipes={recipes} />
    </main>
  );
}
