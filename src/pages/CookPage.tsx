import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChefHat, Clock, Heart, Users, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { generateRecipeWithGemini, type GeneratedRecipe } from "@/lib/recipeGeneration";
import { createSavedRecipeFromGeneratedRecipe, type FavoriteRecipeInput } from "@/lib/recipeFavorites";
import { listCookingRecommendations, type CookingRecommendation, cookingCuisineFilters } from "@/lib/cookingRecommendations";
import CookingRecommendationCard from "@/components/CookingRecommendationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const suggestedIngredients = [
  "Chicken",
  "Pasta",
  "Tomato",
  "Garlic",
  "Onion",
  "Rice",
  "Eggs",
  "Cheese",
  "Avocado",
  "Spinach",
  "Mushroom",
  "Lemon",
  "Basil",
  "Salmon",
];

const EMPTY_FAVORITE_RECIPE_IDS = new Set<string>();

interface CookPageProps {
  favoriteRecipeIds?: ReadonlySet<string>;
  onToggleFavoriteRecipe?: (recipe: FavoriteRecipeInput) => void;
}

const CookPage = ({
  favoriteRecipeIds = EMPTY_FAVORITE_RECIPE_IDS,
  onToggleFavoriteRecipe,
}: CookPageProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Query for cooking recommendations from Firebase (no meal type filter)
  const cookingRecommendationsQuery = useQuery({
    queryKey: ["cook-page-recommendations"],
    queryFn: () => listCookingRecommendations({}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generationCuisine, setGenerationCuisine] = useState<"all" | "chinese" | "malay" | "indian" | "japanese" | "western">(
    "all",
  );
  const [recommendationCuisine, setRecommendationCuisine] = useState<"all" | "chinese" | "malay" | "indian" | "japanese" | "western">(
    "all",
  );
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCookSessionState = selected.length > 0 || ingredientInput.trim().length > 0 || !!generatedRecipe || !!error;
  const generatedFavoriteRecipe = useMemo(
    () =>
      generatedRecipe
        ? createSavedRecipeFromGeneratedRecipe(generatedRecipe, {
            selectedIngredients: selected,
            selectedCuisine: generationCuisine,
          })
        : null,
    [generatedRecipe, selected, generationCuisine],
  );
  const isGeneratedRecipeFavorited = generatedFavoriteRecipe
    ? favoriteRecipeIds.has(generatedFavoriteRecipe.id)
    : false;

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((ingredient) => ingredient !== item) : [...prev, item],
    );
    setShowResult(false);
  };

  const addCustomIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
      setShowResult(false);
    }
    setIngredientInput("");
  };

  const clearAll = () => {
    setSelected([]);
    setIngredientInput("");
    setGeneratedRecipe(null);
    setShowResult(false);
    setError(null);
  };

  const generate = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const cuisine = generationCuisine === "all" ? "" : generationCuisine;
      const recipe = await generateRecipeWithGemini(selected, cuisine);
      setGeneratedRecipe(recipe);
      setShowResult(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate recipe";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const recommendations = cookingRecommendationsQuery.data ?? [];
    let results = recommendations;
    if (recommendationCuisine !== "all") {
      results = results.filter((recipe) => recipe.cuisine === recommendationCuisine);
    }
    return results;
  }, [cookingRecommendationsQuery.data, recommendationCuisine]);
  const isFiltered = recommendationCuisine !== "all";

  return (
    <div className="pb-20 min-h-screen" style={{ background: "var(--hero-gradient)" }}>
      <div className="px-5 pt-12">
        <h1 className="text-2xl font-display font-semibold text-foreground">Smart Cooking Assistant</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Type or pick your ingredients, we'll do the rest
        </p>

        <div className="relative mt-4">
          <input
            type="text"
            value={ingredientInput}
            onChange={(event) => setIngredientInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addCustomIngredient()}
            placeholder="Type an ingredient and press Enter..."
            className="w-full h-12 pl-4 pr-20 bg-card rounded-2xl shadow-soft text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-card transition-all"
          />
          <button
            onClick={addCustomIngredient}
            disabled={!ingredientInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold font-body disabled:opacity-40 transition-all"
          >
            Add
          </button>
        </div>

        <div className="mt-5 min-h-[32px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              <AnimatePresence>
                {selected.map((item) => (
                  <motion.button
                    key={item}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    onClick={() => toggle(item)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium font-body"
                  >
                    {item}
                    <X size={12} />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            {hasCookSessionState && (
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-1.5 rounded-full bg-card text-muted-foreground shadow-soft hover:text-foreground transition-colors text-xs font-medium font-body whitespace-nowrap"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-body text-muted-foreground mb-2 uppercase tracking-wider font-bold">
            Cuisine
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cookingCuisineFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setGenerationCuisine(filter.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium font-body whitespace-nowrap transition-all ${
                  generationCuisine === filter.value
                    ? "bg-primary text-primary-foreground shadow-elevated"
                    : "bg-card text-foreground shadow-soft hover:shadow-card"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-body text-muted-foreground mb-2 uppercase tracking-wider font-bold">
            Popular Ingredients
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedIngredients.map((item) => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium font-body transition-all ${
                  selected.includes(item)
                    ? "bg-primary text-primary-foreground shadow-elevated"
                    : "bg-card text-foreground shadow-soft hover:shadow-card"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generate}
          disabled={selected.length === 0}
          className="w-full h-14 mt-6 bg-primary text-primary-foreground rounded-full font-semibold font-body text-base shadow-[0_4px_14px_0_rgba(255,107,74,0.39)] disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
            />
          ) : (
            <>
              <ChefHat size={20} />
              Let's Cook
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 p-4 bg-destructive/10 border border-destructive rounded-xl flex items-start gap-3"
            >
              <AlertCircle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Error generating recipe</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResult && generatedRecipe && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="mt-6 bg-card rounded-[24px] shadow-card overflow-hidden"
            >
              <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                {generatedRecipe.imageUrl ? (
                  <img
                    src={generatedRecipe.imageUrl}
                    alt={generatedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <ChefHat size={48} className="text-primary mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground font-body">Recipe Image</p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-display font-semibold text-foreground">
                    {generatedRecipe.title}
                  </h3>
                  {generatedFavoriteRecipe && onToggleFavoriteRecipe && (
                    <button
                      type="button"
                      onClick={() => onToggleFavoriteRecipe(generatedFavoriteRecipe)}
                      aria-label={
                        isGeneratedRecipeFavorited
                          ? `Remove ${generatedRecipe.title} from favorites`
                          : `Save ${generatedRecipe.title} to favorites`
                      }
                      className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isGeneratedRecipeFavorited
                          ? "border-primary bg-primary text-primary-foreground shadow-soft"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      <Heart size={18} fill={isGeneratedRecipeFavorited ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-body flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {generatedRecipe.prepTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> Cook: {generatedRecipe.cookTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} /> {generatedRecipe.servings} Servings
                  </span>
                  <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-md font-bold uppercase tracking-wider">
                    {generatedRecipe.tag}
                  </span>
                  <span className="px-2 py-0.5 bg-accent text-accent-foreground rounded-md font-bold uppercase tracking-wider">
                    {generatedRecipe.difficulty}
                  </span>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-display font-semibold text-foreground mb-2">Ingredients</h4>
                  <ul className="space-y-1">
                    {generatedRecipe.ingredients.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground font-body flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-display font-semibold text-foreground mb-2">Instructions</h4>
                  <ol className="space-y-2">
                    {generatedRecipe.instructions.map((step, index) => (
                      <li key={step} className="text-sm text-muted-foreground font-body flex gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="my-8 h-px bg-border" />

        <section className="mt-8">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Recipes to cook</h2>
            <p className="mt-1 text-sm font-body text-muted-foreground">
              Explore our collection of recipes.
            </p>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {cookingCuisineFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setRecommendationCuisine(filter.value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium font-body transition-all ${
                  recommendationCuisine === filter.value
                    ? "bg-primary text-primary-foreground shadow-elevated"
                    : "bg-card text-foreground shadow-soft hover:shadow-card"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {cookingRecommendationsQuery.isLoading && (
            <div className="mt-4">
              <p className="text-sm font-body text-muted-foreground">Loading recipes...</p>
              <div className="mt-3 flex flex-col gap-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="rounded-[24px] bg-card p-4 shadow-card">
                    <Skeleton className="aspect-[4/3] rounded-2xl" />
                    <Skeleton className="mt-4 h-4 w-24" />
                    <Skeleton className="mt-3 h-5 w-40" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-4/5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {cookingRecommendationsQuery.isError && (
            <div className="mt-4 rounded-[24px] bg-card p-5 shadow-card">
              <p className="text-sm font-body text-foreground">Could not load recipes right now.</p>
              <p className="mt-1 text-xs font-body text-muted-foreground">Please try again in a moment.</p>
              <button
                type="button"
                onClick={() => cookingRecommendationsQuery.refetch()}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-soft"
              >
                Try again
              </button>
            </div>
          )}

          {!cookingRecommendationsQuery.isLoading && !cookingRecommendationsQuery.isError && filtered.length === 0 && (
            <div className="mt-4 rounded-[24px] bg-card p-5 shadow-card">
              <p className="text-sm font-body text-foreground">
                {isFiltered ? "No recipes found for this cuisine." : "No recipes found right now."}
              </p>
              <p className="mt-1 text-xs font-body text-muted-foreground">
                {isFiltered ? "Try another cuisine." : "Check back later for fresh recipes."}
              </p>
            </div>
          )}

          {!cookingRecommendationsQuery.isLoading && !cookingRecommendationsQuery.isError && filtered.length > 0 && (
            <div className="mt-4 flex flex-col gap-4">
              {filtered.map((recommendation) => (
                <CookingRecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  isFavorited={favoriteRecipeIds.has(recommendation.id)}                compact                  onSelect={() => navigate(`/recipes/${recommendation.id}`)}
                  onToggleFavorite={onToggleFavoriteRecipe}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CookPage;
