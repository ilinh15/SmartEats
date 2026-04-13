import { deleteDoc, doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import {
  COOKING_CUISINE_LABELS,
  COOKING_MEAL_LABELS,
  formatCookTimeMinutes,
  type CookingCuisine,
  type CookingMealType,
  type CookingRecommendation,
} from "@/lib/cookingRecommendations";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { GeneratedRecipe } from "@/lib/recipeGeneration";

const FAVORITE_RECIPES_COLLECTION = "favorite_recipes";
const VALID_CUISINES = new Set(["chinese", "malay", "indian", "japanese", "western"]);
const VALID_MEALS = new Set(["breakfast", "lunch", "dinner", "supper"]);
const VALID_SOURCES = new Set(["recommendation", "generated"]);

interface FirestoreTimestampLike {
  toDate?: () => Date;
}

export type SavedRecipeSource = "recommendation" | "generated";

export interface SavedRecipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  imageUrl: string | null;
  source: SavedRecipeSource;
  savedAt: string;
  cuisine?: CookingCuisine;
  cuisineLabel?: string;
  mealType?: CookingMealType;
  mealTypeLabel?: string;
  cookTimeMinutes?: number;
  cookTimeLabel?: string;
  prepTimeLabel?: string;
  servings?: string;
  difficulty?: string;
  tag?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  isRecommended?: boolean;
  seedIngredients?: string[];
}

export type FavoriteRecipeInput = CookingRecommendation | SavedRecipe;

interface GeneratedRecipeContext {
  selectedIngredients: string[];
  selectedCuisine: string;
}

const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const toTimestampString = (value: unknown) => {
  const candidate = value as FirestoreTimestampLike | undefined;

  if (typeof candidate?.toDate === "function") {
    return candidate.toDate().toISOString();
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return undefined;
};

const parseMinutesLabel = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
};

const toCookingCuisine = (value: unknown): CookingCuisine | undefined =>
  typeof value === "string" && VALID_CUISINES.has(value) ? (value as CookingCuisine) : undefined;

const toCookingMealType = (value: unknown): CookingMealType | undefined =>
  typeof value === "string" && VALID_MEALS.has(value) ? (value as CookingMealType) : undefined;

const toNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const toSource = (value: unknown): SavedRecipeSource | undefined =>
  typeof value === "string" && VALID_SOURCES.has(value) ? (value as SavedRecipeSource) : undefined;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "recipe";

const hashString = (value: string) => {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
};

const inferSource = (candidate: Partial<SavedRecipe>): SavedRecipeSource => {
  const explicitSource = toSource(candidate.source);

  if (explicitSource) {
    return explicitSource;
  }

  return Array.isArray(candidate.seedIngredients) ? "generated" : "recommendation";
};

const normalizeSavedRecipe = (recipe: SavedRecipe): SavedRecipe => ({
  ...recipe,
  imageUrl: recipe.imageUrl ?? null,
  ingredients: uniqueStrings(recipe.ingredients),
  instructions: uniqueStrings(recipe.instructions),
  tags: recipe.tags ? uniqueStrings(recipe.tags) : undefined,
  seedIngredients: recipe.seedIngredients ? uniqueStrings(recipe.seedIngredients) : undefined,
  savedAt: recipe.savedAt || new Date().toISOString(),
});

export const isSavedRecipe = (value: FavoriteRecipeInput): value is SavedRecipe =>
  typeof (value as Partial<SavedRecipe>)?.savedAt === "string" &&
  typeof (value as Partial<SavedRecipe>)?.source === "string";

