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
 * Generate a recipe using Google Gemini based on selected ingredients and cuisine
 */
export async function generateRecipeWithGemini(
  ingredients: string[],
  cuisine: string,
  apiKey: string,
): Promise<GeneratedRecipe> {
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    throw new Error("Gemini API key not configured. Please add VITE_GEMINI_API_KEY to .env.local");
  }

  const cuisineText = cuisine !== "All" ? `${cuisine} cuisine` : "any cuisine";
  const ingredientsList = ingredients.join(", ");

  const prompt = `You are a professional chef. Generate a delicious recipe using these ingredients: ${ingredientsList}.
The recipe should be ${cuisineText}.

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "title": "Recipe name",
  "prepTime": "15 Min",
  "cookTime": "25 Min",
  "servings": "2",
  "difficulty": "Easy",
  "tag": "Vegetarian",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["Step 1", "Step 2"]
}

Requirements:
- Use the provided ingredients in the recipe
- Make it realistic and tasty
- Keep instructions to 5-6 steps
- Prep time and cook time format should be "X Min"
- Difficulty should be Easy, Medium, or Hard
- Generate 1-2 additional ingredients (like oil, salt, pepper) as needed`;

  try {
    const response = await fetch(`https://gemini.googleapis.com/v1/models/gemini-1.5-mini:generate?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: {
          text: prompt,
        },
        temperature: 0.7,
        maxOutputTokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content =
      data.candidates?.[0]?.output ||
      (typeof data.candidates?.[0]?.content === "string"
        ? data.candidates[0].content
        : Array.isArray(data.candidates?.[0]?.content)
        ? data.candidates[0].content.map((block: any) => block.text || "").join("")
        : undefined);

    if (!content) {
      throw new Error("Gemini response did not contain text output.");
    }

    const jsonString = content.replace(/^```json\s*|\s*```$/g, "").trim();

    try {
      const recipe = JSON.parse(jsonString) as GeneratedRecipe;

      // Fetch an image for the recipe
      const imageUrl = await fetchRecipeImage(recipe.title);
      if (imageUrl) {
        recipe.imageUrl = imageUrl;
      }

      return recipe;
    } catch {
      throw new Error(`Failed to parse Gemini response as JSON: ${content}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error while generating recipe");
  }
}
