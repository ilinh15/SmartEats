import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Heart, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import CookingRecommendationCard from "@/components/CookingRecommendationCard";
import RestaurantCard from "@/components/RestaurantCard";
import type { NearbyPlace } from "@/lib/nearbyPlaces";
import { getUserMealPlanner, updateUserMealPlanner, type MealPlanner } from "@/lib/authUtils";
import type { FavoriteRecipeInput, SavedRecipe } from "@/lib/recipeFavorites";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Meal = { id: string; name: string };
type WeekMeals = Record<string, Meal[]>;

const initialMeals: WeekMeals = {
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
  Sat: [],
  Sun: [],
};

const normalizePlanner = (planner: MealPlanner): WeekMeals => ({
  Mon: planner.Mon ?? [],
  Tue: planner.Tue ?? [],
  Wed: planner.Wed ?? [],
  Thu: planner.Thu ?? [],
  Fri: planner.Fri ?? [],
  Sat: planner.Sat ?? [],
  Sun: planner.Sun ?? [],
});

interface FavoritesPageProps {
  favoriteRecipes: SavedRecipe[];
  favoriteRestaurants: NearbyPlace[];
  onToggleFavoriteRecipe: (recipe: FavoriteRecipeInput) => void;
  onToggleFavoriteRestaurant: (restaurant: NearbyPlace) => void;
  userId?: string;
}

const FavoritesPage = ({
  favoriteRecipes,
  favoriteRestaurants,
  onToggleFavoriteRecipe,
  onToggleFavoriteRestaurant,
  userId,
}: FavoritesPageProps) => {
  const [activeTab, setActiveTab] = useState("Recipes");
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [weekMeals, setWeekMeals] = useState<WeekMeals>(initialMeals);
  const [isAdding, setIsAdding] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [isLoadingPlanner, setIsLoadingPlanner] = useState(false);
  const { toast } = useToast();
  const tabs = ["Recipes", `Restaurants (${favoriteRestaurants.length})`, "Planner"];
  const navigate = useNavigate();

  const savePlanner = async (nextPlanner: WeekMeals) => {
    setWeekMeals(nextPlanner);

    if (!userId) {
      return;
    }

    try {
      await updateUserMealPlanner(userId, nextPlanner as MealPlanner);
    } catch (error) {
      console.error("Failed to save planner:", error);
      toast({
        title: "Could not save planner",
        description: "Your meal plan could not be saved right now.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMeal = (day: string, mealId: string) => {
    const nextPlanner = {
      ...weekMeals,
      [day]: weekMeals[day].filter((meal) => meal.id !== mealId),
    };

    savePlanner(nextPlanner);
  };

  const handleAddMeal = () => {
    if (!newMealName.trim()) return;
    const newMeal: Meal = { id: Date.now().toString(), name: newMealName.trim() };
    const nextPlanner = {
      ...weekMeals,
      [selectedDay]: [...(weekMeals[selectedDay] || []), newMeal],
    };

    savePlanner(nextPlanner);
    setNewMealName("");
    setIsAdding(false);
  };

  useEffect(() => {
    if (!userId) {
      setWeekMeals(initialMeals);
      return;
    }

    let isActive = true;
    setIsLoadingPlanner(true);

    getUserMealPlanner(userId)
      .then((planner) => {
        if (!isActive) {
          return;
        }
        setWeekMeals(normalizePlanner(planner));
      })
      .catch((error) => {
        console.error("Failed to load planner:", error);
        toast({
          title: "Could not load planner",
          description: "Your saved meal plan could not be loaded right now.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPlanner(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [userId, toast]);

  return (
    <div className="pb-20 min-h-screen">
      <div className="px-5 pt-12">
        <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
          <Heart size={24} className="text-primary" fill="currentColor" />
          Favorites & Plan
        </h1>

        <div className="flex gap-1 mt-5 bg-muted rounded-full p-1">
          {tabs.map((tab) => {
            const tabValue = tab.startsWith("Restaurants") ? "Restaurants" : tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tabValue)}
                className={`flex-1 py-2 rounded-full text-xs font-medium font-body transition-all ${
                  activeTab === tabValue ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {activeTab === "Recipes" && (
            favoriteRecipes.length > 0 ? (
              <div className="flex flex-col gap-3">
                {favoriteRecipes.map((recipe, index) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <CookingRecommendationCard
                      recommendation={recipe}
                      compact
                      className="w-full"
                      isFavorited
                      onSelect={() => navigate(`/recipes/${recipe.id}`)}
                      onToggleFavorite={onToggleFavoriteRecipe}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12">
                <p className="text-muted-foreground font-body text-sm">Save recipes from Home or Cook to see them here</p>
              </div>
            )
          )}

          {activeTab === "Restaurants" && (
            favoriteRestaurants.length > 0 ? (
              <div className="flex flex-col gap-3">
                {favoriteRestaurants.map((restaurant, index) => (
                  <motion.div
                    key={restaurant.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <RestaurantCard
                      address={restaurant.address}
                      badges={[restaurant.primaryType, restaurant.isOpenNow ? "Open Now" : null].filter(Boolean) as string[]}
                      distance={restaurant.distanceText}
                      imageUrl={restaurant.imageUrl}
                      isFavorited
                      mapsUrl={restaurant.mapsUrl}
                      name={restaurant.name}
                      onToggleFavorite={() => onToggleFavoriteRestaurant(restaurant)}
                      photoAttributions={restaurant.photoAttributions}
                      rating={restaurant.rating}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12">
                <p className="text-muted-foreground font-body text-sm">Your saved restaurants will appear here</p>
              </div>
            )
          )}

          {activeTab === "Planner" && (
            <div className="space-y-4">
              {isLoadingPlanner ? (
                <p className="text-sm text-muted-foreground">Loading planner...</p>
              ) : null}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-full text-sm font-body font-medium transition-all flex-shrink-0 ${
                      selectedDay === day
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {(weekMeals[selectedDay] || []).map((meal) => (
                    <motion.div
                      key={meal.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 bg-card rounded-2xl p-4 shadow-soft"
                    >
                      <CalendarDays size={18} className="text-primary flex-shrink-0" />
                      <span className="flex-1 text-sm font-body text-foreground">{meal.name}</span>
                      <button
                        onClick={() => handleDeleteMeal(selectedDay, meal.id)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}

                  {(weekMeals[selectedDay] || []).length === 0 && !isAdding && (
                    <p className="text-center text-muted-foreground text-sm font-body py-6">
                      No meals planned for {selectedDay}
                    </p>
                  )}

                  {isAdding ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <input
                        autoFocus
                        value={newMealName}
                        onChange={(event) => setNewMealName(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && handleAddMeal()}
                        placeholder="Enter meal name..."
                        className="flex-1 bg-card border border-border rounded-2xl px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={handleAddMeal}
                        className="px-4 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-body font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setNewMealName("");
                        }}
                        className="px-3 py-3 bg-muted text-muted-foreground rounded-2xl text-sm font-body"
                      >
                        X
                      </button>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setIsAdding(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm font-body hover:border-primary hover:text-primary transition-colors"
                    >
                      <Plus size={16} />
                      Add Meal
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