export const createSavedRecipeFromRecommendation = (recipe: CookingRecommendation): SavedRecipe => ({
  id: recipe.id,
  title: recipe.title,
  description: recipe.description,
  ingredients: [...recipe.ingredients],
  instructions: [...recipe.instructions],
  imageUrl: recipe.imageUrl ?? null,
  source: "recommendation",
  savedAt: new Date().toISOString(),
  cuisine: recipe.cuisine,
  cuisineLabel: COOKING_CUISINE_LABELS[recipe.cuisine],
  mealType: recipe.mealType,
  mealTypeLabel: COOKING_MEAL_LABELS[recipe.mealType],
  cookTimeMinutes: recipe.cookTimeMinutes,
  cookTimeLabel: formatCookTimeMinutes(recipe.cookTimeMinutes),
  difficulty: recipe.difficulty,
  tags: recipe.tags,
  createdAt: recipe.createdAt,
  updatedAt: recipe.updatedAt,
  isRecommended: recipe.isRecommended,
});

export const createGeneratedRecipeFavoriteId = (
  recipe: GeneratedRecipe,
  { selectedCuisine, selectedIngredients }: GeneratedRecipeContext,
) => {
  const normalizedTitle = slugify(recipe.title);
  const normalizedCuisine = selectedCuisine.trim().toLowerCase();
  const normalizedIngredients = uniqueStrings(selectedIngredients)
    .map((ingredient) => ingredient.toLowerCase())
    .sort()
    .join("|");
  const signature = hashString(`${normalizedTitle}::${normalizedCuisine}::${normalizedIngredients}`);

  return `generated-${normalizedTitle}-${signature}`;
};

const buildGeneratedRecipeDescription = (
  recipe: GeneratedRecipe,
  { selectedCuisine, selectedIngredients }: GeneratedRecipeContext,
) => {
  const ingredientSnippet = uniqueStrings(selectedIngredients).slice(0, 3);
  const cuisineLabel = selectedCuisine.trim() && selectedCuisine !== "All" ? selectedCuisine.trim() : undefined;
  const lead = cuisineLabel ? `AI-generated ${cuisineLabel.toLowerCase()} recipe` : "AI-generated recipe";
  const body =
    ingredientSnippet.length > 0
      ? ` built from ${ingredientSnippet.join(", ")}${selectedIngredients.length > 3 ? ", and more" : ""}`
      : "";
  const tagText = recipe.tag ? ` with a ${recipe.tag.toLowerCase()} profile` : "";

  return `${lead}${body}${tagText}.`;
};

export const createSavedRecipeFromGeneratedRecipe = (
  recipe: GeneratedRecipe,
  context: GeneratedRecipeContext,
): SavedRecipe => {
  const cuisine = toCookingCuisine(context.selectedCuisine.toLowerCase());
  const cuisineLabel =
    context.selectedCuisine.trim() && context.selectedCuisine !== "All" ? context.selectedCuisine.trim() : undefined;

  return normalizeSavedRecipe({
    id: createGeneratedRecipeFavoriteId(recipe, context),
    title: recipe.title,
    description: buildGeneratedRecipeDescription(recipe, context),
    ingredients: [...recipe.ingredients],
    instructions: [...recipe.instructions],
    imageUrl: recipe.imageUrl ?? null,
    source: "generated",
    savedAt: new Date().toISOString(),
    cuisine,
    cuisineLabel: cuisine ? COOKING_CUISINE_LABELS[cuisine] : cuisineLabel,
    cookTimeMinutes: parseMinutesLabel(recipe.cookTime),
    cookTimeLabel: recipe.cookTime,
    prepTimeLabel: recipe.prepTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    tag: recipe.tag,
    tags: recipe.tag ? [recipe.tag] : undefined,
    seedIngredients: [...context.selectedIngredients],
  });
};

export const toSavedRecipeSnapshot = (recipe: FavoriteRecipeInput): SavedRecipe =>
  isSavedRecipe(recipe) ? normalizeSavedRecipe(recipe) : createSavedRecipeFromRecommendation(recipe);

