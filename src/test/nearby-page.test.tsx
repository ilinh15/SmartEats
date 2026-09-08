import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NearbyPage from "@/pages/NearbyPage";
import { getCurrentPosition } from "@/lib/geolocation";
import { searchPlacesByArea } from "@/lib/nearbyPlaces";

vi.mock("@/lib/geolocation", () => ({
  getCurrentPosition: vi.fn(),
}));

vi.mock("@/lib/nearbyPlaces", () => ({
  nearbyFilters: ["All", "Restaurant", "Takeaway", "Cafe", "Food Court", "Open Now"],
  searchNearbyPlaces: vi.fn(),
  searchPlacesByArea: vi.fn(),
}));

const mockedGetCurrentPosition = vi.mocked(getCurrentPosition);
const mockedSearchPlacesByArea = vi.mocked(searchPlacesByArea);

const openStreetMapPlace = {
  id: "node/42",
  name: "Kampung Cafe",
  imageUrl: null,
  photoAttributions: [],
  distanceText: "250 m",
  rating: null,
  address: "42 Jalan Kampung",
  primaryType: "Cafe",
  isOpenNow: true,
  mapsUrl: "https://www.openstreetmap.org/node/42",
};

const renderNearbyPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NearbyPage favoriteRestaurantIds={new Set<string>()} onToggleFavoriteRestaurant={vi.fn()} />
    </QueryClientProvider>,
  );
};

const submitManualArea = async () => {
  const searchInput = await screen.findByPlaceholderText("Search an area to find nearby food...");
  fireEvent.change(searchInput, { target: { value: "Kampung Baru" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
};

describe("NearbyPage OpenStreetMap results", () => {
  beforeEach(() => {
    mockedGetCurrentPosition.mockReset();
    mockedSearchPlacesByArea.mockReset();
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows OpenStreetMap attribution after a denied location request and manual area search", async () => {
    mockedSearchPlacesByArea.mockResolvedValue([openStreetMapPlace]);

    renderNearbyPage();
    await submitManualArea();

    expect(await screen.findByText("Kampung Cafe")).toBeInTheDocument();
    expect(screen.getByText("No photo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "© OpenStreetMap contributors" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    expect(screen.getByRole("link", { name: "Open in OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/node/42",
    );
    expect(screen.queryByText(/google places/i)).not.toBeInTheDocument();
  });

  it("shows a neutral provider error after a denied location request and manual area search", async () => {
    mockedSearchPlacesByArea.mockRejectedValue(new Error("The place provider is unavailable."));

    renderNearbyPage();
    await submitManualArea();

    expect(await screen.findByText("Nearby search is temporarily unavailable. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/configuration instructions/i)).not.toBeInTheDocument();
  });
});
