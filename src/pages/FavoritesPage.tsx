import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, CalendarDays, Trash2, Plus } from "lucide-react";
import RecipeCard from "@/components/RecipeCard";

import pestoPasta from "@/assets/recipe-pesto-pasta.jpg";
import smoothieBowl from "@/assets/recipe-smoothie-bowl.jpg";
import avocadoToast from "@/assets/recipe-avocado-toast.jpg";

const tabs = ["Recipes", "Restaurants", "Planner"];

const savedRecipes = [
  { image: pestoPasta, title: "Summer Pesto Pasta", time: "15 Min", tag: "Vegetarian 🌱", tagColor: "secondary" as const },
  { image: smoothieBowl, title: "Acai Smoothie Bowl", time: "10 Min", tag: "Healthy", tagColor: "secondary" as const },
  { image: avocadoToast, title: "Avocado Toast", time: "8 Min", tag: "Quick", tagColor: "primary" as const },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Meal = { id: string; name: string };
type WeekMeals = Record<string, Meal[]>;

const initialMeals: WeekMeals = {
  Mon: [
    { id: "1", name: "Oatmeal Breakfast" },
    { id: "2", name: "Grilled Chicken Lunch" },
  ],
  Tue: [{ id: "3", name: "Smoothie Bowl" }],
  Wed: [],
  Thu: [{ id: "4", name: "Pesto Pasta" }],
  Fri: [],
  Sat: [{ id: "5", name: "Avocado Toast" }],
  Sun: [],
};

const FavoritesPage = () => {
  const [activeTab, setActiveTab] = useState("Recipes");
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [weekMeals, setWeekMeals] = useState<WeekMeals>(initialMeals);
  const [isAdding, setIsAdding] = useState(false);
  const [newMealName, setNewMealName] = useState("");

  const handleDeleteMeal = (day: string, mealId: string) => {
    setWeekMeals((prev) => ({
      ...prev,
      [day]: prev[day].filter((m) => m.id !== mealId),
    }));
  };

  const handleAddMeal = () => {
    if (!newMealName.trim()) return;
    const newMeal: Meal = { id: Date.now().toString(), name: newMealName.trim() };
    setWeekMeals((prev) => ({
      ...prev,
      [selectedDay]: [...(prev[selectedDay] || []), newMeal],
    }));
    setNewMealName("");
    setIsAdding(false);
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="px-5 pt-12">
        <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
          <Heart size={24} className="text-primary" fill="currentColor" />
          Favorites & Plan
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-muted rounded-full p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-full text-xs font-medium font-body transition-all ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-5">
          {activeTab === "Recipes" && (
            <div className="grid grid-cols-2 gap-3">
              {savedRecipes.map((r, i) => (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <RecipeCard {...r} />
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "Restaurants" && (
            <div className="flex flex-col items-center py-12">
              <p className="text-muted-foreground font-body text-sm">Your saved restaurants will appear here</p>
            </div>
          )}

          {activeTab === "Planner" && (
            <div className="space-y-4">
              {/* Day selector pills */}
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

              {/* Meal list */}
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

                  {/* Add meal input */}
                  {isAdding ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <input
                        autoFocus
                        value={newMealName}
                        onChange={(e) => setNewMealName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddMeal()}
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
                        onClick={() => { setIsAdding(false); setNewMealName(""); }}
                        className="px-3 py-3 bg-muted text-muted-foreground rounded-2xl text-sm font-body"
                      >
                        ✕
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
