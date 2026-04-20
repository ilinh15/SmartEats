import { mockCookingRecommendations } from "@/data/cookingRecommendations";
import { fetchRecipeImage } from "@/lib/recipeGeneration";
import type { MealPeriod } from "@/lib/mealTime";

export type CookingCuisine = "chinese" | "malay" | "indian" | "japanese" | "korean" | "western";
export type CookingMealType = MealPeriod;
export type CookingCuisineFilter = "all" | CookingCuisine;

export interface CookingRecommendation {
  id: string;
  title: string;
  description: string;
  cuisine: CookingCuisine;
  mealType: CookingMealType;
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

interface RawCookingRecommendation {
  title?: unknown;
  description?: unknown;
  cuisine?: unknown;
  mealType?: unknown;
  cookTimeMinutes?: unknown;
  ingredients?: unknown;
  instructions?: unknown;
  difficulty?: unknown;
  tags?: unknown;
  imageUrl?: unknown;
  isRecommended?: unknown;
}

interface RecommendationPayload {
  recommendations?: RawCookingRecommendation[];
}

interface CachedRecommendationQuery {
  generatedAt: string;
  recommendations: CookingRecommendation[];
}

interface RecommendationCacheState {
  byId: Record<string, CookingRecommendation>;
  queries: Record<string, CachedRecommendationQuery>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface MistralResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const AI_RECOMMENDATION_CACHE_KEY = "smarteats.ai-cooking-recommendations.v1";
const AI_RECOMMENDATION_CACHE_TTL_MS = 30 * 60 * 1000;
const AI_RECOMMENDATION_COUNT = 6;
const TEST_MODE = import.meta.env.MODE === "test";

const cookingCuisines: CookingCuisine[] = ["chinese", "malay", "indian", "japanese", "korean", "western"];
const cookingMealTypes: CookingMealType[] = ["breakfast", "lunch", "dinner", "supper"];

export const COOKING_CUISINE_LABELS: Record<CookingCuisine, string> = {
  chinese: "Chinese",
  malay: "Malay",
  indian: "Indian",
  japanese: "Japanese",
  korean: "Korean",
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
  { label: "Korean", value: "korean" },
  { label: "Western", value: "western" },
];

const emptyCacheState = (): RecommendationCacheState => ({
  byId: {},
  queries: {},
});

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

const toNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const uniqueStrings = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const toTimestampString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const toCookTimeMinutes = (value: unknown) => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return undefined;
  }

  return Math.max(5, Math.min(180, Math.round(numericValue)));
};

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

const buildRecommendationId = ({
  title,
  cuisine,
  mealType,
  ingredients,
}: Pick<CookingRecommendation, "title" | "cuisine" | "mealType" | "ingredients">) => {
  const normalizedTitle = slugify(title);
  const signature = hashString(`${normalizedTitle}::${cuisine}::${mealType}::${ingredients.join("|").toLowerCase()}`);

  return `${normalizedTitle}-${signature}`;
};

const buildQueryKey = ({ mealType, cuisine }: GetCookingRecommendationsParams) =>
  `${mealType ?? "all"}::${cuisine ?? "all"}`;

const isCacheStale = (generatedAt?: string) => {
  if (!generatedAt) {
    return true;
  }

  const timestamp = new Date(generatedAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > AI_RECOMMENDATION_CACHE_TTL_MS;
};

const readRecommendationCache = (): RecommendationCacheState => {
  if (typeof window === "undefined") {
    return emptyCacheState();
  }

  try {
    const rawValue = window.localStorage.getItem(AI_RECOMMENDATION_CACHE_KEY);

    if (!rawValue) {
      return emptyCacheState();
    }

    const parsed = JSON.parse(rawValue) as Partial<RecommendationCacheState>;
    const byId = parsed.byId && typeof parsed.byId === "object" ? parsed.byId : {};
    const queries = parsed.queries && typeof parsed.queries === "object" ? parsed.queries : {};

    return {
      byId: byId as Record<string, CookingRecommendation>,
      queries: queries as Record<string, CachedRecommendationQuery>,
    };
  } catch (error) {
    console.warn("Failed to read cooking recommendation cache:", error);
    return emptyCacheState();
  }
};

const writeRecommendationCache = (cacheState: RecommendationCacheState) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AI_RECOMMENDATION_CACHE_KEY, JSON.stringify(cacheState));
  } catch (error) {
    console.warn("Failed to write cooking recommendation cache:", error);
  }
};

const cacheRecommendations = (
  params: GetCookingRecommendationsParams,
  recommendations: CookingRecommendation[],
) => {
  const cacheState = readRecommendationCache();
  const generatedAt = new Date().toISOString();
  const queryKey = buildQueryKey(params);

  cacheState.queries[queryKey] = {
    generatedAt,
    recommendations,
  };

  recommendations.forEach((recommendation) => {
    cacheState.byId[recommendation.id] = recommendation;
  });

  writeRecommendationCache(cacheState);
};

