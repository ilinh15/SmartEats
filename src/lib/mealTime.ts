export type MealPeriod = "breakfast" | "lunch" | "dinner" | "supper";

interface MealTimeContent {
  greeting: string;
  heroSuggestion: string;
  mealPeriod: MealPeriod;
  mealLabel: string;
  mealSearchQuery: string;
}

const MEAL_COPY: Record<MealPeriod, Omit<MealTimeContent, "greeting" | "mealPeriod">> = {
  breakfast: {
    heroSuggestion: "Time for a bright breakfast nearby?",
    mealLabel: "Breakfast",
    mealSearchQuery: "best breakfast cafes and food stalls",
  },
  lunch: {
    heroSuggestion: "Need a good lunch spot around you?",
    mealLabel: "Lunch",
    mealSearchQuery: "best lunch restaurants and food stalls",
  },
  dinner: {
    heroSuggestion: "Dinner ideas are ready near you.",
    mealLabel: "Dinner",
    mealSearchQuery: "best dinner restaurants and food stalls",
  },
  supper: {
    heroSuggestion: "Looking for a light supper nearby?",
    mealLabel: "Supper",
    mealSearchQuery: "best supper food stalls and late-night cafes",
  },
};

export const getMealPeriod = (date: Date = new Date()): MealPeriod => {
  const hour = date.getHours();

  if (hour < 5) {
    return "supper";
  }

  if (hour >= 5 && hour < 11) {
    return "breakfast";
  }

  if (hour < 16) {
    return "lunch";
  }

  if (hour < 22) {
    return "dinner";
  }

  return "supper";
};

export const getMealTimeContent = (date: Date = new Date()): MealTimeContent => {
  const mealPeriod = getMealPeriod(date);
  const hour = date.getHours();
  const greeting =
    hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return {
    greeting,
    mealPeriod,
    ...MEAL_COPY[mealPeriod],
  };
};
