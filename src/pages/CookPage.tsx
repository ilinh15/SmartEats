import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChefHat, ChevronRight, Clock, Search, Star, Users, X } from "lucide-react";
import avocadoToast from "@/assets/recipe-avocado-toast.jpg";
import { recipes as allRecipes } from "@/data/recipes";

const suggestedIngredients = [
  "Chicken",
  "Pasta",
  "Tomato",
  "Garlic",
  "Onion",
  "Rice",
  "Eggs",
  "Cheese",
  "Avocado",
  "Spinach",
  "Mushroom",
  "Lemon",
  "Basil",
  "Salmon",
];

const cuisines = ["All", "Chinese", "Malay", "Western", "Japanese", "Indian", "Korean"];

const CookPage = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState("All");

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((ingredient) => ingredient !== item) : [...prev, item],
    );
    setShowResult(false);
  };

  const addCustomIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
      setShowResult(false);
    }
    setIngredientInput("");
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
    let results = allRecipes;

    if (selectedCuisine !== "All") {
      results = results.filter((recipe) => recipe.cuisine === selectedCuisine);
    }

    if (!search.trim()) {
      return results;
    }

    const query = search.toLowerCase();
    return results.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.tag.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(query)),
    );
  }, [search, selectedCuisine]);

  return (
    <div className="pb-20 min-h-screen" style={{ background: "var(--hero-gradient)" }}>
      <div className="px-5 pt-12">
        <h1 className="text-2xl font-display font-semibold text-foreground">Smart Cooking Assistant</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Type or pick your ingredients, we'll do the rest
        </p>

        <div className="relative mt-4">
          <input
            type="text"
            value={ingredientInput}
            onChange={(event) => setIngredientInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addCustomIngredient()}
            placeholder="Type an ingredient and press Enter..."
            className="w-full h-12 pl-4 pr-20 bg-card rounded-2xl shadow-soft text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-card transition-all"
          />
          <button
            onClick={addCustomIngredient}
            disabled={!ingredientInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold font-body disabled:opacity-40 transition-all"
          >
            Add
          </button>
        </div>

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

        <div className="mt-4">
          <p className="text-xs font-body text-muted-foreground mb-2 uppercase tracking-wider font-bold">
            Cuisine Type
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cuisines.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium font-body whitespace-nowrap transition-all ${
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

        <div className="mt-4">
          <p className="text-xs font-body text-muted-foreground mb-2 uppercase tracking-wider font-bold">
            Popular Ingredients
          </p>
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
                  Creamy {selected[0]} and {selected[1] || "Herb"} Delight
                </h3>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-body">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> 25 Min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} /> 2 Servings
                  </span>
                  <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-md font-bold uppercase tracking-wider">
                    Healthy
                  </span>
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
                    <li className="text-sm text-muted-foreground font-body">1. Prep and dice all ingredients.</li>
                    <li className="text-sm text-muted-foreground font-body">2. Heat olive oil in a large pan.</li>
                    <li className="text-sm text-muted-foreground font-body">3. Saute aromatics until golden.</li>
                    <li className="text-sm text-muted-foreground font-body">4. Add main ingredients and cook for 10 minutes.</li>
                    <li className="text-sm text-muted-foreground font-body">5. Season and serve with fresh herbs.</li>
                  </ol>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="my-8 h-px bg-border" />

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search food, recipes, ingredients..."
            className="w-full h-12 pl-11 pr-4 bg-card rounded-2xl shadow-soft text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-card transition-all"
          />
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">
            {search.trim() ? "Search Results" : "Recommended Recipes"}
          </h2>

          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground font-body text-sm">No recipes found for "{search}"</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((recipe, index) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-[20px] shadow-card overflow-hidden"
                >
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
                      <h3 className="font-display font-semibold text-foreground text-sm leading-tight">
                        {recipe.title}
                      </h3>
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
                      className={`text-muted-foreground transition-transform flex-shrink-0 ${
                        expandedRecipe === recipe.id ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {expandedRecipe === recipe.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-border">
                          <div className="rounded-2xl overflow-hidden mt-3 mb-4">
                            <img src={recipe.image} alt={recipe.title} className="w-full aspect-video object-cover" />
                          </div>

                          <p className="text-sm text-muted-foreground font-body mb-4">{recipe.description}</p>

                          <h4 className="text-sm font-display font-semibold text-foreground mb-2">Ingredients</h4>
                          <ul className="space-y-1 mb-4">
                            {recipe.ingredients.map((ingredient) => (
                              <li
                                key={ingredient}
                                className="text-sm text-muted-foreground font-body flex items-center gap-2"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                {ingredient}
                              </li>
                            ))}
                          </ul>

                          <h4 className="text-sm font-display font-semibold text-foreground mb-2">Instructions</h4>
                          <ol className="space-y-2">
                            {recipe.instructions.map((step, stepIndex) => (
                              <li key={step} className="text-sm text-muted-foreground font-body flex gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5">
                                  {stepIndex + 1}
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
