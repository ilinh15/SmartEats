import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, SlidersHorizontal, Search } from "lucide-react";
import RestaurantCard from "@/components/RestaurantCard";

import salad from "@/assets/recipe-salad.jpg";
import pestoPasta from "@/assets/recipe-pesto-pasta.jpg";
import smoothieBowl from "@/assets/recipe-smoothie-bowl.jpg";
import chocolateCake from "@/assets/recipe-chocolate-cake.jpg";

const filters = ["All", "Vegetarian", "Halal", "Vegan", "Italian", "Breakfast"];

const allRestaurants = [
  { name: "The Green Bowl", distance: "0.8 km", rating: 4.8, image: salad, badges: ["Vegetarian", "Halal"] },
  { name: "Pasta Paradise", distance: "1.2 km", rating: 4.6, image: pestoPasta, badges: ["Italian"] },
  { name: "Morning Bloom Café", distance: "0.5 km", rating: 4.9, image: smoothieBowl, badges: ["Breakfast", "Vegan"] },
  { name: "Sweet Surrender", distance: "1.5 km", rating: 4.5, image: chocolateCake, badges: ["Dessert"] },
  { name: "Garden Kitchen", distance: "2.0 km", rating: 4.7, image: salad, badges: ["Vegetarian", "Vegan"] },
];

const NearbyPage = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let results = activeFilter === "All"
      ? allRestaurants
      : allRestaurants.filter((r) => r.badges.some((b) => b.toLowerCase() === activeFilter.toLowerCase()));
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((r) =>
        r.name.toLowerCase().includes(q) || r.badges.some((b) => b.toLowerCase().includes(q))
      );
    }
    return results;
  }, [activeFilter, search]);

  return (
    <div className="pb-20 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden rounded-b-[32px] px-5 pt-12 pb-6" style={{ background: "var(--hero-gradient)" }}>
        <div className="absolute top-8 right-[-20px] w-32 h-32 rounded-full bg-secondary/10 animate-float" />
        <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
          <MapPin size={24} className="text-primary" />
          Nearby Food
        </h1>
        <p className="text-sm text-muted-foreground font-body mt-1">Discover delicious spots around you</p>
      </div>

      <div className="px-5 mt-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food or restaurants..."
            className="w-full bg-card rounded-2xl pl-11 pr-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <SlidersHorizontal size={16} className="text-primary" />
          </div>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-medium font-body whitespace-nowrap transition-all ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground shadow-elevated"
                  : "bg-card text-foreground shadow-soft"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Restaurant List */}
        <div className="flex flex-col gap-3 mt-5">
          {filtered.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <RestaurantCard {...r} />
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground font-body py-12 text-sm">
              No results found for "{search || activeFilter}" 🥄
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NearbyPage;