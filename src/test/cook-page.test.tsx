import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CookPage from "@/pages/CookPage";

const mockToast = vi.fn();
const mockGenerateRecipeWithGemini = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("@/lib/recipeGeneration", () => ({
  generateRecipeWithGemini: (...args: unknown[]) => mockGenerateRecipeWithGemini(...args),
}));

describe("CookPage clear all", () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockGenerateRecipeWithGemini.mockReset();
  });

  it("clears selected ingredients and typed input without changing search", () => {
    render(<CookPage />);

    fireEvent.click(screen.getByRole("button", { name: "Chicken" }));
    fireEvent.click(screen.getByRole("button", { name: "Pasta" }));
    fireEvent.change(screen.getByPlaceholderText(/type an ingredient and press enter/i), {
      target: { value: "Lime" },
    });
    fireEvent.change(screen.getByPlaceholderText(/search food, recipes, ingredients/i), {
      target: { value: "salad" },
    });

    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));

    expect(screen.queryByText("Chicken")).not.toBeInTheDocument();
    expect(screen.queryByText("Pasta")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type an ingredient and press enter/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/search food, recipes, ingredients/i)).toHaveValue("salad");
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();
  });

  it("hides generated result and error state when clear all is clicked", async () => {
    mockGenerateRecipeWithGemini.mockResolvedValue({
      title: "Test Curry",
      prepTime: "10 Min",
      cookTime: "20 Min",
      servings: "2",
      difficulty: "Easy",
      tag: "Comfort",
      ingredients: ["Chicken", "Curry paste"],
      instructions: ["Cook it", "Serve it"],
    });

    render(<CookPage />);

    fireEvent.click(screen.getByRole("button", { name: "Chicken" }));
    fireEvent.click(screen.getByRole("button", { name: /let's cook/i }));

    expect(await screen.findByRole("heading", { name: "Test Curry" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));

    expect(screen.queryByRole("heading", { name: "Test Curry" })).not.toBeInTheDocument();
    expect(screen.queryByText(/error generating recipe/i)).not.toBeInTheDocument();
  });
});
