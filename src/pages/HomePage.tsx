import HeroSection from "@/components/HeroSection";
import RecipeCard from "@/components/RecipeCard";
import RestaurantCard from "@/components/RestaurantCard";
import QuickActions from "@/components/QuickActions";

import pestoPasta from "@/assets/recipe-pesto-pasta.jpg";
import smoothieBowl from "@/assets/recipe-smoothie-bowl.jpg";
import avocadoToast from "@/assets/recipe-avocado-toast.jpg";
import salad from "@/assets/recipe-salad.jpg";
import chocolateCake from "@/assets/recipe-chocolate-cake.jpg";

const recipes = [
  { image: pestoPasta, title: "Summer Pesto Pasta", time: "15 Min", tag: "Vegetarian 🌱", tagColor: "secondary" as const },
  { image: smoothieBowl, title: "Acai Smoothie Bowl", time: "10 Min", tag: "Healthy", tagColor: "secondary" as const },
  { image: avocadoToast, title: "Avocado Toast", time: "8 Min", tag: "Quick", tagColor: "primary" as const },
  { image: salad, title: "Greek Chicken Salad", time: "20 Min", tag: "High Protein", tagColor: "primary" as const },
  { image: chocolateCake, title: "Chocolate Lava Cake", time: "30 Min", tag: "Dessert", tagColor: "primary" as const },
];

const restaurants = [
  { name: "The Green Bowl", distance: "0.8 km", rating: 4.8, image: salad, badges: ["Vegetarian", "Halal"] },
  { name: "Pasta Paradise", distance: "1.2 km", rating: 4.6, image: pestoPasta, badges: ["Italian"] },
  { name: "Morning Bloom Café", distance: "0.5 km", rating: 4.9, image: smoothieBowl, badges: ["Breakfast", "Vegan"] },
];

interface HomePageProps {
  onNavigate: (tab: string) => void;
}

const HomePage = ({ onNavigate }: HomePageProps) => {
  return (
    <div className="pb-20">
      <HeroSection />

      <div className="px-5 mt-6">
        {/* Quick Actions */}
        <QuickActions onAction={onNavigate} />

        {/* Recipe Recommendations */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold text-foreground">Recommended for You</h2>
            <button className="text-xs font-body text-primary font-medium">See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.title} {...recipe} />
            ))}
          </div>
        </div>

        {/* Nearby Restaurants */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold text-foreground">Nearby Restaurants</h2>
            <button className="text-xs font-body text-primary font-medium" onClick={() => onNavigate("nearby")}>See all</button>
          </div>
          <div className="flex flex-col gap-3">
            {restaurants.map((r) => (
              <RestaurantCard key={r.name} {...r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
