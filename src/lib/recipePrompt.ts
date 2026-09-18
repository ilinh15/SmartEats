import { buildPreferenceInstructions, getPreferenceTagLabels } from "./preferenceInstructions";

export interface GenerateRecipeOptions {
  userPreferences?: string[];
}

export const buildRecipeGenerationPrompt = (
  ingredients: string[],
  cuisine: string,
  options: GenerateRecipeOptions = {},
) => {
  const preferenceInstructions = buildPreferenceInstructions(options.userPreferences);
  const preferenceTagLabels = getPreferenceTagLabels(options.userPreferences);
  const preferenceInstruction =
    preferenceInstructions.length > 0
      ? [
          "Selected preference rules are strict and must all be satisfied together:",
          ...preferenceInstructions.map((instruction) => `- ${instruction}`),
          `Use a tag that reflects the matching preference when relevant, especially: ${preferenceTagLabels.join(", ")}.`,
        ].join("\n")
      : "No user dietary or budget preferences were provided.";
  const cuisineInstruction = cuisine.trim().length > 0 && cuisine.trim().toLowerCase() !== "all" ? `${cuisine} recipe` : "recipe";

  return `Generate a JSON recipe object with the following structure:
{
  "title": "string (recipe name)",
  "prepTime": "string (e.g., '15 minutes')",
  "cookTime": "string (e.g., '30 minutes')",
  "servings": "string (e.g., '4 servings')",
  "difficulty": "Easy|Medium|Hard",
  "tag": "string (cuisine type or matching preference tag)",
  "ingredients": ["string", "string", ...],
  "instructions": ["string", "string", ...]
}

Create a ${cuisineInstruction} using these ingredients: ${ingredients.join(", ")}
${preferenceInstruction}

Return ONLY the JSON object, no markdown, no code blocks, no explanations. Valid JSON only.`;
};

