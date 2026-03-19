import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, CalendarDays } from "lucide-react";
import RecipeCard from "@/components/RecipeCard";

import pestoPasta from "@/assets/recipe-pesto-pasta.jpg";
import smoothieBowl from "@/assets/recipe-smoothie-bowl.jpg";
import avocadoToast from "@/assets/recipe-avocado-toast.jpg";
import salad from "@/assets/recipe-salad.jpg";

const tabs = ["Recipes", "Restaurants", "Meal Plan"];

const savedRecipes = [
  { image: pestoPasta, title: "Summer Pesto Pasta", time: "15 Min", tag: "Vegetarian 🌱", tagColor: "secondary" as const },
  { image: smoothieBowl, title: "Acai Smoothie Bowl", time: "10 Min", tag: "Healthy", tagColor: "secondary" as const },
  { image: avocadoToast, title: "Avocado Toast", time: "8 Min", tag: "Quick", tagColor: "primary" as const },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const mealPlan: Record<string, { meal: string; image: string }> = {
  Mon: { meal: "Pesto Pasta", image: pestoPasta },
  Tue: { meal: "Smoothie Bowl", image: smoothieBowl },
  Wed: { meal: "Avocado Toast", image: avocadoToast },
  Thu: { meal: "Greek Salad", image: salad },
  Fri: { meal: "Pesto Pasta", image: pestoPasta },
  Sat: { meal: "Smoothie Bowl", image: smoothieBowl },
  Sun: { meal: "Avocado Toast", image: avocadoToast },
};

const FavoritesPage = () => {
  const [activeTab, setActiveTab] = useState("Recipes");

  return (
    <div className="pb-20 min-h-screen">
      <div className="px-5 pt-12">
        <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
          <Heart size={24} className="text-primary" fill="currentColor" />
          Favorites & Plans
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

          {activeTab === "Meal Plan" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={16} className="text-primary" />
                <span className="text-sm font-body font-medium text-foreground">This Week</span>
              </div>
              {days.map((day, i) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-soft"
                >
                  <span className="w-10 text-xs font-bold font-body text-primary uppercase">{day}</span>
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={mealPlan[day].image} alt={mealPlan[day].meal} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-body text-foreground">{mealPlan[day].meal}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
