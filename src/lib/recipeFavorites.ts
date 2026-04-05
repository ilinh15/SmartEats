import type { CookingRecommendation } from "@/lib/cookingRecommendations";

const FAVORITE_RECIPES_STORAGE_KEY = "smart-eats.favorite-recipes";
const VALID_CUISINES = new Set(["chinese", "malay", "indian", "japanese", "western"]);
const VALID_MEALS = new Set(["breakfast", "lunch", "dinner", "supper"]);

export interface SavedRecipe extends CookingRecommendation {
  savedAt: string;
}

const isSavedRecipe = (value: unknown): value is SavedRecipe => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SavedRecipe>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.savedAt === "string" &&
    VALID_CUISINES.has(candidate.cuisine ?? "") &&
    VALID_MEALS.has(candidate.mealType ?? "") &&
    typeof candidate.cookTimeMinutes === "number" &&
    Array.isArray(candidate.ingredients) &&
    candidate.ingredients.every((ingredient) => typeof ingredient === "string") &&
    Array.isArray(candidate.instructions) &&
    candidate.instructions.every((instruction) => typeof instruction === "string") &&
    (typeof candidate.imageUrl === "string" || candidate.imageUrl === null) &&
    typeof candidate.isRecommended === "boolean"
  );
};

export const createSavedRecipe = (recipe: CookingRecommendation): SavedRecipe => ({
  ...recipe,
  savedAt: new Date().toISOString(),
});

export const loadFavoriteRecipes = (): SavedRecipe[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(FAVORITE_RECIPES_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedRecipe);
  } catch {
    return [];
  }
};

export const saveFavoriteRecipes = (recipes: SavedRecipe[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITE_RECIPES_STORAGE_KEY, JSON.stringify(recipes));
};

export const toggleFavoriteRecipe = (
  currentFavorites: SavedRecipe[],
  recipe: CookingRecommendation,
): SavedRecipe[] => {
  const isAlreadyFavorite = currentFavorites.some((favorite) => favorite.id === recipe.id);

  if (isAlreadyFavorite) {
    return currentFavorites.filter((favorite) => favorite.id !== recipe.id);
  }

  return [createSavedRecipe(recipe), ...currentFavorites];
};
