import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { mockCookingRecommendations } from "@/data/cookingRecommendations";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { MealPeriod } from "@/lib/mealTime";

export type CookingCuisine = "chinese" | "malay" | "indian" | "japanese" | "western";
export type CookingMealType = MealPeriod;
export type CookingCuisineFilter = "all" | CookingCuisine;

export interface CookingRecommendation {
  id: string;
  title: string;
  description: string;
  cuisine: CookingCuisine;
  mealType: CookingMealType | CookingMealType[];
  cookTimeMinutes: number;
  ingredients: string[];
  instructions: string[];
  imageUrl: string | null;
  isRecommended: boolean;
  difficulty?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GetCookingRecommendationsParams {
  mealType?: CookingMealType;
  cuisine?: CookingCuisine;
}

interface CookingRecommendationSource {
  getById: (id: string) => Promise<CookingRecommendation | null>;
  list: () => Promise<CookingRecommendation[]>;
}

type FirestoreTimestampLike = {
  toDate?: () => Date;
};

const cookingCuisines: CookingCuisine[] = ["chinese", "malay", "indian", "japanese", "western"];
const cookingMealTypes: CookingMealType[] = ["breakfast", "lunch", "dinner", "supper"];

export const COOKING_CUISINE_LABELS: Record<CookingCuisine, string> = {
  chinese: "Chinese",
  malay: "Malay",
  indian: "Indian",
  japanese: "Japanese",
  western: "Western",
};

export const COOKING_MEAL_LABELS: Record<CookingMealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  supper: "Supper",
};

export const cookingCuisineFilters: Array<{ label: string; value: CookingCuisineFilter }> = [
  { label: "All", value: "all" },
  { label: "Chinese", value: "chinese" },
  { label: "Malay", value: "malay" },
  { label: "Indian", value: "indian" },
  { label: "Japanese", value: "japanese" },
  { label: "Western", value: "western" },
];

const normalizeCookingCuisine = (value: unknown): CookingCuisine | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return cookingCuisines.find((cuisine) => cuisine === normalized);
};

const normalizeCookingMealType = (value: unknown): CookingMealType | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return cookingMealTypes.find((mealType) => mealType === normalized);
};

const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const toTimestampString = (value: unknown) => {
  const candidate = value as FirestoreTimestampLike | undefined;

  if (typeof candidate?.toDate === "function") {
    return candidate.toDate().toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
};

const mapRecommendation = (
  id: string,
  data: Record<string, unknown>,
): CookingRecommendation | null => {
  const mealTypeValue = data.mealType;
  const mealType = Array.isArray(mealTypeValue)
    ? mealTypeValue
        .map((item) => normalizeCookingMealType(item))
        .filter((item): item is CookingMealType => Boolean(item))
    : normalizeCookingMealType(mealTypeValue);

  const cuisine = normalizeCookingCuisine(data.cuisine);

  if (!cuisine || !mealType || (Array.isArray(mealType) && mealType.length === 0)) {
    return null;
  }

  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    cuisine,
    mealType,
    cookTimeMinutes: Number(data.cookTimeMinutes ?? 0),
    ingredients: toStringArray(data.ingredients),
    instructions: toStringArray(data.instructions),
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
    isRecommended: Boolean(data.isRecommended),
    difficulty: typeof data.difficulty === "string" ? data.difficulty : undefined,
    tags: toStringArray(data.tags),
    createdAt: toTimestampString(data.createdAt),
    updatedAt: toTimestampString(data.updatedAt),
  };
};

const cookingRecommendationSource: CookingRecommendationSource = {
  async getById(id) {
    if (!isFirebaseConfigured || !db) {
      return mockCookingRecommendations.find((recommendation) => recommendation.id === id) ?? null;
    }

    const snapshot = await getDoc(doc(db, "cooking_recommendations", id));

    if (!snapshot.exists()) {
      return null;
    }

    return mapRecommendation(snapshot.id, snapshot.data() as Record<string, unknown>);
  },
  async list() {
    if (!isFirebaseConfigured || !db) {
      return mockCookingRecommendations;
    }

    const snapshot = await getDocs(collection(db, "cooking_recommendations"));

    return snapshot.docs
      .map((docSnapshot) => mapRecommendation(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .filter((recommendation): recommendation is CookingRecommendation => recommendation !== null);
  },
};

export const formatCookTimeMinutes = (minutes: number) => `${minutes} Min`;

export const listCookingRecommendations = async ({
  mealType,
  cuisine,
}: GetCookingRecommendationsParams = {}): Promise<CookingRecommendation[]> => {
  const recommendations = await cookingRecommendationSource.list();

  return recommendations
    .filter((recommendation) => {
      if (!mealType) {
        return true;
      }

      return Array.isArray(recommendation.mealType)
        ? recommendation.mealType.includes(mealType)
        : recommendation.mealType === mealType;
    })
    .filter((recommendation) => !cuisine || recommendation.cuisine === cuisine)
    .sort((left, right) => {
      const recommendationDelta = Number(right.isRecommended) - Number(left.isRecommended);

      if (recommendationDelta !== 0) {
        return recommendationDelta;
      }

      const cookTimeDelta = left.cookTimeMinutes - right.cookTimeMinutes;

      if (cookTimeDelta !== 0) {
        return cookTimeDelta;
      }

      return left.title.localeCompare(right.title);
    });
};

export const getCookingRecommendationById = async (id: string) =>
  cookingRecommendationSource.getById(id);
