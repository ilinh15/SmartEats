import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChefHat, Clock, Heart, ImageOff, Star, Users, UtensilsCrossed } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecipeById } from "@/data/recipes";
import {
  COOKING_CUISINE_LABELS,
  COOKING_MEAL_LABELS,
  formatCookTimeMinutes,
  getCookingRecommendationById,
  type CookingRecommendation,
} from "@/lib/cookingRecommendations";
import { loadFavoriteRecipes, saveFavoriteRecipes, toggleFavoriteRecipe } from "@/lib/recipeFavorites";
import NotFound from "./NotFound";

const RecommendationDetailSkeleton = () => (
  <div className="min-h-screen bg-background max-w-lg mx-auto">
    <div className="pb-10">
      <div className="overflow-hidden rounded-b-[32px]" style={{ background: "var(--hero-gradient)" }}>
        <div className="px-5 pt-12 pb-6">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="mt-5 aspect-[4/3] rounded-[28px]" />
        </div>
      </div>

      <div className="px-5 mt-6">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-3 h-9 w-4/5" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />

        <div className="grid grid-cols-2 gap-3 mt-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl bg-card p-4 shadow-soft">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-6 w-24" />
            </div>
          ))}
        </div>

        <div className="rounded-[24px] bg-card p-5 shadow-card mt-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-4/5" />
          <Skeleton className="mt-3 h-4 w-5/6" />
        </div>
      </div>
    </div>
  </div>
);

