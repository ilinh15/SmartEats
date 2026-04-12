import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChefHat, Clock, Heart, ImageOff, Star, Users, UtensilsCrossed } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecipeById } from "@/data/recipes";
import {
  COOKING_CUISINE_LABELS,
  COOKING_MEAL_LABELS,
  formatCookTimeMinutes,
  getCookingRecommendationById,
} from "@/lib/cookingRecommendations";
import { auth } from "@/lib/firebase";
import {
  loadFavoriteRecipes,
  toSavedRecipeSnapshot,
  toggleFavoriteRecipe,
  type SavedRecipe,
} from "@/lib/recipeFavorites";
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
  const { toast } = useToast();
  const { recipeId } = useParams<{ recipeId: string }>();
  const authClient = auth || getAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(authClient.currentUser);
  const [favoriteRecipes, setFavoriteRecipes] = useState<SavedRecipe[]>([]);
  const [resolvedSavedRecipe, setResolvedSavedRecipe] = useState<SavedRecipe | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isFavoriteSyncing, setIsFavoriteSyncing] = useState(true);
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false);

  const legacyRecipe = recipeId ? getRecipeById(recipeId) : undefined;
  const recommendationQuery = useQuery({
    queryKey: ["recipe-detail-recommendation", recipeId],
    enabled: !!recipeId && !legacyRecipe,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getCookingRecommendationById(recipeId!),
  });

  const recommendation = legacyRecipe ? undefined : recommendationQuery.data;
  const recommendationSnapshot = useMemo(
    () => (recommendation ? toSavedRecipeSnapshot(recommendation) : null),
    [recommendation],
  );

  useEffect(() => {
    let isActive = true;

    const unsubscribe = onAuthStateChanged(authClient, async (user) => {
      if (!isActive) {
        return;
      }

      setCurrentUser(user);
      setIsAuthResolved(true);

      if (!user) {
        setFavoriteRecipes([]);
        setIsFavoriteSyncing(false);
        return;
      }

      setIsFavoriteSyncing(true);

      try {
        const loadedFavoriteRecipes = await loadFavoriteRecipes(user.uid);

        if (!isActive) {
          return;
        }

        setFavoriteRecipes(loadedFavoriteRecipes);
      } catch (error) {
        console.error("Failed to load recipe favorites:", error);

        if (!isActive) {
          return;
        }

        setFavoriteRecipes([]);
      } finally {
        if (isActive) {
          setIsFavoriteSyncing(false);
        }
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [authClient]);

  useEffect(() => {
    setResolvedSavedRecipe(null);
  }, [recipeId]);

  useEffect(() => {
    if (!recipeId) {
      return;
    }

    const matchedFavorite = favoriteRecipes.find((favorite) => favorite.id === recipeId);

    if (matchedFavorite) {
      setResolvedSavedRecipe(matchedFavorite);
    }
  }, [favoriteRecipes, recipeId]);

  const favoriteRecipe = recommendationSnapshot ? null : resolvedSavedRecipe;
  const shouldWaitForFavoriteFallback = !recommendationSnapshot && !!currentUser && isFavoriteSyncing;

  if (!recipeId) {
    return <NotFound />;
  }

  if (!legacyRecipe && (recommendationQuery.isLoading || !isAuthResolved || shouldWaitForFavoriteFallback)) {
    return <RecommendationDetailSkeleton />;
  }

  if (!legacyRecipe && !recommendationSnapshot && !favoriteRecipe) {
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
    const detailRecipe = recommendationSnapshot ?? favoriteRecipe;

    if (!detailRecipe) {
      return;
    }

    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorite recipes.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (isFavoriteUpdating) {
      return;
    }

    const currentFavorites = favoriteRecipes;
    const isAlreadyFavorite = currentFavorites.some((favorite) => favorite.id === detailRecipe.id);
    const nextFavorites = isAlreadyFavorite
      ? currentFavorites.filter((favorite) => favorite.id !== detailRecipe.id)
      : [detailRecipe, ...currentFavorites];

    setFavoriteRecipes(nextFavorites);
    setIsFavoriteUpdating(true);

    void toggleFavoriteRecipe(currentUser.uid, detailRecipe)
      .then((savedRecipe) => {
        if (savedRecipe) {
          setFavoriteRecipes((currentState) => [
            savedRecipe,
            ...currentState.filter((favorite) => favorite.id !== savedRecipe.id),
          ]);
        }
      })
      .catch((error) => {
        console.error("Failed to update recipe favorite:", error);
        setFavoriteRecipes(currentFavorites);
        toast({
          title: "Could not update favorite",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsFavoriteUpdating(false);
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

  const renderDetailBody = (currentRecipe: SavedRecipe) => {
    const isFavorited = favoriteRecipes.some((favorite) => favorite.id === currentRecipe.id);
    const favoriteButtonDisabled = isFavoriteSyncing || isFavoriteUpdating;
    const cuisineLabel = currentRecipe.cuisineLabel ?? (currentRecipe.cuisine ? COOKING_CUISINE_LABELS[currentRecipe.cuisine] : undefined);
    const mealLabel = currentRecipe.mealTypeLabel ?? (currentRecipe.mealType ? COOKING_MEAL_LABELS[currentRecipe.mealType] : undefined);
    const cookTimeLabel =
      currentRecipe.cookTimeLabel ??
      (typeof currentRecipe.cookTimeMinutes === "number" ? formatCookTimeMinutes(currentRecipe.cookTimeMinutes) : undefined);
    const displayTags = Array.from(
      new Set(
        [...(currentRecipe.tags ?? []), currentRecipe.tag].filter(
          (tag): tag is string => typeof tag === "string" && tag.trim().length > 0,
        ),
      ),
    );
    const detailItems = [
      cookTimeLabel
        ? {
            icon: <Clock size={16} className="text-primary" />,
            label: "Cook Time",
            value: cookTimeLabel,
          }
        : null,
      currentRecipe.prepTimeLabel
        ? {
            icon: <Clock size={16} className="text-primary" />,
            label: "Prep Time",
            value: currentRecipe.prepTimeLabel,
          }
        : null,
      currentRecipe.servings
        ? {
            icon: <Users size={16} className="text-primary" />,
            label: "Servings",
            value: currentRecipe.servings,
          }
        : null,
      mealLabel
        ? {
            icon: <UtensilsCrossed size={16} className="text-primary" />,
            label: "Meal Type",
            value: mealLabel,
          }
        : null,
      cuisineLabel
        ? {
            icon: <ChefHat size={16} className="text-primary" />,
            label: "Cuisine",
            value: cuisineLabel,
          }
        : null,
      currentRecipe.difficulty
        ? {
            icon: <Star size={16} className="text-primary" />,
            label: "Difficulty",
            value: currentRecipe.difficulty,
          }
        : null,
    ].filter(
      (
        item,
      ): item is {
        icon: JSX.Element;
        label: string;
        value: string;
      } => item !== null,
    );

    return (
      <>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {cuisineLabel && (
              <span
                className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary"
              >
                {cuisineLabel}
              </span>
            )}
            {mealLabel && (
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                {mealLabel}
              </span>
            )}
            {displayTags.slice(0, 1).map((tag) => (
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
            disabled={favoriteButtonDisabled}
            aria-label={
              isFavorited
                ? `Remove ${currentRecipe.title} from favorites`
                : `Save ${currentRecipe.title} to favorites`
            }
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
              isFavorited
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
            } ${favoriteButtonDisabled ? "cursor-not-allowed opacity-70" : ""}`}
          >
            <Heart size={18} fill={isFavorited ? "currentColor" : "none"} />
          </button>
        </div>

        <h1 className="text-3xl font-display font-semibold text-foreground mt-3">{currentRecipe.title}</h1>
        <p className="text-sm font-body text-muted-foreground mt-2">{currentRecipe.description}</p>

        {detailItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-6">
            {detailItems.map((item) => (
              <div key={item.label} className="bg-card rounded-2xl p-4 shadow-soft">
                <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                  {item.icon}
                  {item.label}
                </span>
                <p className="text-lg font-display font-semibold text-foreground mt-2">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card rounded-[24px] shadow-card p-5 mt-6">
          <h2 className="text-lg font-display font-semibold text-foreground">Ingredients</h2>
          <ul className="space-y-3 mt-4">
            {currentRecipe.ingredients.map((ingredient) => (
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
            {currentRecipe.instructions.map((step, index) => (
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
              {legacyRecipe
                ? renderImage(legacyRecipe.image, legacyRecipe.title)
                : renderImage((recommendationSnapshot ?? favoriteRecipe)?.imageUrl, (recommendationSnapshot ?? favoriteRecipe)!.title)}
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
            renderDetailBody((recommendationSnapshot ?? favoriteRecipe)!)
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;
