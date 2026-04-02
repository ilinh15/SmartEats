import avocadoToast from "@/assets/recipe-avocado-toast.jpg";
import chocolateCake from "@/assets/recipe-chocolate-cake.jpg";
import pestoPasta from "@/assets/recipe-pesto-pasta.jpg";
import salad from "@/assets/recipe-salad.jpg";
import smoothieBowl from "@/assets/recipe-smoothie-bowl.jpg";

export type RecipeTagColor = "primary" | "secondary";

export interface Recipe {
  id: string;
  image: string;
  title: string;
  description: string;
  time: string;
  tag: string;
  tagColor: RecipeTagColor;
  cuisine: string;
  servings: string;
  rating: number;
  difficulty: string;
  ingredients: string[];
  instructions: string[];
}

export const recipes: Recipe[] = [
  {
    id: "summer-pesto-pasta",
    image: pestoPasta,
    title: "Summer Pesto Pasta",
    description: "A bright, herbaceous pasta that comes together quickly for a fresh weeknight dinner.",
    time: "15 Min",
    tag: "Vegetarian",
    tagColor: "secondary",
    cuisine: "Western",
    servings: "2",
    rating: 4.8,
    difficulty: "Easy",
    ingredients: ["Pasta", "Basil", "Garlic", "Parmesan", "Pine nuts", "Olive oil"],
    instructions: [
      "Cook pasta until al dente and reserve a splash of the pasta water.",
      "Blend basil, garlic, pine nuts, parmesan, and olive oil into a smooth pesto.",
      "Toss the pasta with pesto until glossy and loosen with reserved pasta water if needed.",
      "Finish with extra parmesan and basil before serving.",
    ],
  },
  {
    id: "acai-smoothie-bowl",
    image: smoothieBowl,
    title: "Acai Smoothie Bowl",
    description: "A chilled breakfast bowl layered with berries, crunch, and natural sweetness.",
    time: "10 Min",
    tag: "Healthy",
    tagColor: "secondary",
    cuisine: "Breakfast",
    servings: "1",
    rating: 4.9,
    difficulty: "Easy",
    ingredients: ["Acai powder", "Banana", "Blueberries", "Granola", "Honey"],
    instructions: [
      "Blend the acai powder, banana, and blueberries until thick and creamy.",
      "Pour the smoothie base into a chilled bowl.",
      "Top with granola, fresh berries, and sliced fruit.",
      "Drizzle honey over the top and serve immediately.",
    ],
  },
  {
    id: "avocado-toast-deluxe",
    image: avocadoToast,
    title: "Avocado Toast Deluxe",
    description: "A fast, satisfying toast with creamy avocado, bright citrus, and a poached egg.",
    time: "8 Min",
    tag: "Quick",
    tagColor: "primary",
    cuisine: "Breakfast",
    servings: "1",
    rating: 4.7,
    difficulty: "Easy",
    ingredients: ["Avocado", "Sourdough bread", "Eggs", "Chili flakes", "Lemon", "Salt"],
    instructions: [
      "Toast the sourdough until golden and crisp.",
      "Mash avocado with lemon juice, salt, and a pinch of chili flakes.",
      "Spread the avocado generously over the toast.",
      "Top with a poached egg and finish with more chili flakes.",
    ],
  },
  {
    id: "greek-chicken-salad",
    image: salad,
    title: "Greek Chicken Salad",
    description: "A protein-packed salad with crisp vegetables, briny olives, and grilled chicken.",
    time: "20 Min",
    tag: "High Protein",
    tagColor: "primary",
    cuisine: "Western",
    servings: "2",
    rating: 4.6,
    difficulty: "Medium",
    ingredients: ["Chicken breast", "Cucumber", "Tomato", "Feta", "Olives", "Olive oil"],
    instructions: [
      "Season and grill the chicken until cooked through, then let it rest.",
      "Chop the cucumber, tomato, and olives and toss them in a large bowl.",
      "Slice the chicken and layer it over the vegetables with feta.",
      "Dress with olive oil, lemon, and black pepper before serving.",
    ],
  },
  {
    id: "chocolate-lava-cake",
    image: chocolateCake,
    title: "Chocolate Lava Cake",
    description: "A rich dessert with a soft sponge exterior and molten chocolate center.",
    time: "30 Min",
    tag: "Dessert",
    tagColor: "primary",
    cuisine: "Western",
    servings: "4",
    rating: 4.9,
    difficulty: "Medium",
    ingredients: ["Dark chocolate", "Butter", "Eggs", "Sugar", "Flour", "Vanilla"],
    instructions: [
      "Melt the dark chocolate and butter together until silky.",
      "Whisk eggs and sugar until pale, then fold in the chocolate mixture.",
      "Fold in flour and vanilla just until combined.",
      "Bake in greased ramekins at 200 C for 12 minutes and serve warm.",
    ],
  },
];

export const featuredRecipes = recipes;

export const getRecipeById = (recipeId: string) =>
  recipes.find((recipe) => recipe.id === recipeId);
