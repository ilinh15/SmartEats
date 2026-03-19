import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, X, Clock, Users } from "lucide-react";
import avocadoToast from "@/assets/recipe-avocado-toast.jpg";

const suggestedIngredients = [
  "Chicken", "Pasta", "Tomato", "Garlic", "Onion", "Rice", "Eggs",
  "Cheese", "Avocado", "Spinach", "Mushroom", "Lemon", "Basil", "Salmon",
];

const CookPage = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="pb-20 min-h-screen" style={{ background: "var(--hero-gradient)" }}>
      <div className="px-5 pt-12">
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

        {/* Result */}
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
      </div>
    </div>
  );
};

export default CookPage;
