import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NearbyPage from "@/pages/NearbyPage";
import { getCurrentPosition } from "@/lib/geolocation";
import { searchNearbyPlaces, searchPlacesByArea } from "@/lib/nearbyPlaces";

vi.mock("@/lib/geolocation", () => ({
  getCurrentPosition: vi.fn(),
}));

vi.mock("@/lib/nearbyPlaces", () => ({
  nearbyFilters: ["All", "Restaurant", "Takeaway", "Cafe", "Food Court", "Open Now"],
  searchNearbyPlaces: vi.fn(),
  searchPlacesByArea: vi.fn(),
}));

const mockedGetCurrentPosition = vi.mocked(getCurrentPosition);
const mockedSearchNearbyPlaces = vi.mocked(searchNearbyPlaces);
const mockedSearchPlacesByArea = vi.mocked(searchPlacesByArea);

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

describe("NearbyPage", () => {
  beforeEach(() => {
    mockedGetCurrentPosition.mockReset();
    mockedSearchNearbyPlaces.mockReset();
    mockedSearchPlacesByArea.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads live nearby places after geolocation succeeds", async () => {
    mockedGetCurrentPosition.mockResolvedValue({ lat: 1.2801, lng: 103.8445 });
    mockedSearchNearbyPlaces.mockResolvedValue([
      {
        id: "maxwell",
        name: "Maxwell Food Centre",
        imageUrl: "https://example.com/maxwell.jpg",
        photoAttributions: [{ displayName: "Foodie Lens", uri: "https://example.com/foodie-lens" }],
        distanceText: "0.4 km",
        rating: 4.6,
        address: "1 Kadayanallur Street, Singapore",
        primaryType: "Food Court",
        isOpenNow: true,
        mapsUrl: "https://maps.google.com/?cid=maxwell",
      },
    ]);

    renderNearbyPage();

    expect(await screen.findByText("Maxwell Food Centre")).toBeInTheDocument();
    expect(screen.queryByText("The Green Bowl")).not.toBeInTheDocument();
    expect(mockedSearchNearbyPlaces).toHaveBeenCalledWith({
      lat: 1.2801,
      lng: 103.8445,
      radius: 1800,
      filter: "All",
    });
    expect(screen.getByRole("link", { name: /open in google maps/i })).toHaveAttribute(
      "href",
      "https://maps.google.com/?cid=maxwell",
    );
    expect(screen.getByRole("button", { name: /save maxwell food centre to favorites/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Foodie Lens" })).toHaveAttribute(
      "href",
      "https://example.com/foodie-lens",
    );
  });

  it("switches to manual area mode when location access is denied", async () => {
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });

    renderNearbyPage();

    expect(await screen.findByText(/find live nearby food stalls and restaurants/i)).toBeInTheDocument();
    expect(mockedSearchNearbyPlaces).not.toHaveBeenCalled();
  });

  it("searches by area when the user submits a manual location", async () => {
    mockedGetCurrentPosition.mockRejectedValue({ code: 1, message: "User denied Geolocation" });
    mockedSearchPlacesByArea.mockResolvedValue([
      {
        id: "bugis",
        name: "Bugis Street Food Market",
        imageUrl: null,
        photoAttributions: [],
        distanceText: undefined,
        rating: 4.3,
        address: "Bugis Street, Singapore",
        primaryType: "Restaurant",
        isOpenNow: false,
        mapsUrl: "https://maps.google.com/?cid=bugis",
      },
    ]);

    renderNearbyPage();

    await screen.findByText(/find live nearby food stalls and restaurants/i);

    fireEvent.change(screen.getByPlaceholderText(/search an area to find nearby food/i), {
      target: { value: "Bugis" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Bugis Street Food Market")).toBeInTheDocument();
    expect(mockedSearchPlacesByArea).toHaveBeenCalledWith({
      textQuery: "Bugis",
      filter: "All",
      radius: 1800,
      userLocation: undefined,
    });
  });

  it("refetches nearby places when the filter changes", async () => {
    mockedGetCurrentPosition.mockResolvedValue({ lat: 1.3001, lng: 103.8511 });
    mockedSearchNearbyPlaces
      .mockResolvedValueOnce([
        {
          id: "lau-pa-sat",
          name: "Lau Pa Sat",
          imageUrl: null,
          photoAttributions: [],
          distanceText: "0.8 km",
          rating: 4.5,
          address: "18 Raffles Quay, Singapore",
          primaryType: "Food Court",
          isOpenNow: false,
          mapsUrl: "https://maps.google.com/?cid=lps",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "grab-go",
          name: "Grab & Go Express",
          imageUrl: null,
          photoAttributions: [],
          distanceText: "1.0 km",
          rating: 4.1,
          address: "Shenton Way, Singapore",
          primaryType: "Takeaway",
          isOpenNow: false,
          mapsUrl: "https://maps.google.com/?cid=grab-go",
        },
      ]);

    renderNearbyPage();

    expect(await screen.findByText("Lau Pa Sat")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Takeaway" }));

    await waitFor(() => {
      expect(mockedSearchNearbyPlaces).toHaveBeenLastCalledWith({
        lat: 1.3001,
        lng: 103.8511,
        radius: 1800,
        filter: "Takeaway",
      });
    });
    expect(await screen.findByText("Grab & Go Express")).toBeInTheDocument();
  });

  it("shows an API configuration error when Google Maps is not configured", async () => {
    mockedGetCurrentPosition.mockResolvedValue({ lat: 1.3001, lng: 103.8511 });
    mockedSearchNearbyPlaces.mockRejectedValue(new Error("Missing VITE_GOOGLE_MAPS_API_KEY."));

    renderNearbyPage();

    expect(await screen.findByText(/add vite_google_maps_api_key/i, {}, { timeout: 2500 })).toBeInTheDocument();
  });
});
