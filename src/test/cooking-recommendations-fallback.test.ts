import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("cooking recommendation provider fallback", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.stubEnv("MODE", "development");
    vi.stubEnv("VITE_MISTRAL_API_KEY", "test-mistral-key");
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-gemini-key");
    vi.stubEnv("VITE_GEMINI_MODEL", "gemini-3.6-flash");
    vi.stubEnv("VITE_UNSPLASH_ACCESS_KEY", "your-unsplash-access-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns matching built-in recipes when every AI provider is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response('{"message":"Rate limit exceeded"}', {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }),
        )
        .mockResolvedValueOnce(
          new Response('{"error":{"message":"High demand"}}', {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
        ),
    );

    const { listCookingRecommendations } = await import("@/lib/cookingRecommendations");
    const recommendations = await listCookingRecommendations({ mealType: "supper" });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every((recipe) => recipe.mealType === "supper")).toBe(true);
  });

  it("gives Gemini enough output capacity for the full recommendation payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"message":"Rate limit exceeded"}', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        recommendations: [
                          {
                            title: "Ginger Noodles",
                            description: "A warming late-night noodle bowl.",
                            cuisine: "chinese",
                            mealType: "supper",
                            cookTimeMinutes: 20,
                            ingredients: ["Noodles", "Ginger", "Soy sauce", "Spring onion"],
                            instructions: ["Boil noodles.", "Cook aromatics.", "Toss and serve."],
                            difficulty: "Easy",
                            tags: ["Quick"],
                            isRecommended: true,
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { listCookingRecommendations } = await import("@/lib/cookingRecommendations");
    await listCookingRecommendations({ mealType: "supper" });

    const geminiRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(geminiRequest.generationConfig.maxOutputTokens).toBe(8192);
  });

  it("gives Gemini enough output capacity for a generated recipe", async () => {
    const recipe = {
      title: "Ginger Egg Rice",
      prepTime: "10 Min",
      cookTime: "15 Min",
      servings: "2",
      difficulty: "Easy",
      tag: "Quick",
      ingredients: ["Eggs", "Rice", "Ginger"],
      instructions: ["Cook rice.", "Fry the egg with ginger.", "Serve together."],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"error":{"message":"Providers unavailable"}}', { status: 502 }))
      .mockResolvedValueOnce(new Response('{"message":"Rate limit exceeded"}', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(recipe) }] } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response('{"results":[]}', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { generateRecipeWithGemini } = await import("@/lib/recipeGeneration");
    await generateRecipeWithGemini(["Eggs", "Rice"], "All");

    const geminiRequest = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(geminiRequest.generationConfig.maxOutputTokens).toBe(8192);
  });
});
