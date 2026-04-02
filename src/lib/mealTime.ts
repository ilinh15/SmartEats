export type MealPeriod = "breakfast" | "lunch" | "dinner";

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
};

export const getMealPeriod = (date: Date = new Date()): MealPeriod => {
  const hour = date.getHours();

  if (hour < 11) {
    return "breakfast";
  }

  if (hour < 17) {
    return "lunch";
  }

  return "dinner";
};

export const getMealTimeContent = (date: Date = new Date()): MealTimeContent => {
  const mealPeriod = getMealPeriod(date);
  const greeting = date.getHours() < 12 ? "Good morning" : date.getHours() < 17 ? "Good afternoon" : "Good evening";

  return {
    greeting,
    mealPeriod,
    ...MEAL_COPY[mealPeriod],
  };
};
