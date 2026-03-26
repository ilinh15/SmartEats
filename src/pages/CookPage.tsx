import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, X, Clock, Users, Search, Star, ChevronRight } from "lucide-react";
import avocadoToast from "@/assets/recipe-avocado-toast.jpg";
import pestoPasta from "@/assets/recipe-pesto-pasta.jpg";
import smoothieBowl from "@/assets/recipe-smoothie-bowl.jpg";
import salad from "@/assets/recipe-salad.jpg";
import chocolateCake from "@/assets/recipe-chocolate-cake.jpg";

const suggestedIngredients = [
  "Chicken", "Pasta", "Tomato", "Garlic", "Onion", "Rice", "Eggs",
  "Cheese", "Avocado", "Spinach", "Mushroom", "Lemon", "Basil", "Salmon",
];

interface Recipe {
  id: number;
  image: string;
  title: string;
  time: string;
  servings: string;
  tag: string;
  rating: number;
  difficulty: string;
  ingredients: string[];
  instructions: string[];
}

const allRecipes: Recipe[] = [
  {
    id: 1, image: pestoPasta, title: "Summer Pesto Pasta", time: "15 Min", servings: "2",
    tag: "Vegetarian 🌱", rating: 4.8, difficulty: "Easy",
    ingredients: ["Pasta", "Basil", "Garlic", "Parmesan", "Pine nuts", "Olive oil"],
    instructions: ["Cook pasta al dente", "Blend basil, garlic, pine nuts & oil", "Toss pasta with pesto", "Top with parmesan & serve"],
  },
  {
    id: 2, image: smoothieBowl, title: "Acai Smoothie Bowl", time: "10 Min", servings: "1",
    tag: "Healthy 🥗", rating: 4.9, difficulty: "Easy",
    ingredients: ["Acai powder", "Banana", "Blueberries", "Granola", "Honey"],
    instructions: ["Blend acai, banana & berries", "Pour into a bowl", "Top with granola & fruit", "Drizzle honey on top"],
  },
  {
    id: 3, image: avocadoToast, title: "Avocado Toast Deluxe", time: "8 Min", servings: "1",
    tag: "Quick ⚡", rating: 4.7, difficulty: "Easy",
    ingredients: ["Avocado", "Sourdough bread", "Eggs", "Chili flakes", "Lemon", "Salt"],
    instructions: ["Toast the sourdough bread", "Mash avocado with lemon & salt", "Spread on toast", "Top with poached egg & chili flakes"],
  },
  {
    id: 4, image: salad, title: "Greek Chicken Salad", time: "20 Min", servings: "2",
    tag: "High Protein 💪", rating: 4.6, difficulty: "Medium",
    ingredients: ["Chicken breast", "Cucumber", "Tomato", "Feta", "Olives", "Olive oil"],
    instructions: ["Grill chicken until cooked through", "Chop veggies & combine in bowl", "Slice chicken & add on top", "Dress with olive oil & lemon"],
  },
  {
    id: 5, image: chocolateCake, title: "Chocolate Lava Cake", time: "30 Min", servings: "4",
    tag: "Dessert 🍫", rating: 4.9, difficulty: "Medium",
    ingredients: ["Dark chocolate", "Butter", "Eggs", "Sugar", "Flour", "Vanilla"],
    instructions: ["Melt chocolate & butter together", "Whisk eggs & sugar until fluffy", "Fold in chocolate mixture & flour", "Bake at 200°C for 12 min"],
  },
];

