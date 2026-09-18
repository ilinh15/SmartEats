import { mockCookingRecommendations } from "@/data/cookingRecommendations";

// UI tests use explicit cached fixtures; production always generates recommendations.
export const seedCookingRecommendations = () => {
  const queries = Object.fromEntries(
    ["all", "breakfast", "lunch", "dinner", "supper"].map((mealType) => [
      `${mealType}::all::no-preferences`,
      {
        generatedAt: new Date().toISOString(),
        recommendations: mockCookingRecommendations.filter(
          (recipe) => mealType === "all" || recipe.mealType === mealType,
        ),
      },
    ]),
  );
  localStorage.setItem("smarteats.ai-cooking-recommendations.v3", JSON.stringify({
    byId: Object.fromEntries(mockCookingRecommendations.map((recipe) => [recipe.id, recipe])),
    queries,
  }));
};
