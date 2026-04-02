import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/pages/HomePage";
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
  searchMealRecommendations: vi.fn(),
  searchNearbyPlaces: vi.fn(),
}));

const mockedGetCurrentPosition = vi.mocked(getCurrentPosition);
const mockedGetMealTimeContent = vi.mocked(getMealTimeContent);
const mockedSearchMealRecommendations = vi.mocked(searchMealRecommendations);
const mockedSearchNearbyPlaces = vi.mocked(searchNearbyPlaces);

const sampleRecommendation = {
  id: "breakfast-corner",
  name: "Breakfast Corner",
  imageUrl: null,
  photoAttributions: [],
  distanceText: "0.6 km",
  rating: 4.5,
  address: "Serangoon Road, Singapore",
  primaryType: "Cafe",
  isOpenNow: true,
  mapsUrl: "https://maps.google.com/?cid=breakfast-corner",
};

const sampleNearby = {
  id: "maxwell-food-centre",
  name: "Maxwell Food Centre",
  imageUrl: null,
  photoAttributions: [],
  distanceText: "0.7 km",
  rating: 4.6,
  address: "Kadayanallur Street, Singapore",
  primaryType: "Food Court",
  isOpenNow: true,
  mapsUrl: "https://maps.google.com/?cid=maxwell-food-centre",
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
    <QueryClientProvider client={queryClient}>
      <HomePage
        favoriteRestaurantIds={new Set<string>()}
        onNavigate={vi.fn()}
        onToggleFavoriteRestaurant={vi.fn()}
      />
    </QueryClientProvider>,
  );
};

describe("HomePage time-based recommendations", () => {
  beforeEach(() => {
    mockedGetCurrentPosition.mockReset();
    mockedGetMealTimeContent.mockReset();
    mockedSearchMealRecommendations.mockReset();
    mockedSearchNearbyPlaces.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows breakfast picks in the morning and fetches breakfast recommendations", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good morning",
      heroSuggestion: "Time for a bright breakfast nearby?",
      mealPeriod: "breakfast",
      mealLabel: "Breakfast",
      mealSearchQuery: "best breakfast cafes and food stalls",
    });
    mockedGetCurrentPosition.mockResolvedValue({ lat: 1.30, lng: 103.85 });
    mockedSearchMealRecommendations.mockResolvedValue([sampleRecommendation]);
    mockedSearchNearbyPlaces.mockResolvedValue([sampleNearby]);

    renderHomePage();

    expect(await screen.findByText(/breakfast picks for you/i)).toBeInTheDocument();
    expect(await screen.findByText("Breakfast Corner")).toBeInTheDocument();
    expect(await screen.findByText("Maxwell Food Centre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save breakfast corner to favorites/i })).toBeInTheDocument();
    expect(mockedSearchMealRecommendations).toHaveBeenCalledWith({
      lat: 1.3,
      lng: 103.85,
      mealPeriod: "breakfast",
    });
  });

  it("switches to dinner recommendations later in the day", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good evening",
      heroSuggestion: "Dinner ideas are ready near you.",
      mealPeriod: "dinner",
      mealLabel: "Dinner",
      mealSearchQuery: "best dinner restaurants and food stalls",
    });
    mockedGetCurrentPosition.mockResolvedValue({ lat: 1.31, lng: 103.86 });
    mockedSearchMealRecommendations.mockResolvedValue([sampleRecommendation]);
    mockedSearchNearbyPlaces.mockResolvedValue([sampleNearby]);

    renderHomePage();

    expect(await screen.findByText(/dinner picks for you/i)).toBeInTheDocument();
    expect(mockedSearchMealRecommendations).toHaveBeenCalledWith({
      lat: 1.31,
      lng: 103.86,
      mealPeriod: "dinner",
    });
  });

  it("shows a location fallback message when geolocation is unavailable", async () => {
    mockedGetMealTimeContent.mockReturnValue({
      greeting: "Good afternoon",
      heroSuggestion: "Need a good lunch spot around you?",
      mealPeriod: "lunch",
      mealLabel: "Lunch",
      mealSearchQuery: "best lunch restaurants and food stalls",
    });
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });

    renderHomePage();

    expect(await screen.findAllByText(/allow location access to load time-based nearby food picks/i)).toHaveLength(2);
    expect(mockedSearchMealRecommendations).not.toHaveBeenCalled();
    expect(mockedSearchNearbyPlaces).not.toHaveBeenCalled();
  });
});
