import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CookPage from "@/pages/CookPage";
import { listCookingRecommendations } from "@/lib/cookingRecommendations";

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

vi.mock("@/lib/cookingRecommendations", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cookingRecommendations")>("@/lib/cookingRecommendations");

  return {
    ...actual,
    listCookingRecommendations: vi.fn(),
  };
});

const mockedListCookingRecommendations = vi.mocked(listCookingRecommendations);

const renderCookPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <CookPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe("CookPage clear all", () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockGenerateRecipeWithGemini.mockReset();
    mockedListCookingRecommendations.mockReset();
    mockedListCookingRecommendations.mockResolvedValue([]);
  });

  it("clears selected ingredients and typed input", async () => {
    renderCookPage();

    fireEvent.click(screen.getByRole("button", { name: "Chicken" }));
    fireEvent.click(screen.getByRole("button", { name: "Pasta" }));
    fireEvent.change(screen.getByPlaceholderText(/type an ingredient and press enter/i), {
      target: { value: "Lime" },
    });

    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Chicken")).toHaveLength(1);
      expect(screen.getAllByText("Pasta")).toHaveLength(1);
    });
    expect(screen.getByPlaceholderText(/type an ingredient and press enter/i)).toHaveValue("");
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
