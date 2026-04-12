import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "@/App";
import { createSavedRecipeFromGeneratedRecipe } from "@/lib/recipeFavorites";
import { seedFirestoreDocument } from "./firebaseTestUtils";

describe("recipe detail pages", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("renders stored recipe information from the legacy route id", async () => {
    window.history.pushState({}, "", "/recipes/chocolate-lava-cake");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /chocolate lava cake/i })).toBeInTheDocument();
    expect(screen.getByText(/rich dessert with a soft sponge exterior/i)).toBeInTheDocument();
    expect(screen.getByText("Dark chocolate")).toBeInTheDocument();
    expect(screen.getByText(/bake in greased ramekins at 200 c for 12 minutes/i)).toBeInTheDocument();
  });

  it("renders cooking recommendation details from the recommendation repository", async () => {
    window.history.pushState({}, "", "/recipes/tamago-sando");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /tamago sando/i })).toBeInTheDocument();
    expect(screen.getByText(/creamy japanese egg salad/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Japanese$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Breakfast$/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Japanese mayo")).toBeInTheDocument();
    expect(screen.getByText(/sandwich the egg filling between the bread/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save tamago sando to favorites/i })).toBeInTheDocument();
  });

  it("renders a saved generated recipe from the user's favorites collection", async () => {
    const savedGeneratedRecipe = createSavedRecipeFromGeneratedRecipe(
      {
        title: "Late Night Noodles",
        prepTime: "5 Min",
        cookTime: "12 Min",
        servings: "1",
        difficulty: "Easy",
        tag: "Quick",
        ingredients: ["Noodles", "Garlic", "Soy sauce"],
        instructions: ["Boil the noodles.", "Toss with garlic and soy sauce."],
        imageUrl: null,
      },
      {
        selectedIngredients: ["Noodles", "Garlic", "Soy sauce"],
        selectedCuisine: "Japanese",
      },
    );

    seedFirestoreDocument(`users/test-user/favorite_recipes/${savedGeneratedRecipe.id}`, savedGeneratedRecipe);
    window.history.pushState({}, "", `/recipes/${savedGeneratedRecipe.id}`);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /late night noodles/i })).toBeInTheDocument();
    expect(screen.getByText(/ai-generated japanese recipe/i)).toBeInTheDocument();
    expect(screen.getByText(/^Prep Time$/i)).toBeInTheDocument();
    expect(screen.getByText("12 Min")).toBeInTheDocument();
    expect(screen.getByText("Soy sauce")).toBeInTheDocument();
    expect(screen.getByText(/toss with garlic and soy sauce/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove late night noodles from favorites/i })).toBeInTheDocument();
  });

  it("shows the not found page for an invalid recipe id", async () => {
    window.history.pushState({}, "", "/recipes/not-a-real-recipe");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText(/oops! page not found/i)).toBeInTheDocument();
  });

  it("returns to the home screen when the browser goes back", async () => {
    window.history.pushState({}, "", "/");
    window.history.pushState({}, "", "/recipes/acai-smoothie-bowl");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /acai smoothie bowl/i })).toBeInTheDocument();

    act(() => {
      window.history.back();
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /recommend to cook today/i })).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/");
  });
});