const mapSavedRecipe = (id: string, value: unknown): SavedRecipe | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SavedRecipe>;
  const savedAt = toTimestampString(candidate.savedAt);
  const title = toNonEmptyString(candidate.title);
  const description = toNonEmptyString(candidate.description);

  if (!savedAt || !title || !description) {
    return null;
  }

  const cuisine = toCookingCuisine(candidate.cuisine);
  const mealType = toCookingMealType(candidate.mealType);
  const source = inferSource(candidate);
  const cookTimeMinutes =
    typeof candidate.cookTimeMinutes === "number" ? candidate.cookTimeMinutes : parseMinutesLabel(toNonEmptyString(candidate.cookTimeLabel));

  return normalizeSavedRecipe({
    id,
    title,
    description,
    ingredients: toStringArray(candidate.ingredients),
    instructions: toStringArray(candidate.instructions),
    imageUrl: typeof candidate.imageUrl === "string" ? candidate.imageUrl : null,
    source,
    savedAt,
    cuisine,
    cuisineLabel: toNonEmptyString(candidate.cuisineLabel) ?? (cuisine ? COOKING_CUISINE_LABELS[cuisine] : undefined),
    mealType,
    mealTypeLabel: toNonEmptyString(candidate.mealTypeLabel) ?? (mealType ? COOKING_MEAL_LABELS[mealType] : undefined),
    cookTimeMinutes,
    cookTimeLabel:
      toNonEmptyString(candidate.cookTimeLabel) ?? (typeof cookTimeMinutes === "number" ? formatCookTimeMinutes(cookTimeMinutes) : undefined),
    prepTimeLabel: toNonEmptyString(candidate.prepTimeLabel),
    servings: toNonEmptyString(candidate.servings),
    difficulty: toNonEmptyString(candidate.difficulty),
    tag: toNonEmptyString(candidate.tag),
    tags: toStringArray(candidate.tags),
    createdAt: toTimestampString(candidate.createdAt),
    updatedAt: toTimestampString(candidate.updatedAt),
    isRecommended: typeof candidate.isRecommended === "boolean" ? candidate.isRecommended : undefined,
    seedIngredients: toStringArray(candidate.seedIngredients),
  });
};

const getFavoriteRecipeCollection = (uid: string) => collection(db!, "users", uid, FAVORITE_RECIPES_COLLECTION);

const getFavoriteRecipeDocument = (uid: string, recipeId: string) =>
  doc(db!, "users", uid, FAVORITE_RECIPES_COLLECTION, recipeId);

export const loadFavoriteRecipes = async (uid: string): Promise<SavedRecipe[]> => {
  if (!isFirebaseConfigured || !db || !uid) {
    return [];
  }

  const snapshot = await getDocs(getFavoriteRecipeCollection(uid));

  return snapshot.docs
    .map((docSnapshot) => mapSavedRecipe(docSnapshot.id, docSnapshot.data()))
    .filter((recipe): recipe is SavedRecipe => recipe !== null)
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
};

export const getFavoriteRecipeById = async (uid: string, recipeId: string): Promise<SavedRecipe | null> => {
  if (!isFirebaseConfigured || !db || !uid) {
    return null;
  }

  const snapshot = await getDoc(getFavoriteRecipeDocument(uid, recipeId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapSavedRecipe(snapshot.id, snapshot.data());
};

export const toggleFavoriteRecipe = async (
  uid: string,
  recipe: FavoriteRecipeInput,
): Promise<SavedRecipe | null> => {
  if (!isFirebaseConfigured || !db || !uid) {
    throw new Error("Firebase is not configured for favorites.");
  }

  const recipeSnapshot = toSavedRecipeSnapshot(recipe);
  const favoriteDocument = getFavoriteRecipeDocument(uid, recipeSnapshot.id);
  const snapshot = await getDoc(favoriteDocument);

  if (snapshot.exists()) {
    await deleteDoc(favoriteDocument);
    return null;
  }

  const savedRecipe = normalizeSavedRecipe({
    ...recipeSnapshot,
    savedAt: new Date().toISOString(),
  });

  // Filter out undefined values before saving to Firestore
  const dataToSave = Object.fromEntries(
    Object.entries(savedRecipe).filter(([_, value]) => value !== undefined),
  ) as SavedRecipe;

  await setDoc(favoriteDocument, dataToSave);

  return savedRecipe;
};
