import * as functions from "firebase-functions";
import cors from "cors";

interface RecipeRequest {
  ingredients: string[];
  cuisine: string;
}

interface GeneratedRecipe {
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

const corsHandler = cors({ origin: true });

// Helper to call Gemini API
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as any;
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error("No text content in Gemini response");
  }

  return textContent;
}

// Helper to call Mistral API
async function callMistralAPI(prompt: string): Promise<string> {
  const apiKey = process.env.VITE_MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_MISTRAL_API_KEY not configured");
  }

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.VITE_MISTRAL_MODEL || "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as any;
  const textContent = data?.choices?.[0]?.message?.content;

  if (!textContent) {
    throw new Error("No text content in Mistral response");
  }

  return textContent;
}

export const generateRecipe = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { ingredients, cuisine } = req.body as RecipeRequest;

      if (!Array.isArray(ingredients) || !cuisine) {
        res.status(400).json({ error: "Missing ingredients or cuisine" });
        return;
      }

      const prompt = `Generate a JSON recipe object with the following structure:
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

      let recipeJson: string;
      const hasGeminiKey = !!process.env.VITE_GEMINI_API_KEY?.trim();
      const hasMistralKey = !!process.env.VITE_MISTRAL_API_KEY?.trim();

      if (hasGeminiKey) {
        recipeJson = await callGeminiAPI(prompt);
      } else if (hasMistralKey) {
        recipeJson = await callMistralAPI(prompt);
      } else {
        throw new Error("No AI provider configured");
      }

      // Extract JSON from response (in case there's extra text)
      const jsonMatch = recipeJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const recipe = JSON.parse(jsonMatch[0]) as GeneratedRecipe;

      res.json({ recipe });
    } catch (error) {
      console.error("Error generating recipe:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: { message } });
    }
  });
});
