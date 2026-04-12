import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import CookingRecommendationCard from "@/components/CookingRecommendationCard";
import { Skeleton } from "@/components/ui/skeleton";
import HeroSection from "@/components/HeroSection";
import QuickActions from "@/components/QuickActions";
import RestaurantCard from "@/components/RestaurantCard";
import type { CookingRecommendation } from "@/lib/cookingRecommendations";
import { getCurrentPosition, type GeolocationFailure } from "@/lib/geolocation";
import { getMealTimeContent } from "@/lib/mealTime";
import { searchMealRecommendations, searchNearbyPlaces, type NearbyPlace } from "@/lib/nearbyPlaces";
import { auth, db } from "@/lib/firebase";
import { listCookingRecommendations } from "@/lib/cookingRecommendations";

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
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [username, setUsername] = useState("Guest");
  const mealContent = useMemo(() => getMealTimeContent(currentTime), [currentTime]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!db) return;

    const authClient = auth || getAuth();
    const unsubscribe = onAuthStateChanged(authClient, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data()?.username || user.displayName || "Guest");
        } else {
          setUsername(user.displayName || "Guest");
        }
      } catch (error) {
        console.error("Failed to load username:", error);
        setUsername(user.displayName || "Guest");
      }
    });

    return unsubscribe;
  }, []);

  const locationQuery = useQuery({
    queryKey: ["home-current-location"],
    queryFn: getCurrentPosition,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const coordinates = locationQuery.data;

  const cuisines = ["All", "Malay", "Chinese", "Indian", "Western"] as const;
  const [selectedCuisine, setSelectedCuisine] = useState<(typeof cuisines)[number]>("All");

  const cookingRecommendationsQuery = useQuery({
    queryKey: ["home-time-cooking-recommendations", mealContent.mealPeriod],
    staleTime: 5 * 60 * 1000,
    queryFn: () => listCookingRecommendations({ mealType: mealContent.mealPeriod }),
  });

  const filteredCookingRecommendations = cookingRecommendationsQuery.data?.filter(
    (recipe) => selectedCuisine === "All" || recipe.cuisine === selectedCuisine.toLowerCase(),
  ) ?? [];

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
      <HeroSection username={username} />

      <div className="px-5 mt-6">
        <QuickActions onAction={onNavigate} />

        {/* Cooking Recommendations Section */}
        <section className="mt-8">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Recommend to cook today</h2>
            <p className="mt-1 text-sm font-body text-muted-foreground">
              Discover delicious recipes you can make at home
            </p>
          </div>

          {cookingRecommendationsQuery.isLoading && (
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

          {cookingRecommendationsQuery.isError && (
            <div className="mt-4 rounded-[24px] bg-card p-5 shadow-card">
              <p className="text-sm font-body text-foreground">Could not load cooking recommendations right now.</p>
              <p className="mt-1 text-xs font-body text-muted-foreground">
                Please try again in a moment.
              </p>
            </div>
          )}

          {cookingRecommendationsQuery.data && cookingRecommendationsQuery.data.length > 0 && (
            <>
              <div className="mt-4">
                <p className="text-xs font-body text-muted-foreground mb-2 uppercase tracking-wider font-bold">
                  Filter by cuisine
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {cuisines.map((cuisine) => (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => setSelectedCuisine(cuisine)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium font-body whitespace-nowrap transition-all ${
                        selectedCuisine === cuisine
                          ? "bg-primary text-primary-foreground shadow-elevated"
                          : "bg-card text-foreground shadow-soft hover:shadow-card"
                      }`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>
              {filteredCookingRecommendations.length === 0 ? (
                <div className="mt-4 rounded-[24px] bg-card p-5 shadow-card">
                  <p className="text-sm font-body text-muted-foreground">
                    No cooking recommendations found for {selectedCuisine} cuisine.
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
                  {filteredCookingRecommendations.slice(0, 6).map((recipe) => (
                    <CookingRecommendationCard
                      key={recipe.id}
                      recommendation={recipe}
                      isFavorited={favoriteRecipeIds.has(recipe.id)}
                      onToggleFavorite={() => onToggleFavoriteRecipe(recipe)}
                      onSelect={() => navigate(`/recipes/${recipe.id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {cookingRecommendationsQuery.data && cookingRecommendationsQuery.data.length === 0 && (
            <div className="mt-4 rounded-[24px] bg-card p-5 shadow-card">
              <p className="text-sm font-body text-muted-foreground">No cooking recommendations available right now.</p>
            </div>
          )}
        </section>

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
