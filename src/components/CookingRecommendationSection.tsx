import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import CookingRecommendationCard from "@/components/CookingRecommendationCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  COOKING_MEAL_LABELS,
  cookingCuisineFilters,
  listCookingRecommendations,
  type CookingCuisineFilter,
  type CookingMealType,
  type CookingRecommendation,
} from "@/lib/cookingRecommendations";

interface CookingRecommendationSectionProps {
  mealType: CookingMealType;
  favoriteRecipeIds: ReadonlySet<string>;
  onToggleFavoriteRecipe: (recipe: CookingRecommendation) => void;
}

const SECTION_COPY: Record<CookingMealType, string> = {
  breakfast: "What are you craving for this morning?",
  lunch: "What are you craving for this afternoon?",
  dinner: "What are you craving for tonight?",
  supper: "What are you craving for before the day winds down?",
};

const CookingRecommendationSection = ({
  mealType,
  favoriteRecipeIds,
  onToggleFavoriteRecipe,
}: CookingRecommendationSectionProps) => {
  const [selectedCuisine, setSelectedCuisine] = useState<CookingCuisineFilter>("all");
  const navigate = useNavigate();
  const mealLabel = COOKING_MEAL_LABELS[mealType];

  const recommendationsQuery = useQuery({
    queryKey: ["home-cooking-recommendations", mealType, selectedCuisine],
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      listCookingRecommendations({
        mealType,
        cuisine: selectedCuisine === "all" ? undefined : selectedCuisine,
      }),
  });

  const recommendations = recommendationsQuery.data ?? [];
  const isFiltered = selectedCuisine !== "all";

  return (
    <section className="mt-8">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground">Recommend to cook today</h2>
        <p className="mt-1 text-sm font-body text-muted-foreground">{SECTION_COPY[mealType]}</p>
        <p className="mt-1 text-xs font-body text-muted-foreground">
          Based on the time of day, here are some AI-generated {mealLabel.toLowerCase()} recipes you may like.
        </p>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {cookingCuisineFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setSelectedCuisine(filter.value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium font-body transition-all ${
              selectedCuisine === filter.value
                ? "bg-primary text-primary-foreground shadow-elevated"
                : "bg-card text-foreground shadow-soft hover:shadow-card"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {recommendationsQuery.isLoading && (
        <div className="mt-4">
          <p className="text-sm font-body text-muted-foreground">Loading cooking recommendations...</p>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
            {[0, 1, 2].map((item) => (
              <div key={item} className="w-[260px] flex-shrink-0 rounded-[24px] bg-card p-4 shadow-card">
                <Skeleton className="aspect-[4/3] rounded-2xl" />
                <Skeleton className="mt-4 h-4 w-24" />
                <Skeleton className="mt-3 h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendationsQuery.isError && (
        <div className="mt-4 rounded-[24px] bg-card p-5 shadow-card">
          <p className="text-sm font-body text-foreground">Could not load cooking recommendations right now.</p>
          <p className="mt-1 text-xs font-body text-muted-foreground">
            Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => recommendationsQuery.refetch()}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-soft"
          >
            Try again
          </button>
        </div>
      )}

      {!recommendationsQuery.isLoading && !recommendationsQuery.isError && recommendations.length === 0 && (
        <div className="mt-4 rounded-[24px] bg-card p-5 shadow-card">
          <p className="text-sm font-body text-foreground">
            {isFiltered ? "No recipes found for this cuisine." : `No ${mealLabel.toLowerCase()} recipes found right now.`}
          </p>
          <p className="mt-1 text-xs font-body text-muted-foreground">
            {isFiltered ? "Try another cuisine." : "Check back later for a fresh set of ideas."}
          </p>
        </div>
      )}

      {!recommendationsQuery.isLoading && !recommendationsQuery.isError && recommendations.length > 0 && (
        <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
          {recommendations.map((recommendation) => (
            <CookingRecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              className="w-[260px] flex-shrink-0"
              isFavorited={favoriteRecipeIds.has(recommendation.id)}
              onSelect={() => navigate(`/recipes/${recommendation.id}`)}
              onToggleFavorite={onToggleFavoriteRecipe}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CookingRecommendationSection;
