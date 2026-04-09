import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const geminiApiKey = env.VITE_GEMINI_API_KEY;
  const requestedGeminiModel = env.VITE_GEMINI_MODEL;

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
        name: "dev-gemini-recipe-api",
        configureServer(server) {
          let resolvedModelPromise: Promise<string> | undefined;

          const resolveModel = async (): Promise<string> => {
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

          server.middlewares.use("/api/generate-recipe", async (req, res) => {
            try {
              if (req.method !== "POST") {
                res.statusCode = 405;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: { message: "Method not allowed" } }));
                return;
              }

              if (!geminiApiKey || geminiApiKey === "your-gemini-api-key-here") {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: { message: "Gemini API key not configured in .env.local" } }));
                return;
              }

              // Cache the model resolution for the lifetime of the dev server.
              if (!resolvedModelPromise) {
                resolvedModelPromise = resolveModel();
              }
              const model = await resolvedModelPromise;

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

              const callGemini = async (textPrompt: string) => {
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
                        // Ask the model to return strict JSON.
                        responseMimeType: "application/json",
                      },
                    }),
                  },
                );

                const upstreamJson = await upstream.json().catch(() => null);
                return { upstream, upstreamJson };
              };

              const { upstream, upstreamJson } = await callGemini(prompt);

              if (!upstream.ok) {
                const message =
                  upstreamJson?.error?.message || upstream.statusText || "Gemini request failed";
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: { message } }));
                return;
              }

              const getText = (json: any): string =>
                json?.candidates?.[0]?.content?.parts
                  ?.map((p: any) => (typeof p?.text === "string" ? p.text : ""))
                  .join("") ?? "";

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

              const rawText = getText(upstreamJson);
              let parsedRecipe = tryParseRecipe(rawText);

              // If the model still returned extra text, try one repair pass.
              if (!parsedRecipe.ok) {
                const repairPrompt = `Convert the following into a single valid JSON object with keys:
title, prepTime, cookTime, servings, difficulty, tag, ingredients (array of strings), instructions (array of strings).
Return ONLY JSON. No markdown, no explanations.

TEXT:
${rawText}`;

                const repaired = await callGemini(repairPrompt);
                if (!repaired.upstream.ok) {
                  const message =
                    repaired.upstreamJson?.error?.message ||
                    repaired.upstream.statusText ||
                    "Gemini repair request failed";
                  res.statusCode = 502;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: { message } }));
                  return;
                }

                const repairedText = getText(repaired.upstreamJson);
                parsedRecipe = tryParseRecipe(repairedText);
              }

              if (!parsedRecipe.ok) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: {
                      message:
                        "Gemini returned non-JSON output. Try again, or set VITE_GEMINI_MODEL in .env.local to a different model.",
                      details: rawText,
                    },
                  }),
                );
                return;
              }

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ recipe: parsedRecipe.recipe }));
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
