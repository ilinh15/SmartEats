import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/pages/HomePage";
import { listCookingRecommendations } from "@/lib/cookingRecommendations";
import { getCurrentPosition } from "@/lib/geolocation";
import { getMealTimeContent } from "@/lib/mealTime";

vi.mock("@/lib/geolocation", () => ({
  getCurrentPosition: vi.fn(),
}));

vi.mock("@/lib/mealTime", () => ({
  getMealTimeContent: vi.fn(),
}));

vi.mock("@/lib/cookingRecommendations", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cookingRecommendations")>("@/lib/cookingRecommendations");

  return {
    ...actual,
    listCookingRecommendations: vi.fn(),
  };
});

const mockedGetCurrentPosition = vi.mocked(getCurrentPosition);
const mockedGetMealTimeContent = vi.mocked(getMealTimeContent);
const mockedListCookingRecommendations = vi.mocked(listCookingRecommendations);

const sampleRecommendation = {
  id: "tamago-sando",
  title: "Tamago Sando",
  description: "Creamy Japanese egg salad tucked into pillowy milk bread for a soft, satisfying bite.",
  cuisine: "japanese" as const,
  mealType: "breakfast" as const,
  cookTimeMinutes: 15,
  ingredients: ["Eggs", "Japanese mayo", "Milk bread"],
  instructions: ["Boil the eggs.", "Mash with mayo.", "Assemble the sandwich."],
  imageUrl: null,
  isRecommended: true,
  difficulty: "Easy",
  tags: ["Cafe-style"],
};

const koreanBreakfastRecommendation = {
  ...sampleRecommendation,
  id: "kimchi-egg-toast",
  title: "Kimchi Egg Toast",
  cuisine: "korean" as const,
};

const sampleSupperRecommendation = {
  ...sampleRecommendation,
  id: "ochazuke-bowl",
  title: "Ochazuke Bowl",
  cuisine: "japanese" as const,
  mealType: "supper" as const,
};

const renderHomePage = () => {
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
        <HomePage
          favoriteRestaurantIds={new Set<string>()}
          favoriteRecipeIds={new Set<string>()}
          onNavigate={vi.fn()}
          onToggleFavoriteRecipe={vi.fn()}
          onToggleFavoriteRestaurant={vi.fn()}
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe("HomePage time-based recommendations", () => {
  beforeEach(() => {
    mockedGetCurrentPosition.mockReset();
    mockedGetMealTimeContent.mockReset();
    mockedListCookingRecommendations.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows breakfast cooking recommendations in the morning", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good morning",
      heroSuggestion: "Time for a bright breakfast nearby?",
      mealPeriod: "breakfast",
      mealLabel: "Breakfast",
      mealSearchQuery: "best breakfast cafes and food stalls",
    });
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
    mockedListCookingRecommendations.mockResolvedValue([sampleRecommendation]);

    renderHomePage();

    expect(await screen.findByText(/recommend to cook today/i)).toBeInTheDocument();
    expect(await screen.findByText("Tamago Sando")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedListCookingRecommendations).toHaveBeenCalledWith({
        mealType: "breakfast",
        cuisine: undefined,
      });
    });
  });

  it("filters cooking recommendations by cuisine", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good morning",
      heroSuggestion: "Time for a bright breakfast nearby?",
      mealPeriod: "breakfast",
      mealLabel: "Breakfast",
      mealSearchQuery: "best breakfast cafes and food stalls",
    });
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
    mockedListCookingRecommendations.mockImplementation(async ({ cuisine }) => {
      if (cuisine === "korean") {
        return [koreanBreakfastRecommendation];
      }

      return [sampleRecommendation];
    });

    renderHomePage();

    expect(await screen.findByText("Tamago Sando")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /korean/i }));

    expect(await screen.findByText("Kimchi Egg Toast")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedListCookingRecommendations).toHaveBeenLastCalledWith({
        mealType: "breakfast",
        cuisine: "korean",
      });
    });
  });

  it("shows a filtered empty state when a cuisine has no matches", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good afternoon",
      heroSuggestion: "Need a good lunch spot around you?",
      mealPeriod: "lunch",
      mealLabel: "Lunch",
      mealSearchQuery: "best lunch restaurants and food stalls",
    });
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
    mockedListCookingRecommendations.mockImplementation(async ({ cuisine }) => {
      if (cuisine === "western") {
        return [];
      }

      return [sampleRecommendation];
    });

    renderHomePage();

    expect(await screen.findByText("Tamago Sando")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /western/i }));

    expect(await screen.findByText(/no recipes found for this cuisine/i)).toBeInTheDocument();
    expect(screen.getByText(/try another cuisine/i)).toBeInTheDocument();
  });

  it("shows an explicit loading state while cooking recommendations are fetching", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good afternoon",
      heroSuggestion: "Need a good lunch spot around you?",
      mealPeriod: "lunch",
      mealLabel: "Lunch",
      mealSearchQuery: "best lunch restaurants and food stalls",
    });
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
    mockedListCookingRecommendations.mockImplementation(() => new Promise(() => {}));

    renderHomePage();

    expect(await screen.findByText(/loading cooking recommendations/i)).toBeInTheDocument();
  });

  it("shows a location fallback for restaurants without blocking cooking recommendations", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good afternoon",
      heroSuggestion: "Need a good lunch spot around you?",
      mealPeriod: "lunch",
      mealLabel: "Lunch",
      mealSearchQuery: "best lunch restaurants and food stalls",
    });
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
    mockedListCookingRecommendations.mockResolvedValue([sampleRecommendation]);

    renderHomePage();

    expect(await screen.findAllByText(/allow location access to load time-based nearby food picks/i)).toHaveLength(2);
    expect(await screen.findByText("Tamago Sando")).toBeInTheDocument();
  });

  it("switches to supper cooking recommendations late at night", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good evening",
      heroSuggestion: "Looking for a light supper nearby?",
      mealPeriod: "supper",
      mealLabel: "Supper",
      mealSearchQuery: "best supper food stalls and late-night cafes",
    });
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
    mockedListCookingRecommendations.mockResolvedValue([sampleSupperRecommendation]);

    renderHomePage();

    expect(await screen.findByText("Ochazuke Bowl")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedListCookingRecommendations).toHaveBeenCalledWith({
        mealType: "supper",
        cuisine: undefined,
      });
    });
  });
});
