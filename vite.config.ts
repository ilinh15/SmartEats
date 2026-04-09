import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const geminiApiKey = env.VITE_GEMINI_API_KEY;
  const requestedGeminiModel = env.VITE_GEMINI_MODEL;
  const mistralApiKey = env.VITE_MISTRAL_API_KEY;
  const requestedMistralModel = env.VITE_MISTRAL_MODEL?.trim() || "mistral-small-latest";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: "dev-ai-recipe-api",
        configureServer(server) {
          let resolvedGeminiModelPromise: Promise<string> | undefined;

          const resolveGeminiModel = async (): Promise<string> => {
            if (requestedGeminiModel && requestedGeminiModel.trim()) {
              return requestedGeminiModel.trim();
            }

            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
            );
            const json = await resp.json().catch(() => null);

            const models: any[] = Array.isArray(json?.models) ? json.models : [];
            const supportsGenerateContent = (m: any) =>
              Array.isArray(m?.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes("generateContent");

            const candidates = models
              .filter(supportsGenerateContent)
              .map((m) => (typeof m?.name === "string" ? m.name : ""))
              .filter(Boolean);

            const preferred =
              candidates.find((n) => /models\/gemini-1\.5-flash-\d+/.test(n)) ||
              candidates.find((n) => /models\/gemini-1\.5-flash/.test(n)) ||
              candidates.find((n) => /models\/gemini-1\.5-pro-\d+/.test(n)) ||
              candidates.find((n) => /models\/gemini-1\.5-pro/.test(n)) ||
              candidates[0];

            if (!preferred) {
              throw new Error(
                "No Gemini models available for generateContent. Check your API key permissions in Google AI Studio.",
              );
            }

            return preferred.replace(/^models\//, "");
          };

          const createRecipePrompt = (ingredients: string[], cuisine: string) => {
            const cuisineText = cuisine !== "All" ? `${cuisine} cuisine` : "any cuisine";
            const ingredientsList = ingredients.join(", ");

            return `You are a professional chef. Generate a delicious recipe using these ingredients: ${ingredientsList}.
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
          };

          const createRepairPrompt = (rawText: string) => `Convert the following into a single valid JSON object with keys:
title, prepTime, cookTime, servings, difficulty, tag, ingredients (array of strings), instructions (array of strings).
Return ONLY JSON. No markdown, no explanations.

TEXT:
${rawText}`;

          const tryParseRecipe = (raw: string): { ok: true; recipe: unknown } | { ok: false } => {
            const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
            const start = cleaned.indexOf("{");
            const end = cleaned.lastIndexOf("}");
            const jsonSlice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

            try {
              return { ok: true, recipe: JSON.parse(jsonSlice) };
            } catch {
              return { ok: false };
            }
          };

          const getGeminiText = (json: any): string =>
            json?.candidates?.[0]?.content?.parts
              ?.map((part: any) => (typeof part?.text === "string" ? part.text : ""))
              .join("") ?? "";

          const getMistralText = (json: any): string => {
            const content = json?.choices?.[0]?.message?.content;

            if (typeof content === "string") {
              return content;
            }

            if (Array.isArray(content)) {
              return content
                .map((part: any) => {
                  if (typeof part === "string") {
                    return part;
                  }

                  if (typeof part?.text === "string") {
                    return part.text;
                  }

                  return "";
                })
                .join("");
            }

            return "";
          };

          const callGemini = async (textPrompt: string) => {
            if (!geminiApiKey || geminiApiKey === "your-gemini-api-key-here") {
              throw new Error("Gemini API key not configured in .env");
            }

            if (!resolvedGeminiModelPromise) {
              resolvedGeminiModelPromise = resolveGeminiModel();
            }

            const model = await resolvedGeminiModelPromise;
            const upstream = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: textPrompt }] }],
                  generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                    responseMimeType: "application/json",
                  },
                }),
              },
            );
            const upstreamJson = await upstream.json().catch(() => null);

            if (!upstream.ok) {
              const message = upstreamJson?.error?.message || upstream.statusText || "Gemini request failed";
              throw new Error(message);
            }

            return getGeminiText(upstreamJson);
          };

          const callMistral = async (textPrompt: string) => {
            if (!mistralApiKey || mistralApiKey === "your-mistral-api-key-here") {
              throw new Error("Mistral API key not configured in .env");
            }

            const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${mistralApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: requestedMistralModel,
                messages: [{ role: "user", content: textPrompt }],
                temperature: 0.7,
                max_tokens: 1000,
              }),
            });
            const upstreamJson = await upstream.json().catch(() => null);

            if (!upstream.ok) {
              const message = upstreamJson?.error?.message || upstream.statusText || "Mistral request failed";
              throw new Error(message);
            }

            return getMistralText(upstreamJson);
          };

          const generateRecipeFromProvider = async (
            provider: "gemini" | "mistral",
            prompt: string,
          ): Promise<{ provider: "gemini" | "mistral"; recipe: unknown }> => {
            const request = provider === "gemini" ? callGemini : callMistral;
            const rawText = await request(prompt);
            let parsedRecipe = tryParseRecipe(rawText);

            if (!parsedRecipe.ok) {
              const repairedText = await request(createRepairPrompt(rawText));
              parsedRecipe = tryParseRecipe(repairedText);
            }

            if (!parsedRecipe.ok) {
              throw new Error(`${provider === "gemini" ? "Gemini" : "Mistral"} returned non-JSON output.`);
            }

            return { provider, recipe: parsedRecipe.recipe };
          };

          server.middlewares.use("/api/generate-recipe", async (req, res) => {
            try {
              if (req.method !== "POST") {
                res.statusCode = 405;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: { message: "Method not allowed" } }));
                return;
              }

              if (
                (!geminiApiKey || geminiApiKey === "your-gemini-api-key-here") &&
                (!mistralApiKey || mistralApiKey === "your-mistral-api-key-here")
              ) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: {
                      message:
                        "No AI provider key configured. Add VITE_GEMINI_API_KEY or VITE_MISTRAL_API_KEY to .env",
                    },
                  }),
                );
                return;
              }

              const body = await new Promise<string>((resolve, reject) => {
                let data = "";
                req.on("data", (chunk) => {
                  data += chunk;
                });
                req.on("end", () => resolve(data));
                req.on("error", reject);
              });

              const parsed = body ? JSON.parse(body) : {};
              const ingredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
              const cuisine = typeof parsed.cuisine === "string" ? parsed.cuisine : "All";

              if (ingredients.length === 0) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: { message: "No ingredients provided" } }));
                return;
              }

              const prompt = createRecipePrompt(ingredients, cuisine);
              const providerErrors: string[] = [];
              let result: { provider: "gemini" | "mistral"; recipe: unknown } | null = null;

              try {
                result = await generateRecipeFromProvider("gemini", prompt);
              } catch (error) {
                providerErrors.push(`Gemini failed: ${error instanceof Error ? error.message : "Unknown error"}`);
              }

              if (!result) {
                try {
                  result = await generateRecipeFromProvider("mistral", prompt);
                } catch (error) {
                  providerErrors.push(`Mistral failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
              }

              if (!result) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: {
                      message: providerErrors.join(" "),
                    },
                  }),
                );
                return;
              }

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: {
                    message: e instanceof Error ? e.message : "Unknown server error",
                  },
                }),
              );
            }
          });
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
