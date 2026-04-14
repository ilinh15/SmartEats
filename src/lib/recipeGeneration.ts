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
 * Generate a recipe using Gemini or Mistral API directly from the client.
 * Works both in development and production environments.
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

  const request_prompt = `Generate a JSON recipe object with the following structure:
{
  "title": "string (recipe name)",
  "prepTime": "string (e.g., '15 minutes')",
  "cookTime": "string (e.g., '30 minutes')",
  "servings": "string (e.g., '4 servings')",
  "difficulty": "Easy|Medium|Hard",
  "tag": "string (cuisine type)",
  "ingredients": ["string", "string", ...],
  "instructions": ["string", "string", ...]
}

Create a ${cuisine} recipe using these ingredients: ${ingredients.join(", ")}

Return ONLY the JSON object, no markdown, no code blocks, no explanations. Valid JSON only.`;

  try {
    // Try dev server endpoint first (only works during development)
    if (import.meta.env.DEV) {
      try {
        const devResponse = await fetch("/api/generate-recipe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ingredients,
            cuisine,
          }),
        });

        if (devResponse.ok) {
          const data = await devResponse.json();
          const recipe = data.recipe as GeneratedRecipe | undefined;
          if (recipe) {
            const imageUrl = await fetchRecipeImage(recipe.title);
            if (imageUrl) {
              recipe.imageUrl = imageUrl;
            }
            return recipe;
          }
        }
      } catch (error) {
        console.log("Dev server endpoint not available, using direct API");
      }
    }

    // Fallback to direct API calls (try Mistral first, then Gemini)
    let recipeJson: string;

    if (hasMistralKey) {
      // Use Mistral API (try first as it may be more reliable)
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
                content: request_prompt,
              },
            ],
            temperature: 0.7,
          }),
        });

        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(`Mistral API error: ${response.status} - ${responseText}`);
        }

        if (responseText.startsWith("<")) {
          throw new Error(`Mistral API returned HTML instead of JSON`);
        }

        const data = JSON.parse(responseText) as any;
        const textContent = data?.choices?.[0]?.message?.content;

        if (!textContent) {
          throw new Error("No response from Mistral API");
        }

        const trimmedText = typeof textContent === "string" ? textContent.trim() : "";
        if (trimmedText.startsWith("<")) {
          throw new Error("Mistral returned HTML content instead of JSON. Check your API credentials and endpoint.");
        }

        recipeJson = trimmedText;
      } catch (mistralError) {
        if (!hasGeminiKey) {
          throw mistralError;
        }
        // Fall through to try Gemini
        console.warn("Mistral API failed or returned invalid content, trying Gemini:", mistralError);
      }
    }

    if (!recipeJson && hasGeminiKey) {
      // Use Gemini API as fallback
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
      let geminiModel = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
      
      // Normalize model name to lowercase (API expects lowercase)
      geminiModel = geminiModel.toLowerCase().trim();

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
                    text: request_prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      const responseText = await response.text();
      const trimmedResponseText = responseText.trim();

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} - ${trimmedResponseText}`);
      }

      // Check if response is HTML (error page)
      if (trimmedResponseText.startsWith("<")) {
        throw new Error(`Gemini API returned HTML. Check your API key and model name.`);
      }

      const data = JSON.parse(trimmedResponseText) as any;
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        console.error("Gemini response:", data);
        throw new Error("No text content in Gemini response");
      }

      const trimmedText = textContent.trim();
      if (trimmedText.startsWith("<")) {
        throw new Error("Gemini returned HTML content instead of JSON. Check your API credentials and model name.");
      }

      recipeJson = trimmedText;
    }

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = recipeJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const snippet = recipeJson.slice(0, 250);
      throw new Error(`Invalid JSON in AI response: ${snippet}`);
    }

    const recipe = JSON.parse(jsonMatch[0]) as GeneratedRecipe;

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
