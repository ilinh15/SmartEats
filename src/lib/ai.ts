/**
 * AI utility functions for fetching text from AI providers
 * Used by cooking recommendations and recipe generation
 */

const hasGeminiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return !!key && key.length > 0;
};

const hasMistralKey = () => {
  const key = import.meta.env.VITE_MISTRAL_API_KEY;
  return !!key && key.length > 0;
};

export const isAIProviderConfigured = (): boolean => {
  return hasGeminiKey() || hasMistralKey();
};

interface MistralResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
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

/**
 * Fetch text from an AI provider (Mistral or Gemini)
 * Tries Mistral first, then falls back to Gemini
 */
export const fetchAIText = async (prompt: string): Promise<string> => {
  if (!isAIProviderConfigured()) {
    throw new Error("No AI provider configured. Please add VITE_MISTRAL_API_KEY or VITE_GEMINI_API_KEY to your environment settings.");
  }

  // Try dev server endpoint first (only works during development)
  if (import.meta.env.DEV) {
    try {
      const devResponse = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (devResponse.ok) {
        const data = await devResponse.json();
        if (data.recipe) {
          return JSON.stringify(data.recipe);
        }
        if (data.text) {
          return data.text;
        }
      }
    } catch (error) {
      console.log("Dev server endpoint not available, using direct API");
    }
  }

  let recipeJson: string | undefined;

  // Try Mistral first
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
          temperature: 0.7,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status}`);
      }

      if (responseText.startsWith("<")) {
        throw new Error("Mistral API returned HTML instead of JSON");
      }

      const data = JSON.parse(responseText) as MistralResponse;
      const textContent = data?.choices?.[0]?.message?.content;

      if (textContent) {
        recipeJson = textContent.trim();
      }
    } catch (mistralError) {
      console.warn("Mistral API failed, trying Gemini:", mistralError);
    }
  }

  // Try Gemini as fallback
  if (!recipeJson && hasGeminiKey()) {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    let geminiModel = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
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
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText) as GeminiResponse;
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (textContent) {
      recipeJson = textContent.trim();
    }
  }

  if (!recipeJson) {
    throw new Error("Failed to get response from any AI provider");
  }

  return recipeJson;
};