const RecipeDetailPage = () => {
  const navigate = useNavigate();
  const { recipeId } = useParams<{ recipeId: string }>();
  const [favoriteRecipes, setFavoriteRecipes] = useState(() => loadFavoriteRecipes());

  const legacyRecipe = recipeId ? getRecipeById(recipeId) : undefined;
  const recommendationQuery = useQuery({
    queryKey: ["recipe-detail-recommendation", recipeId],
    enabled: !!recipeId && !legacyRecipe,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getCookingRecommendationById(recipeId!),
  });

  const recommendation = legacyRecipe ? undefined : recommendationQuery.data;

  if (!recipeId) {
    return <NotFound />;
  }

  if (!legacyRecipe && recommendationQuery.isLoading) {
    return <RecommendationDetailSkeleton />;
  }

  if (!legacyRecipe && !recommendation) {
    return <NotFound />;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  };

  const handleToggleFavorite = () => {
    if (!recommendation) {
      return;
    }

    setFavoriteRecipes((currentFavorites) => {
      const updatedFavorites = toggleFavoriteRecipe(currentFavorites, recommendation);
      saveFavoriteRecipes(updatedFavorites);
      return updatedFavorites;
    });
  };

  const renderImage = (imageUrl: string | null | undefined, title: string) => {
    if (imageUrl) {
      return <img src={imageUrl} alt={title} className="w-full aspect-[4/3] object-cover" />;
    }

    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-accent/60 text-muted-foreground">
        <ImageOff size={24} />
        <span className="text-sm font-body font-medium">Image unavailable</span>
      </div>
    );
  };

  const renderDetailBody = (currentRecommendation: CookingRecommendation) => {
    const isFavorited = favoriteRecipes.some((favorite) => favorite.id === currentRecommendation.id);

    return (
      <>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
              {COOKING_CUISINE_LABELS[currentRecommendation.cuisine]}
            </span>
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              {COOKING_MEAL_LABELS[currentRecommendation.mealType]}
            </span>
            {currentRecommendation.tags?.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={
              isFavorited
                ? `Remove ${currentRecommendation.title} from favorites`
                : `Save ${currentRecommendation.title} to favorites`
            }
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
              isFavorited
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            <Heart size={18} fill={isFavorited ? "currentColor" : "none"} />
          </button>
        </div>

        <h1 className="text-3xl font-display font-semibold text-foreground mt-3">{currentRecommendation.title}</h1>
        <p className="text-sm font-body text-muted-foreground mt-2">{currentRecommendation.description}</p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-card rounded-2xl p-4 shadow-soft">
            <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
              <Clock size={16} className="text-primary" />
              Cook Time
            </span>
            <p className="text-lg font-display font-semibold text-foreground mt-2">
              {formatCookTimeMinutes(currentRecommendation.cookTimeMinutes)}
            </p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-soft">
            <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
              <UtensilsCrossed size={16} className="text-primary" />
              Meal Type
            </span>
            <p className="text-lg font-display font-semibold text-foreground mt-2">
              {COOKING_MEAL_LABELS[currentRecommendation.mealType]}
            </p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-soft">
            <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
              <ChefHat size={16} className="text-primary" />
              Cuisine
            </span>
            <p className="text-lg font-display font-semibold text-foreground mt-2">
              {COOKING_CUISINE_LABELS[currentRecommendation.cuisine]}
            </p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-soft">
            <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
              <Star size={16} className="text-primary" />
              Difficulty
            </span>
            <p className="text-lg font-display font-semibold text-foreground mt-2">
              {currentRecommendation.difficulty ?? "Easy"}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-[24px] shadow-card p-5 mt-6">
          <h2 className="text-lg font-display font-semibold text-foreground">Ingredients</h2>
          <ul className="space-y-3 mt-4">
            {currentRecommendation.ingredients.map((ingredient) => (
              <li key={ingredient} className="flex items-center gap-3 text-sm font-body text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                {ingredient}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card rounded-[24px] shadow-card p-5 mt-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Instructions</h2>
          <ol className="space-y-4 mt-4">
            {currentRecommendation.instructions.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm font-body text-muted-foreground">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="pb-10">
        <div className="relative overflow-hidden rounded-b-[32px]" style={{ background: "var(--hero-gradient)" }}>
          <div className="px-5 pt-12 pb-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-body text-foreground/80 hover:text-foreground transition-colors"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div className="mt-5 rounded-[28px] overflow-hidden shadow-card">
              {legacyRecipe ? renderImage(legacyRecipe.image, legacyRecipe.title) : renderImage(recommendation?.imageUrl, recommendation!.title)}
            </div>
          </div>
        </div>

        <div className="px-5 mt-6">
          {legacyRecipe ? (
            <>
              <span
                className={`inline-flex px-3 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                  legacyRecipe.tagColor === "secondary" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                }`}
              >
                {legacyRecipe.tag}
              </span>

              <h1 className="text-3xl font-display font-semibold text-foreground mt-3">{legacyRecipe.title}</h1>
              <p className="text-sm font-body text-muted-foreground mt-2">{legacyRecipe.description}</p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-card rounded-2xl p-4 shadow-soft">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <Clock size={16} className="text-primary" />
                    Cook Time
                  </span>
                  <p className="text-lg font-display font-semibold text-foreground mt-2">{legacyRecipe.time}</p>
                </div>
                <div className="bg-card rounded-2xl p-4 shadow-soft">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <Users size={16} className="text-primary" />
                    Servings
                  </span>
                  <p className="text-lg font-display font-semibold text-foreground mt-2">{legacyRecipe.servings}</p>
                </div>
                <div className="bg-card rounded-2xl p-4 shadow-soft">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <Star size={16} className="text-primary fill-primary" />
                    Rating
                  </span>
                  <p className="text-lg font-display font-semibold text-foreground mt-2">{legacyRecipe.rating}</p>
                </div>
                <div className="bg-card rounded-2xl p-4 shadow-soft">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <ChefHat size={16} className="text-primary" />
                    Difficulty
                  </span>
                  <p className="text-lg font-display font-semibold text-foreground mt-2">{legacyRecipe.difficulty}</p>
                </div>
              </div>

              <div className="bg-card rounded-[24px] shadow-card p-5 mt-6">
                <h2 className="text-lg font-display font-semibold text-foreground">Ingredients</h2>
                <ul className="space-y-3 mt-4">
                  {legacyRecipe.ingredients.map((ingredient) => (
                    <li key={ingredient} className="flex items-center gap-3 text-sm font-body text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card rounded-[24px] shadow-card p-5 mt-4">
                <h2 className="text-lg font-display font-semibold text-foreground">Instructions</h2>
                <ol className="space-y-4 mt-4">
                  {legacyRecipe.instructions.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm font-body text-muted-foreground">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            renderDetailBody(recommendation!)
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;
