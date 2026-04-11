import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import CookPage from "@/pages/CookPage";
import NearbyPage from "@/pages/NearbyPage";
import FavoritesPage from "@/pages/FavoritesPage";
import ProfilePage from "@/pages/ProfilePage";
import type { CookingRecommendation } from "@/lib/cookingRecommendations";
import type { NearbyPlace } from "@/lib/nearbyPlaces";
import { loadFavoriteRecipes, saveFavoriteRecipes, toggleFavoriteRecipe } from "@/lib/recipeFavorites";
import { loadFavoriteRestaurants, saveFavoriteRestaurants } from "@/lib/restaurantFavorites";

type Tab = "home" | "cook" | "nearby" | "favorites" | "profile";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<NearbyPlace[]>(() => loadFavoriteRestaurants());
  const [favoriteRecipes, setFavoriteRecipes] = useState(() => loadFavoriteRecipes());
  const favoriteRestaurantIds = useMemo(
    () => new Set(favoriteRestaurants.map((restaurant) => restaurant.id)),
    [favoriteRestaurants],
  );
  const favoriteRecipeIds = useMemo(
    () => new Set(favoriteRecipes.map((recipe) => recipe.id)),
    [favoriteRecipes],
  );

  // Check authentication state and preference completion
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authClient, (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        navigate("/login");
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [authClient, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything (will redirect)
  if (!user) {
    return null;
  }

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

  const handleToggleFavoriteRecipe = (recipe: CookingRecommendation) => {
    setFavoriteRecipes((currentFavorites) => toggleFavoriteRecipe(currentFavorites, recipe));
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {activeTab === "home" && (
        <HomePage
          favoriteRestaurantIds={favoriteRestaurantIds}
          favoriteRecipeIds={favoriteRecipeIds}
          onNavigate={handleNavigate}
          onToggleFavoriteRestaurant={handleToggleFavoriteRestaurant}
          onToggleFavoriteRecipe={handleToggleFavoriteRecipe}
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
          favoriteRecipes={favoriteRecipes}
          favoriteRestaurants={favoriteRestaurants}
          onToggleFavoriteRecipe={handleToggleFavoriteRecipe}
          onToggleFavoriteRestaurant={handleToggleFavoriteRestaurant}
        />
      )}
      {activeTab === "profile" && <ProfilePage />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
