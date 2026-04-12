import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import HomePage from "@/pages/HomePage";
import CookPage from "@/pages/CookPage";
import NearbyPage from "@/pages/NearbyPage";
import FavoritesPage from "@/pages/FavoritesPage";
import ProfilePage from "@/pages/ProfilePage";
import type { NearbyPlace } from "@/lib/nearbyPlaces";
import {
  loadFavoriteRecipes,
  toSavedRecipeSnapshot,
  toggleFavoriteRecipe,
  type FavoriteRecipeInput,
  type SavedRecipe,
} from "@/lib/recipeFavorites";
import { loadFavoriteRestaurants, toggleFavoriteRestaurant } from "@/lib/restaurantFavorites";

type Tab = "home" | "cook" | "nearby" | "favorites" | "profile";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const authClient = auth || getAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<NearbyPlace[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<SavedRecipe[]>([]);
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
    let isActive = true;

    const unsubscribe = onAuthStateChanged(authClient, async (currentUser) => {
      if (!isActive) {
        return;
      }

      if (!currentUser) {
        setUser(null);
        setFavoriteRestaurants([]);
        setFavoriteRecipes([]);
        setLoading(false);
        navigate("/login");
        return;
      }

      setLoading(true);
      setUser(currentUser);

      try {
        const [loadedFavoriteRestaurants, loadedFavoriteRecipes] = await Promise.all([
          loadFavoriteRestaurants(currentUser.uid),
          loadFavoriteRecipes(currentUser.uid),
        ]);

        if (!isActive) {
          return;
        }

        setFavoriteRestaurants(loadedFavoriteRestaurants);
        setFavoriteRecipes(loadedFavoriteRecipes);
      } catch (error) {
        console.error("Failed to load user favorites:", error);

        if (!isActive) {
          return;
        }

        setFavoriteRestaurants([]);
        setFavoriteRecipes([]);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
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

  const handleToggleFavoriteRestaurant = async (restaurant: NearbyPlace) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorite restaurants.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const currentFavorites = favoriteRestaurants;
    const isAlreadyFavorite = currentFavorites.some((favorite) => favorite.id === restaurant.id);
    const nextFavorites = isAlreadyFavorite
      ? currentFavorites.filter((favorite) => favorite.id !== restaurant.id)
      : [restaurant, ...currentFavorites];

    setFavoriteRestaurants(nextFavorites);

    try {
      await toggleFavoriteRestaurant(user.uid, restaurant);
    } catch (error) {
      console.error("Failed to update restaurant favorite:", error);
      setFavoriteRestaurants(currentFavorites);
      toast({
        title: "Could not update favorite",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavoriteRecipe = async (recipe: FavoriteRecipeInput) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorite recipes.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const recipeSnapshot = toSavedRecipeSnapshot(recipe);
    const currentFavorites = favoriteRecipes;
    const isAlreadyFavorite = currentFavorites.some((favorite) => favorite.id === recipeSnapshot.id);
    const nextFavorites = isAlreadyFavorite
      ? currentFavorites.filter((favorite) => favorite.id !== recipeSnapshot.id)
      : [recipeSnapshot, ...currentFavorites];

    setFavoriteRecipes(nextFavorites);

    try {
      const savedRecipe = await toggleFavoriteRecipe(user.uid, recipeSnapshot);

      if (savedRecipe) {
        setFavoriteRecipes((currentState) => [
          savedRecipe,
          ...currentState.filter((favorite) => favorite.id !== savedRecipe.id),
        ]);
      }
    } catch (error) {
      console.error("Failed to update recipe favorite:", error);
      setFavoriteRecipes(currentFavorites);
      toast({
        title: "Could not update favorite",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
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
      {activeTab === "cook" && (
        <CookPage
          favoriteRecipeIds={favoriteRecipeIds}
          onToggleFavoriteRecipe={handleToggleFavoriteRecipe}
        />
      )}
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