const getCachedRecommendations = (params: GetCookingRecommendationsParams) => {
  const cacheState = readRecommendationCache();
  const queryKey = buildQueryKey(params);
  const cachedQuery = cacheState.queries[queryKey];

  if (!cachedQuery || isCacheStale(cachedQuery.generatedAt)) {
    return null;
  }

  return cachedQuery.recommendations;
};

const getCachedRecommendationById = (id: string) => {
  const cacheState = readRecommendationCache();
  return cacheState.byId[id] ?? null;
};

const sortRecommendations = (recommendations: CookingRecommendation[]) =>
  [...recommendations].sort((left, right) => {
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

const filterRecommendations = (
  recommendations: CookingRecommendation[],
  { mealType, cuisine }: GetCookingRecommendationsParams,
) =>
  sortRecommendations(
    recommendations.filter((recommendation) => {
      if (mealType && recommendation.mealType !== mealType) {
        return false;
      }

      if (cuisine && recommendation.cuisine !== cuisine) {
        return false;
      }

      return true;
    }),
  );

const hasGeminiKey = () =>
  !!import.meta.env.VITE_GEMINI_API_KEY &&
  import.meta.env.VITE_GEMINI_API_KEY !== "your-gemini-api-key-here";

const hasMistralKey = () =>
  !!import.meta.env.VITE_MISTRAL_API_KEY &&
  import.meta.env.VITE_MISTRAL_API_KEY !== "your-mistral-api-key-here";

const hasUnsplashKey = () =>
  !!import.meta.env.VITE_UNSPLASH_ACCESS_KEY &&
  import.meta.env.VITE_UNSPLASH_ACCESS_KEY !== "your-unsplash-access-key";

const buildRecommendationPrompt = ({ mealType, cuisine }: GetCookingRecommendationsParams) => {
  const cuisineInstruction = cuisine
    ? `Every recommendation must be ${COOKING_CUISINE_LABELS[cuisine]} cuisine.`
    : `Use a varied mix from these cuisines: ${cookingCuisines.join(", ")}. Include at least 4 different cuisines when possible.`;
  const mealInstruction = mealType
    ? `Every recommendation must suit ${mealType}.`
    : "Mix breakfast, lunch, dinner, and supper ideas naturally across the list.";

  return `Generate ${AI_RECOMMENDATION_COUNT} SmartEats recipe recommendations as valid JSON.

Return this exact top-level shape:
{
  "recommendations": [
    {
      "title": "string",
      "description": "string",
      "cuisine": "chinese|malay|indian|japanese|korean|western",
      "mealType": "breakfast|lunch|dinner|supper",
      "cookTimeMinutes": 20,
      "ingredients": ["string", "string", "string"],
      "instructions": ["string", "string", "string"],
      "difficulty": "Easy|Medium|Hard",
      "tags": ["string", "string"],
      "isRecommended": true
    }
  ]
}

Rules:
- Titles must be realistic, appetizing, and all different from one another.
- Descriptions should be one sentence and concise.
- Use 4 to 8 ingredients per recipe.
- Use 3 to 5 instructions per recipe.
- Keep cookTimeMinutes between 10 and 45 when possible.
- Favor recipes practical for home cooks in Singapore.
- Do not include markdown, code fences, commentary, or explanatory text.
- Return valid JSON only.
- ${cuisineInstruction}
- ${mealInstruction}`;
};

const extractJsonPayload = (responseText: string) => {
  const trimmed = responseText.trim();
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  const matchedJson = objectMatch?.[0] ?? arrayMatch?.[0];

  if (!matchedJson) {
    throw new Error(`Invalid JSON in AI recommendation response: ${trimmed.slice(0, 250)}`);
  }

  const parsed = JSON.parse(matchedJson) as RecommendationPayload | RawCookingRecommendation[];

  if (Array.isArray(parsed)) {
    return { recommendations: parsed };
  }

  return parsed;
};

const requestRecommendationJson = async (prompt: string) => {
  if (!hasGeminiKey() && !hasMistralKey()) {
    throw new Error("No AI provider configured. Add VITE_GEMINI_API_KEY or VITE_MISTRAL_API_KEY to enable AI cooking recommendations.");
  }

  let responseJson = "";

  if (hasMistralKey()) {
    const mistralKey = import.meta.env.VITE_MISTRAL_API_KEY;
    const mistralModel = import.meta.env.VITE_MISTRAL_MODEL || "mistral-small-latest";

    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mistralKey}`,
        },
        body: JSON.stringify({
          model: mistralModel,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.8,
          response_format: {
            type: "json_object",
          },
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText) as MistralResponse;
      const textContent = data.choices?.[0]?.message?.content;

      if (!textContent) {
        throw new Error("No JSON payload returned from Mistral.");
      }

      responseJson = textContent.trim();
    } catch (error) {
      if (!hasGeminiKey()) {
        throw error;
      }

      console.warn("Mistral recommendation generation failed, falling back to Gemini:", error);
    }
  }

  if (!responseJson && hasGeminiKey()) {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const geminiModel = String(import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash").toLowerCase().trim();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1800,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText) as GeminiResponse;
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error("No JSON payload returned from Gemini.");
    }

    responseJson = textContent.trim();
  }

  if (!responseJson) {
    throw new Error("AI recommendation generation returned an empty response.");
  }

  return responseJson;
};

const defaultDescription = (cuisine: CookingCuisine, mealType: CookingMealType) =>
  `AI-generated ${COOKING_CUISINE_LABELS[cuisine].toLowerCase()} ${mealType} recipe idea for a home-cooked meal.`;

const normalizeGeneratedRecommendation = (
  candidate: RawCookingRecommendation,
  index: number,
  params: GetCookingRecommendationsParams,
) => {
  const title = toNonEmptyString(candidate.title);
  const cuisine = normalizeCookingCuisine(candidate.cuisine) ?? params.cuisine;
  const mealType = normalizeCookingMealType(candidate.mealType) ?? params.mealType ?? "dinner";
  const ingredients = uniqueStrings(toStringArray(candidate.ingredients)).slice(0, 8);
  const instructions = uniqueStrings(toStringArray(candidate.instructions)).slice(0, 5);

  if (!title || !cuisine || ingredients.length === 0 || instructions.length === 0) {
    return null;
  }

  const cookTimeMinutes = toCookTimeMinutes(candidate.cookTimeMinutes) ?? 15 + index * 5;
  const now = new Date().toISOString();
  const tags = uniqueStrings(toStringArray(candidate.tags)).slice(0, 3);

  return {
    id: buildRecommendationId({
      title,
      cuisine,
      mealType,
      ingredients,
    }),
    title,
    description: toNonEmptyString(candidate.description) ?? defaultDescription(cuisine, mealType),
    cuisine,
    mealType,
    cookTimeMinutes,
    ingredients,
    instructions,
    imageUrl: toNonEmptyString(candidate.imageUrl) ?? null,
    isRecommended: typeof candidate.isRecommended === "boolean" ? candidate.isRecommended : index < 3,
    difficulty: toNonEmptyString(candidate.difficulty) ?? (cookTimeMinutes <= 20 ? "Easy" : cookTimeMinutes <= 35 ? "Medium" : "Hard"),
    tags,
    createdAt: toTimestampString(now),
    updatedAt: toTimestampString(now),
  } satisfies CookingRecommendation;
};

const hydrateRecommendationImages = async (recommendations: CookingRecommendation[]) => {
  if (!hasUnsplashKey()) {
    return recommendations;
  }

  const hydratedRecommendations = await Promise.all(
    recommendations.map(async (recommendation) => {
      if (recommendation.imageUrl) {
        return recommendation;
      }

      const imageUrl = await fetchRecipeImage(recommendation.title);

      return {
        ...recommendation,
        imageUrl: imageUrl ?? null,
      };
    }),
  );

  return hydratedRecommendations;
};

const generateAIRecommendations = async (params: GetCookingRecommendationsParams) => {
  const prompt = buildRecommendationPrompt(params);
  const responseJson = await requestRecommendationJson(prompt);
  const payload = extractJsonPayload(responseJson);

  const recommendations = (payload.recommendations ?? [])
    .map((candidate, index) => normalizeGeneratedRecommendation(candidate, index, params))
    .filter((recommendation): recommendation is CookingRecommendation => recommendation !== null)
    .filter((recommendation, index, allRecommendations) => {
      return allRecommendations.findIndex((candidate) => candidate.id === recommendation.id) === index;
    })
    .slice(0, AI_RECOMMENDATION_COUNT);

  if (recommendations.length === 0) {
    throw new Error("AI returned no usable cooking recommendations.");
  }

  return hydrateRecommendationImages(recommendations);
};

export const formatCookTimeMinutes = (minutes: number) => `${minutes} Min`;

export const listCookingRecommendations = async ({
  mealType,
  cuisine,
}: GetCookingRecommendationsParams = {}): Promise<CookingRecommendation[]> => {
  const cachedRecommendations = getCachedRecommendations({ mealType, cuisine });

  if (cachedRecommendations) {
    return cachedRecommendations;
  }

  if (TEST_MODE) {
    const fallbackRecommendations = filterRecommendations(mockCookingRecommendations, { mealType, cuisine });
    cacheRecommendations({ mealType, cuisine }, fallbackRecommendations);
    return fallbackRecommendations;
  }

  const generatedRecommendations = filterRecommendations(
    await generateAIRecommendations({ mealType, cuisine }),
    { mealType, cuisine },
  );

  cacheRecommendations({ mealType, cuisine }, generatedRecommendations);
  return generatedRecommendations;
};

export const getCookingRecommendationById = async (id: string) => {
  const cachedRecommendation = getCachedRecommendationById(id);

  if (cachedRecommendation) {
    return cachedRecommendation;
  }

  if (TEST_MODE) {
    return mockCookingRecommendations.find((recommendation) => recommendation.id === id) ?? null;
  }

  return null;
};
