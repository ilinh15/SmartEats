export interface GeneratedRecipe {
  title: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tag: string;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
}

/**
 * Fetch a recipe image from Unsplash API
 * Uses the recipe title to search for relevant images
 */
export async function fetchRecipeImage(recipeTitle: string): Promise<string | undefined> {
  try {
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    const headers: HeadersInit = {
      "Accept-Version": "v1",
    };

    // Add authorization header if key is provided
    if (unsplashKey && unsplashKey !== "your-unsplash-access-key") {
      headers.Authorization = `Client-ID ${unsplashKey}`;
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(recipeTitle)}&per_page=1&order_by=relevant`,
      { headers },
    );

    if (!response.ok) {
      console.warn("Unsplash API not available, using placeholder");
      return undefined;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    }

    return undefined;
  } catch (error) {
    console.warn("Failed to fetch recipe image:", error);
    return undefined;
  }
}

/**
 * Generate a recipe using the local AI route with Gemini first and Mistral fallback.
 */
export async function generateRecipeWithGemini(
  ingredients: string[],
  cuisine: string,
): Promise<GeneratedRecipe> {
  const hasGeminiKey =
    !!import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== "your-gemini-api-key-here";
  const hasMistralKey =
    !!import.meta.env.VITE_MISTRAL_API_KEY && import.meta.env.VITE_MISTRAL_API_KEY !== "your-mistral-api-key-here";

  if (!hasGeminiKey && !hasMistralKey) {
    throw new Error("No AI provider configured. Please add VITE_GEMINI_API_KEY or VITE_MISTRAL_API_KEY to .env");
  }

  try {
    // Call our dev-server API route to avoid browser CORS issues.
    const response = await fetch("/api/generate-recipe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ingredients,
        cuisine,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const recipe = data.recipe as GeneratedRecipe | undefined;
    if (!recipe) {
      throw new Error("Recipe generation response did not contain a recipe.");
    }

    // Fetch an image for the recipe
    const imageUrl = await fetchRecipeImage(recipe.title);
    if (imageUrl) {
      recipe.imageUrl = imageUrl;
    }

    return recipe;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error while generating recipe");
  }
}
