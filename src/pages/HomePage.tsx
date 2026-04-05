import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CookingRecommendationSection from "@/components/CookingRecommendationSection";
import HeroSection from "@/components/HeroSection";
import QuickActions from "@/components/QuickActions";
import RestaurantCard from "@/components/RestaurantCard";
import type { CookingRecommendation } from "@/lib/cookingRecommendations";
import { getCurrentPosition, type GeolocationFailure } from "@/lib/geolocation";
import { getMealTimeContent } from "@/lib/mealTime";
import { searchMealRecommendations, searchNearbyPlaces, type NearbyPlace } from "@/lib/nearbyPlaces";

interface HomePageProps {
  onNavigate: (tab: string) => void;
  favoriteRestaurantIds: ReadonlySet<string>;
  favoriteRecipeIds: ReadonlySet<string>;
  onToggleFavoriteRestaurant: (restaurant: NearbyPlace) => void;
  onToggleFavoriteRecipe: (recipe: CookingRecommendation) => void;
}

const HomePage = ({
  onNavigate,
  favoriteRestaurantIds,
  favoriteRecipeIds,
  onToggleFavoriteRestaurant,
  onToggleFavoriteRecipe,
}: HomePageProps) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const mealContent = useMemo(() => getMealTimeContent(currentTime), [currentTime]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const locationQuery = useQuery({
    queryKey: ["home-current-location"],
    queryFn: getCurrentPosition,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const coordinates = locationQuery.data;

  const recommendedQuery = useQuery({
    queryKey: [
      "home-meal-recommendations",
      mealContent.mealPeriod,
      coordinates?.lat ?? null,
      coordinates?.lng ?? null,
    ],
    enabled: !!coordinates,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () =>
      searchMealRecommendations({
        lat: coordinates!.lat,
        lng: coordinates!.lng,
        mealPeriod: mealContent.mealPeriod,
      }),
  });

  const nearbyQuery = useQuery({
    queryKey: ["home-nearby-food", coordinates?.lat ?? null, coordinates?.lng ?? null],
    enabled: !!coordinates,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () =>
      searchNearbyPlaces({
        lat: coordinates!.lat,
        lng: coordinates!.lng,
        filter: "All",
      }),
  });

  const recommendedPlaces = (recommendedQuery.data ?? []).slice(0, 3);
  const nearbyPlaces = (nearbyQuery.data ?? []).slice(0, 3);

  const locationErrorMessage =
    locationQuery.error && (locationQuery.error as GeolocationFailure).message
      ? (locationQuery.error as GeolocationFailure).message
      : null;

  const renderLivePlaceCards = (
    places: typeof recommendedPlaces,
    isLoading: boolean,
    error: Error | null,
    emptyMessage: string,
  ) => {
    if (locationQuery.isLoading || isLoading) {
      return (
        <div className="bg-card rounded-[20px] shadow-card p-5">
          <p className="text-sm font-body text-muted-foreground">Loading live food recommendations...</p>
        </div>
      );
    }

    if (!coordinates) {
      return (
        <div className="bg-card rounded-[20px] shadow-card p-5">
          <p className="text-sm font-body text-foreground">Allow location access to load time-based nearby food picks.</p>
          {locationErrorMessage && (
            <p className="text-xs font-body text-muted-foreground mt-1">{locationErrorMessage}</p>
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-card rounded-[20px] shadow-card p-5">
          <p className="text-sm font-body text-foreground">Could not load live restaurant recommendations right now.</p>
          <p className="text-xs font-body text-muted-foreground mt-1">
            {error.message.includes("VITE_GOOGLE_MAPS_API_KEY")
              ? "Add VITE_GOOGLE_MAPS_API_KEY to enable Google Places results."
              : error.message}
          </p>
        </div>
      );
    }

    if (places.length === 0) {
      return <p className="text-sm font-body text-muted-foreground py-6">{emptyMessage}</p>;
    }

    return (
      <div className="flex flex-col gap-3">
        {places.map((place) => (
          <RestaurantCard
            key={place.id}
            address={place.address}
            badges={[place.primaryType, place.isOpenNow ? "Open Now" : null].filter(Boolean) as string[]}
            distance={place.distanceText}
            imageUrl={place.imageUrl}
            isFavorited={favoriteRestaurantIds.has(place.id)}
            mapsUrl={place.mapsUrl}
            name={place.name}
            onToggleFavorite={() => onToggleFavoriteRestaurant(place)}
            photoAttributions={place.photoAttributions}
            rating={place.rating}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="pb-20">
      <HeroSection />

      <div className="px-5 mt-6">
        <QuickActions onAction={onNavigate} />

        <CookingRecommendationSection
          mealType={mealContent.mealPeriod}
          favoriteRecipeIds={favoriteRecipeIds}
          onToggleFavoriteRecipe={onToggleFavoriteRecipe}
        />

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                Nearby {mealContent.mealLabel} Picks for You
              </h2>
              <p className="text-xs font-body text-muted-foreground mt-1">
                Live restaurant recommendations nearby
              </p>
            </div>
            <button className="text-xs font-body text-primary font-medium" onClick={() => onNavigate("nearby")}>
              See all
            </button>
          </div>
          {renderLivePlaceCards(
            recommendedPlaces,
            recommendedQuery.isLoading,
            recommendedQuery.error as Error | null,
            `No ${mealContent.mealLabel.toLowerCase()} recommendations found nearby right now.`,
          )}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">Nearby Food</h2>
              <p className="text-xs font-body text-muted-foreground mt-1">Live nearby food stalls and restaurants around you</p>
            </div>
            <button className="text-xs font-body text-primary font-medium" onClick={() => onNavigate("nearby")}>
              See all
            </button>
          </div>
          {renderLivePlaceCards(
            nearbyPlaces,
            nearbyQuery.isLoading,
            nearbyQuery.error as Error | null,
            "No nearby food spots found around your current location.",
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
