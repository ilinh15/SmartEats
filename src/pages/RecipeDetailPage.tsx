import { ArrowLeft, ChefHat, Clock, Star, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getRecipeById } from "@/data/recipes";
import NotFound from "./NotFound";

const RecipeDetailPage = () => {
  const navigate = useNavigate();
  const { recipeId } = useParams<{ recipeId: string }>();
  const recipe = recipeId ? getRecipeById(recipeId) : undefined;

  if (!recipe) {
    return <NotFound />;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="pb-10">
        <div className="relative overflow-hidden rounded-b-[32px]" style={{ background: "var(--hero-gradient)" }}>
          <div className="px-5 pt-12 pb-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-body text-foreground/80 hover:text-foreground transition-colors"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div className="mt-5 rounded-[28px] overflow-hidden shadow-card">
              <img src={recipe.image} alt={recipe.title} className="w-full aspect-[4/3] object-cover" />
            </div>
          </div>
        </div>

        <div className="px-5 mt-6">
          <span
            className={`inline-flex px-3 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${
              recipe.tagColor === "secondary" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
            }`}
          >
            {recipe.tag}
          </span>

          <h1 className="text-3xl font-display font-semibold text-foreground mt-3">{recipe.title}</h1>
          <p className="text-sm font-body text-muted-foreground mt-2">{recipe.description}</p>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-card rounded-2xl p-4 shadow-soft">
              <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                <Clock size={16} className="text-primary" />
                Cook Time
              </span>
              <p className="text-lg font-display font-semibold text-foreground mt-2">{recipe.time}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-soft">
              <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                <Users size={16} className="text-primary" />
                Servings
              </span>
              <p className="text-lg font-display font-semibold text-foreground mt-2">{recipe.servings}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-soft">
              <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                <Star size={16} className="text-primary fill-primary" />
                Rating
              </span>
              <p className="text-lg font-display font-semibold text-foreground mt-2">{recipe.rating}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-soft">
              <span className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                <ChefHat size={16} className="text-primary" />
                Difficulty
              </span>
              <p className="text-lg font-display font-semibold text-foreground mt-2">{recipe.difficulty}</p>
            </div>
          </div>

          <div className="bg-card rounded-[24px] shadow-card p-5 mt-6">
            <h2 className="text-lg font-display font-semibold text-foreground">Ingredients</h2>
            <ul className="space-y-3 mt-4">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient} className="flex items-center gap-3 text-sm font-body text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card rounded-[24px] shadow-card p-5 mt-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Instructions</h2>
            <ol className="space-y-4 mt-4">
              {recipe.instructions.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm font-body text-muted-foreground">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;
