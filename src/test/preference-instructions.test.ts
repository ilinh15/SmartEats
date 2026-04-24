import { describe, expect, it } from "vitest";
import { buildCookingRecommendationPrompt } from "@/lib/cookingRecommendations";
import {
  buildPreferenceInstructions,
  normalizeUserPreferences,
} from "@/lib/preferenceInstructions";
import { buildRecipeGenerationPrompt } from "@/lib/recipeGeneration";

describe("preference AI instructions", () => {
  it("turns Halal into pork-exclusion rules", () => {
    const instructions = buildPreferenceInstructions(["Halal"]).join("\n");

    expect(instructions).toContain("do not include pork");
    expect(instructions).toContain("bacon");
    expect(instructions).toContain("lard");
    expect(instructions).toContain("pork gelatin");
  });

  it("turns Economy into a RM20 per-serving budget rule", () => {
    const instructions = buildPreferenceInstructions(["Economy"]).join("\n");

    expect(instructions).toContain("under RM20 per serving");
    expect(instructions).toContain("affordable Malaysian ingredients");
  });

  it("keeps Vegan stricter than Vegetarian", () => {
    const veganInstruction = buildPreferenceInstructions(["Vegan"]).join("\n");
    const vegetarianInstruction = buildPreferenceInstructions(["Vegetarian"]).join("\n");

    expect(veganInstruction).toContain("eggs");
    expect(veganInstruction).toContain("dairy");
    expect(veganInstruction).toContain("animal-derived");
    expect(vegetarianInstruction).toContain("eggs and dairy are allowed");
    expect(vegetarianInstruction).not.toContain("animal-derived");
  });

  it("normalizes case, hyphen, and spacing variants", () => {
    expect(normalizeUserPreferences(["Low-carb", "low carb", "LOW_CARB"])).toEqual(["low-carb"]);
    expect(normalizeUserPreferences(["Gluten-Free", "gluten free", "GLUTEN_FREE"])).toEqual(["gluten-free"]);
    expect(normalizeUserPreferences(["Dairy-Free", "nut free", "Budget-friendly"])).toEqual([
      "dairy-free",
      "nut-free",
      "economy",
    ]);
  });

  it("adds selected preference rules to recommendation prompts", () => {
    const prompt = buildCookingRecommendationPrompt({
      mealType: "dinner",
      userPreferences: ["Halal", "Economy"],
    });

    expect(prompt).toContain("Selected preference rules are strict");
    expect(prompt).toContain("do not include pork");
    expect(prompt).toContain("under RM20 per serving");
    expect(prompt).toContain("Halal, Budget");
  });

  it("adds selected preference rules to ingredient recipe prompts", () => {
    const prompt = buildRecipeGenerationPrompt(["Tofu", "Spinach"], "western", {
      userPreferences: ["Vegan"],
    });

    expect(prompt).toContain("Create a western recipe using these ingredients: Tofu, Spinach");
    expect(prompt).toContain("Vegan");
    expect(prompt).toContain("do not include meat");
    expect(prompt).toContain("eggs");
    expect(prompt).toContain("animal-derived");
  });
});

