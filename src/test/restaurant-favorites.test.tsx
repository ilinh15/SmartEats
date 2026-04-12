import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const breakfastCorner = {
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

const nearbySpot = {
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

describe("restaurant favorites flow", () => {
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
    mockedGetCurrentPosition.mockResolvedValue({ lat: 1.30, lng: 103.85 });
    mockedSearchMealRecommendations.mockResolvedValue([breakfastCorner]);
    mockedSearchNearbyPlaces.mockResolvedValue([nearbySpot]);
  });

  afterEach(() => {
    cleanup();
  });

  it("saves a restaurant from Home and shows it in the Favorites restaurants tab", async () => {
    renderIndex();

    expect(await screen.findByText("Breakfast Corner")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save breakfast corner to favorites/i }));

    const navigation = screen.getByRole("navigation");
    fireEvent.click(within(navigation).getByRole("button", { name: /favorites/i }));

    fireEvent.click(screen.getByRole("button", { name: /restaurants \(1\)/i }));

    expect(await screen.findByText("Breakfast Corner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove breakfast corner from favorites/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove breakfast corner from favorites/i }));

    expect(await screen.findByText(/your saved restaurants will appear here/i)).toBeInTheDocument();
  });

  it("saves a restaurant from Nearby and keeps it in sync with Favorites", async () => {
    renderIndex();

    const navigation = await screen.findByRole("navigation");
    fireEvent.click(within(navigation).getByRole("button", { name: /nearby/i }));

    expect(await screen.findByText("Maxwell Food Centre")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save maxwell food centre to favorites/i }));

    fireEvent.click(within(navigation).getByRole("button", { name: /favorites/i }));
    fireEvent.click(screen.getByRole("button", { name: /restaurants \(1\)/i }));

    expect(await screen.findByText("Maxwell Food Centre")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove maxwell food centre from favorites/i }));

    expect(await screen.findByText(/your saved restaurants will appear here/i)).toBeInTheDocument();
  });
});
