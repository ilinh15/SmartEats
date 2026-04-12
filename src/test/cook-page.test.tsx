import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/lib/cookingRecommendations", () => ({
  listCookingRecommendations: vi.fn(() => Promise.resolve([])),
  COOKING_CUISINE_LABELS: {
    chinese: "Chinese",
    malay: "Malay",
    indian: "Indian",
    japanese: "Japanese",
    western: "Western",
  },
}));

const renderCookPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CookPage />
    </QueryClientProvider>,
  );
};

describe("CookPage clear all", () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockGenerateRecipeWithGemini.mockReset();
  });

  it("clears selected ingredients and typed input without changing search", async () => {
    renderCookPage();

    fireEvent.click(screen.getByRole("button", { name: "Chicken" }));
    fireEvent.click(screen.getByRole("button", { name: "Pasta" }));
    fireEvent.change(screen.getByPlaceholderText(/type an ingredient and press enter/i), {
      target: { value: "Lime" },
    });
    fireEvent.change(screen.getByPlaceholderText(/search food, recipes, ingredients/i), {
      target: { value: "salad" },
    });

    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Chicken")).toHaveLength(1);
      expect(screen.getAllByText("Pasta")).toHaveLength(1);
    });
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

    renderCookPage();

    fireEvent.click(screen.getByRole("button", { name: "Chicken" }));
    fireEvent.click(screen.getByRole("button", { name: /let's cook/i }));

    expect(await screen.findByRole("heading", { name: "Test Curry" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Test Curry" })).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/error generating recipe/i)).not.toBeInTheDocument();
  });
});