const CookPage = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
    setShowResult(false);
  };

  const generate = () => {
    if (selected.length === 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowResult(true);
    }, 1500);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return allRecipes;
    const q = search.toLowerCase();
    return allRecipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tag.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="pb-20 min-h-screen" style={{ background: "var(--hero-gradient)" }}>
      <div className="px-5 pt-12">
        {/* Smart Cooking Assistant */}
        <h1 className="text-2xl font-display font-semibold text-foreground">Smart Cooking Assistant</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">Pick your ingredients, we'll do the rest ✨</p>

        {/* Selected Chips */}
        <div className="flex flex-wrap gap-2 mt-5 min-h-[32px]">
          <AnimatePresence>
            {selected.map((item) => (
              <motion.button
                key={item}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => toggle(item)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium font-body"
              >
                {item}
                <X size={12} />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* All Ingredients */}
        <div className="mt-4">
          <p className="text-xs font-body text-muted-foreground mb-2 uppercase tracking-wider font-bold">Popular Ingredients</p>
          <div className="flex flex-wrap gap-2">
            {suggestedIngredients.map((item) => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium font-body transition-all ${
                  selected.includes(item)
                    ? "bg-primary text-primary-foreground shadow-elevated"
                    : "bg-card text-foreground shadow-soft hover:shadow-card"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generate}
          disabled={selected.length === 0}
          className="w-full h-14 mt-6 bg-primary text-primary-foreground rounded-full font-semibold font-body text-base shadow-[0_4px_14px_0_rgba(255,107,74,0.39)] disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
            />
          ) : (
            <>
              <ChefHat size={20} />
              Let's Cook
            </>
          )}
        </motion.button>

        {/* Generated Result */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="mt-6 bg-card rounded-[24px] shadow-card overflow-hidden"
            >
              <div className="aspect-video overflow-hidden">
                <img src={avocadoToast} alt="Generated recipe" className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-display font-semibold text-foreground">
                  Creamy {selected[0]} & {selected[1] || "Herb"} Delight
                </h3>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-body">
                  <span className="flex items-center gap-1"><Clock size={14} /> 25 Min</span>
                  <span className="flex items-center gap-1"><Users size={14} /> 2 Servings</span>
                  <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-md font-bold uppercase tracking-wider">Healthy 🌱</span>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-display font-semibold text-foreground mb-2">Ingredients</h4>
                  <ul className="space-y-1">
                    {selected.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground font-body flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                    <li className="text-sm text-muted-foreground font-body flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Olive oil, salt, pepper
                    </li>
                  </ul>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-display font-semibold text-foreground mb-2">Instructions</h4>
                  <ol className="space-y-2">
                    <li className="text-sm text-muted-foreground font-body">1. Prep and dice all ingredients</li>
                    <li className="text-sm text-muted-foreground font-body">2. Heat olive oil in a large pan</li>
                    <li className="text-sm text-muted-foreground font-body">3. Sauté aromatics until golden</li>
                    <li className="text-sm text-muted-foreground font-body">4. Add main ingredients, cook 10 min</li>
                    <li className="text-sm text-muted-foreground font-body">5. Season and serve with fresh herbs</li>
                  </ol>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="my-8 h-px bg-border" />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food, recipes, ingredients..."
            className="w-full h-12 pl-11 pr-4 bg-card rounded-2xl shadow-soft text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-card transition-all"
          />
        </div>

        {/* Food Recommendations */}
        <div className="mt-6">
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">
            {search.trim() ? "Search Results" : "Recommended Recipes 🔥"}
          </h2>

          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground font-body text-sm">No recipes found for "{search}"</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((recipe, idx) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-card rounded-[20px] shadow-card overflow-hidden"
                >
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground text-sm leading-tight">{recipe.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-body">
                          <Clock size={11} /> {recipe.time}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-body">
                          <Users size={11} /> {recipe.servings} Servings
                        </span>
                        <span className="flex items-center gap-0.5 text-[11px] text-accent-foreground font-body font-bold">
                          <Star size={11} className="fill-accent-foreground text-accent-foreground" /> {recipe.rating}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {recipe.tag}
                        </span>
                        <span className="px-2 py-0.5 bg-accent text-accent-foreground rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {recipe.difficulty}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className={`text-muted-foreground transition-transform flex-shrink-0 ${expandedRecipe === recipe.id ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedRecipe === recipe.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-border">
                          {/* Full Image */}
                          <div className="rounded-2xl overflow-hidden mt-3 mb-4">
                            <img src={recipe.image} alt={recipe.title} className="w-full aspect-video object-cover" />
                          </div>

                          {/* Ingredients */}
                          <h4 className="text-sm font-display font-semibold text-foreground mb-2">🧾 Ingredients</h4>
                          <ul className="space-y-1 mb-4">
                            {recipe.ingredients.map((ing) => (
                              <li key={ing} className="text-sm text-muted-foreground font-body flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                {ing}
                              </li>
                            ))}
                          </ul>

                          {/* Instructions */}
                          <h4 className="text-sm font-display font-semibold text-foreground mb-2">📋 Instructions</h4>
                          <ol className="space-y-2">
                            {recipe.instructions.map((step, i) => (
                              <li key={i} className="text-sm text-muted-foreground font-body flex gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookPage;
