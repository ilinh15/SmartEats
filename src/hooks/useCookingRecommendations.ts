import { useQuery } from "@tanstack/react-query";
import {
  listCookingRecommendations,
  type CookingCuisineFilter,
  type CookingMealType,
} from "@/lib/cookingRecommendations";

export const useCookingRecommendations = (
  mealType: CookingMealType,
  cuisine: CookingCuisineFilter,
  userPreferences: string[] = [],
) => useQuery({
  queryKey: ["home-cooking-recommendations", mealType, cuisine, userPreferences.join("|")],
  staleTime: 5 * 60 * 1000,
  queryFn: () => listCookingRecommendations({
    mealType,
    cuisine: cuisine === "all" ? undefined : cuisine,
    ...(userPreferences.length > 0 ? { userPreferences } : {}),
  }),
});
