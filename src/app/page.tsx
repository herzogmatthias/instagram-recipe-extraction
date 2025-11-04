import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Add padding-top to account for fixed navbar (64px) */}
      <main className="pt-16">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-heading font-bold text-foreground">
            Welcome to RecipeAI
          </h2>
          <p className="text-foreground/70 mt-2">
            Paste an Instagram link to extract and analyze recipes
          </p>
        </div>
      </main>
    </div>
  );
}
