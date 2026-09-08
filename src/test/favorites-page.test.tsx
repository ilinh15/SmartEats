import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import FavoritesPage from "@/pages/FavoritesPage";
import type { NearbyPlace } from "@/lib/nearbyPlaces";

const restaurant = (overrides: Partial<NearbyPlace>): NearbyPlace => ({
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
  ...overrides,
});

const renderFavoritesPage = (favoriteRestaurants: NearbyPlace[]) => render(
  <MemoryRouter>
    <FavoritesPage
      favoriteRecipes={[]}
      favoriteRestaurants={favoriteRestaurants}
      onToggleFavoriteRecipe={vi.fn()}
      onToggleFavoriteRestaurant={vi.fn()}
    />
  </MemoryRouter>,
);

const openRestaurantsTab = () => {
  fireEvent.click(screen.getByRole("button", { name: /restaurants/i }));
};

describe("FavoritesPage restaurant map providers", () => {
  afterEach(() => {
    cleanup();
  });

  it("credits OpenStreetMap when saved restaurants include an OpenStreetMap result", () => {
    renderFavoritesPage([
      restaurant({}),
      restaurant({
        id: "legacy-google",
        name: "Legacy Google Cafe",
        mapsUrl: "https://maps.google.com/?cid=legacy-google",
      }),
    ]);
    openRestaurantsTab();

    expect(screen.getByRole("link", { name: "© OpenStreetMap contributors" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    expect(screen.getByRole("link", { name: "Open in OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/node/42",
    );
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute(
      "href",
      "https://maps.google.com/?cid=legacy-google",
    );
  });

  it("labels legacy and unknown map links without showing OpenStreetMap attribution", () => {
    renderFavoritesPage([
      restaurant({
        id: "legacy-google",
        name: "Legacy Google Cafe",
        mapsUrl: "https://www.google.com/maps/place/Legacy+Google+Cafe",
      }),
      restaurant({
        id: "unknown-provider",
        name: "Unknown Provider Cafe",
        mapsUrl: "https://example.com/places/unknown-provider",
      }),
    ]);
    openRestaurantsTab();

    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/place/Legacy+Google+Cafe",
    );
    expect(screen.getByRole("link", { name: "Open map" })).toHaveAttribute(
      "href",
      "https://example.com/places/unknown-provider",
    );
    expect(screen.queryByRole("link", { name: "© OpenStreetMap contributors" })).not.toBeInTheDocument();
  });
});
