import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import CookPage from "@/pages/CookPage";
import NearbyPage from "@/pages/NearbyPage";
import FavoritesPage from "@/pages/FavoritesPage";
import ProfilePage from "@/pages/ProfilePage";
import type { NearbyPlace } from "@/lib/nearbyPlaces";
import { loadFavoriteRestaurants, saveFavoriteRestaurants } from "@/lib/restaurantFavorites";

type Tab = "home" | "cook" | "nearby" | "favorites" | "profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<NearbyPlace[]>(() => loadFavoriteRestaurants());

  useEffect(() => {
    saveFavoriteRestaurants(favoriteRestaurants);
  }, [favoriteRestaurants]);

  const favoriteRestaurantIds = useMemo(
    () => new Set(favoriteRestaurants.map((restaurant) => restaurant.id)),
    [favoriteRestaurants],
  );

  const handleNavigate = (tab: string) => {
    const validTabs: Tab[] = ["home", "cook", "nearby", "favorites", "profile"];
    if (tab === "planner") {
      setActiveTab("favorites");
      return;
    }
    if (validTabs.includes(tab as Tab)) {
      setActiveTab(tab as Tab);
    }
  };

  const handleToggleFavoriteRestaurant = (restaurant: NearbyPlace) => {
    setFavoriteRestaurants((currentFavorites) => {
      const isAlreadyFavorite = currentFavorites.some((favorite) => favorite.id === restaurant.id);

      if (isAlreadyFavorite) {
        return currentFavorites.filter((favorite) => favorite.id !== restaurant.id);
      }

      return [restaurant, ...currentFavorites];
    });
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {activeTab === "home" && (
        <HomePage
          favoriteRestaurantIds={favoriteRestaurantIds}
          onNavigate={handleNavigate}
          onToggleFavoriteRestaurant={handleToggleFavoriteRestaurant}
        />
      )}
      {activeTab === "cook" && <CookPage />}
      {activeTab === "nearby" && (
        <NearbyPage
          favoriteRestaurantIds={favoriteRestaurantIds}
          onToggleFavoriteRestaurant={handleToggleFavoriteRestaurant}
        />
      )}
      {activeTab === "favorites" && (
        <FavoritesPage
          favoriteRestaurants={favoriteRestaurants}
          onToggleFavoriteRestaurant={handleToggleFavoriteRestaurant}
        />
      )}
      {activeTab === "profile" && <ProfilePage />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
