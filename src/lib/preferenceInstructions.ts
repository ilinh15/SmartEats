export type PreferenceRuleKey =
  | "halal"
  | "economy"
  | "vegan"
  | "vegetarian"
  | "low-carb"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "pescatarian"
  | "keto";

interface PreferenceRule {
  label: string;
  instruction: string;
}

const PREFERENCE_RULES: Record<PreferenceRuleKey, PreferenceRule> = {
  halal: {
    label: "Halal",
    instruction:
      "Halal: do not include pork, bacon, ham, lard, pork stock, pork gelatin, or any pork-derived ingredient.",
  },
  economy: {
    label: "Budget",
    instruction:
      "Economy: keep the estimated ingredient cost under RM20 per serving and prefer common affordable Malaysian ingredients.",
  },
  vegan: {
    label: "Vegan",
    instruction:
      "Vegan: do not include meat, seafood, eggs, dairy, honey, gelatin, or any animal-derived ingredient.",
  },
  vegetarian: {
    label: "Vegetarian",
    instruction:
      "Vegetarian: do not include meat, poultry, seafood, meat-based stock, or animal flesh; eggs and dairy are allowed.",
  },
  "low-carb": {
    label: "Low-carb",
    instruction:
      "Low-carb: minimize rice, noodles, bread, sugar, potatoes, and high-carb fillers.",
  },
  "gluten-free": {
    label: "Gluten-free",
    instruction:
      "Gluten-free: avoid wheat, barley, rye, regular soy sauce, flour-based noodles, bread, and breaded items.",
  },
  "dairy-free": {
    label: "Dairy-free",
    instruction:
      "Dairy-free: avoid milk, cheese, butter, cream, yogurt, ghee, and other dairy-derived ingredients.",
  },
  "nut-free": {
    label: "Nut-free",
    instruction:
      "Nut-free: avoid peanuts, tree nuts, nut oils, nut pastes, and nut-based toppings or sauces.",
  },
  pescatarian: {
    label: "Pescatarian",
    instruction:
      "Pescatarian: seafood, eggs, and dairy are allowed, but do not include meat or poultry.",
  },
  keto: {
    label: "Keto",
    instruction:
      "Keto: keep carbohydrates very low and emphasize protein, healthy fats, and low-carb vegetables.",
  },
};

const PREFERENCE_ALIASES: Record<string, PreferenceRuleKey> = {
  halal: "halal",
  economy: "economy",
  budget: "economy",
  "budget friendly": "economy",
  budgetfriendly: "economy",
  vegan: "vegan",
  vegetarian: "vegetarian",
  "low carb": "low-carb",
  lowcarb: "low-carb",
  "gluten free": "gluten-free",
  glutenfree: "gluten-free",
  "dairy free": "dairy-free",
  dairyfree: "dairy-free",
  "nut free": "nut-free",
  nutfree: "nut-free",
  pescatarian: "pescatarian",
  keto: "keto",
};

const normalizePreferenceText = (preference: string) =>
  preference
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");

export const normalizeUserPreferenceKey = (preference: string): PreferenceRuleKey | null => {
  const normalized = normalizePreferenceText(preference);
  return PREFERENCE_ALIASES[normalized] ?? PREFERENCE_ALIASES[normalized.replace(/\s+/g, "")] ?? null;
};

export const normalizeUserPreferences = (preferences?: string[]) => {
  const keys = (preferences ?? [])
    .filter((preference): preference is string => typeof preference === "string")
    .map(normalizeUserPreferenceKey)
    .filter((key): key is PreferenceRuleKey => key !== null);

  return Array.from(new Set(keys));
};

export const getPreferenceTagLabels = (preferences?: string[]) =>
  normalizeUserPreferences(preferences).map((key) => PREFERENCE_RULES[key].label);

export const buildPreferenceInstructions = (preferences?: string[]) =>
  normalizeUserPreferences(preferences).map((key) => PREFERENCE_RULES[key].instruction);

