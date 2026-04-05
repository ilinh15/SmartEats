import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import Index from "@/pages/Index";
import { getCurrentPosition } from "@/lib/geolocation";
import { getMealTimeContent } from "@/lib/mealTime";
import { searchMealRecommendations, searchNearbyPlaces } from "@/lib/nearbyPlaces";

vi.mock("@/lib/geolocation", () => ({
  getCurrentPosition: vi.fn(),
}));

vi.mock("@/lib/mealTime", () => ({
  getMealTimeContent: vi.fn(),
}));

vi.mock("@/lib/nearbyPlaces", () => ({
  nearbyFilters: ["All", "Restaurant", "Takeaway", "Cafe", "Food Court", "Open Now"],
  searchMealRecommendations: vi.fn(),
  searchNearbyPlaces: vi.fn(),
  searchPlacesByArea: vi.fn(),
}));

const mockedGetCurrentPosition = vi.mocked(getCurrentPosition);
const mockedGetMealTimeContent = vi.mocked(getMealTimeContent);
const mockedSearchMealRecommendations = vi.mocked(searchMealRecommendations);
const mockedSearchNearbyPlaces = vi.mocked(searchNearbyPlaces);

const renderIndex = () => {
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
        <Index />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe("recipe favorites flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedGetCurrentPosition.mockReset();
    mockedGetMealTimeContent.mockReset();
    mockedSearchMealRecommendations.mockReset();
    mockedSearchNearbyPlaces.mockReset();

    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good morning",
      heroSuggestion: "Time for a bright breakfast nearby?",
      mealPeriod: "breakfast",
      mealLabel: "Breakfast",
      mealSearchQuery: "best breakfast cafes and food stalls",
    });
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
    mockedSearchMealRecommendations.mockResolvedValue([]);
    mockedSearchNearbyPlaces.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("saves a recipe from Home and shows it in the Favorites recipes tab", async () => {
    renderIndex();

    expect(await screen.findByText("Tamago Sando")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save tamago sando to favorites/i }));

    const navigation = screen.getByRole("navigation");
    fireEvent.click(within(navigation).getByRole("button", { name: /favorites/i }));

    expect(await screen.findByText("Tamago Sando")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove tamago sando from favorites/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove tamago sando from favorites/i }));

    expect(await screen.findByText(/save recipes from home to see them here/i)).toBeInTheDocument();
  });

  it("keeps saved recipes after navigating back from the detail page", async () => {
    window.history.pushState({}, "", "/");
    window.history.pushState({}, "", "/recipes/tamago-sando");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /tamago sando/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save tamago sando to favorites/i }));

    act(() => {
      window.history.back();
    });

    const navigation = await screen.findByRole("navigation");
    fireEvent.click(within(navigation).getByRole("button", { name: /favorites/i }));

    expect(await screen.findByText("Tamago Sando")).toBeInTheDocument();
  });
});
