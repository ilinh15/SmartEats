import { beforeEach, describe, expect, it, vi } from "vitest";
import { geocodeArea } from "@/lib/openStreetMapNominatim";
import { searchOpenStreetMapPlaces } from "@/lib/openStreetMapOverpass";

vi.mock("@/lib/openStreetMapNominatim", () => ({
  geocodeArea: vi.fn().mockResolvedValue({ lat: 1.3, lng: 103.8, displayName: "Singapore" }),
}));

vi.mock("@/lib/openStreetMapOverpass", () => ({
  searchOpenStreetMapPlaces: vi.fn().mockResolvedValue([]),
}));

const mockedGeocodeArea = vi.mocked(geocodeArea);
const mockedSearchOpenStreetMapPlaces = vi.mocked(searchOpenStreetMapPlaces);

const osmPlace = (overrides: {
  id?: string;
  elementId?: number;
  lat?: number;
  lng?: number;
  tags?: Record<string, string>;
} = {}) => ({
  id: "node/42",
  elementId: 42,
  elementType: "node" as const,
  lat: 1.301,
  lng: 103.801,
  tags: {
    name: "Kopi Corner",
    amenity: "cafe",
    "addr:housenumber": "10",
    "addr:street": "Market Street",
    opening_hours: "24/7",
  },
  ...overrides,
});

const repository = () => import("@/lib/nearbyPlaces");

describe("nearby places repository", () => {
  beforeEach(() => {
    mockedGeocodeArea.mockReset();
    mockedSearchOpenStreetMapPlaces.mockReset();
    mockedGeocodeArea.mockResolvedValue({ lat: 1.3, lng: 103.8, displayName: "Singapore" });
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([]);
  });

  it("normalizes OpenStreetMap places into the existing contract", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([osmPlace()]);
    const { searchPlacesByArea } = await repository();

    await expect(searchPlacesByArea({ textQuery: "Singapore", filter: "Cafe" })).resolves.toEqual([
      expect.objectContaining({
        id: "node/42",
        name: "Kopi Corner",
        address: "10 Market Street",
        primaryType: "Cafe",
        rating: null,
        imageUrl: null,
        photoAttributions: [],
        isOpenNow: true,
        mapsUrl: "https://www.openstreetmap.org/node/42",
      }),
    ]);
  });

  it("uses brand when a place has no name", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([
      osmPlace({ tags: { amenity: "fast_food", brand: "Burger Queen" } }),
    ]);
    const { searchNearbyPlaces } = await repository();

    await expect(searchNearbyPlaces({ lat: 1.3, lng: 103.8, filter: "All" })).resolves.toEqual([
      expect.objectContaining({ name: "Burger Queen", primaryType: "Takeaway" }),
    ]);
  });

  it("uses the geocoded area label when address tags are absent", async () => {
    mockedGeocodeArea.mockResolvedValue({ lat: 1.3, lng: 103.8, displayName: "Downtown Core, Singapore" });
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([
      osmPlace({ tags: { name: "Label Cafe", amenity: "cafe" } }),
    ]);
    const { searchPlacesByArea } = await repository();

    await expect(searchPlacesByArea({ textQuery: "Downtown", filter: "Cafe" })).resolves.toEqual([
      expect.objectContaining({ address: "Downtown Core, Singapore" }),
    ]);
  });

  it("searches the geocoded area while measuring from an optional user location", async () => {
    mockedGeocodeArea.mockResolvedValue({ lat: 1.31, lng: 103.81, displayName: "Downtown Core, Singapore" });
    const { searchPlacesByArea } = await repository();

    await searchPlacesByArea({
      textQuery: "Downtown",
      filter: "All",
      radius: 900,
      userLocation: { lat: 1.3, lng: 103.8 },
    });

    expect(mockedSearchOpenStreetMapPlaces).toHaveBeenCalledWith({
      lat: 1.31,
      lng: 103.81,
      radius: 900,
      amenities: ["restaurant", "cafe", "fast_food", "food_court"],
    });
  });

  it("discards places without a name or brand", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([
      osmPlace({ id: "node/unnamed", elementId: 1, tags: { amenity: "cafe" } }),
      osmPlace({ id: "node/named", elementId: 2 }),
    ]);
    const { searchNearbyPlaces } = await repository();

    await expect(searchNearbyPlaces({ lat: 1.3, lng: 103.8, filter: "All" })).resolves.toEqual([
      expect.objectContaining({ id: "node/named", name: "Kopi Corner" }),
    ]);
  });

  it("deduplicates repeated OpenStreetMap element IDs", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([
      osmPlace(),
      osmPlace({ tags: { name: "Duplicate Kopi", amenity: "cafe" } }),
    ]);
    const { searchNearbyPlaces } = await repository();

    await expect(searchNearbyPlaces({ lat: 1.3, lng: 103.8, filter: "All" })).resolves.toEqual([
      expect.objectContaining({ id: "node/42", name: "Kopi Corner" }),
    ]);
  });

  it("ranks results by Haversine distance and formats their distances", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([
      osmPlace({ id: "node/far", elementId: 2, lat: 1.309, lng: 103.8, tags: { name: "Far Cafe", amenity: "cafe" } }),
      osmPlace({ id: "node/here", elementId: 1, lat: 1.3, lng: 103.8, tags: { name: "Here Cafe", amenity: "cafe" } }),
    ]);
    const { searchNearbyPlaces } = await repository();

    await expect(searchNearbyPlaces({ lat: 1.3, lng: 103.8, filter: "All" })).resolves.toEqual([
      expect.objectContaining({ id: "node/here", distanceText: "0 m" }),
      expect.objectContaining({ id: "node/far", distanceText: "1.0 km" }),
    ]);
  });

  it("keeps fast-food and explicitly takeaway restaurants for the takeaway filter", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([
      osmPlace({ id: "node/fast", elementId: 1, tags: { name: "Fast", amenity: "fast_food" } }),
      osmPlace({ id: "node/no", elementId: 2, tags: { name: "Dine In", amenity: "restaurant" } }),
      osmPlace({ id: "node/yes", elementId: 3, tags: { name: "Takeaway Yes", amenity: "restaurant", takeaway: "yes" } }),
      osmPlace({ id: "node/only", elementId: 4, tags: { name: "Takeaway Only", amenity: "restaurant", takeaway: "only" } }),
    ]);
    const { searchNearbyPlaces } = await repository();

    await expect(searchNearbyPlaces({ lat: 1.3, lng: 103.8, filter: "Takeaway" })).resolves.toEqual([
      expect.objectContaining({ id: "node/fast" }),
      expect.objectContaining({ id: "node/yes" }),
      expect.objectContaining({ id: "node/only" }),
    ]);
  });

  it("keeps only places known to be open for the Open Now filter", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue([
      osmPlace({ id: "node/open", elementId: 1, tags: { name: "Open", amenity: "cafe", opening_hours: "24/7" } }),
      osmPlace({ id: "node/unknown", elementId: 2, tags: { name: "Unknown", amenity: "cafe" } }),
    ]);
    const { searchNearbyPlaces } = await repository();

    await expect(searchNearbyPlaces({ lat: 1.3, lng: 103.8, filter: "Open Now" })).resolves.toEqual([
      expect.objectContaining({ id: "node/open", isOpenNow: true }),
    ]);
  });

  it("caps nearby searches at the twelve closest results", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue(
      Array.from({ length: 13 }, (_, index) =>
        osmPlace({
          id: `node/${index + 1}`,
          elementId: index + 1,
          lat: 1.301 + index * 0.001,
          tags: { name: `Cafe ${index + 1}`, amenity: "cafe" },
        }),
      ),
    );
    const { searchNearbyPlaces } = await repository();

    const places = await searchNearbyPlaces({ lat: 1.3, lng: 103.8, filter: "All" });

    expect(places).toHaveLength(12);
    expect(places.map((place) => place.id)).toEqual([
      "node/1", "node/2", "node/3", "node/4", "node/5", "node/6",
      "node/7", "node/8", "node/9", "node/10", "node/11", "node/12",
    ]);
  });

  it("caps meal recommendations at the eight closest results", async () => {
    mockedSearchOpenStreetMapPlaces.mockResolvedValue(
      Array.from({ length: 9 }, (_, index) =>
        osmPlace({
          id: `node/${index + 1}`,
          elementId: index + 1,
          lat: 1.301 + index * 0.001,
          tags: { name: `Cafe ${index + 1}`, amenity: "cafe" },
        }),
      ),
    );
    const { searchMealRecommendations } = await repository();

    const places = await searchMealRecommendations({ lat: 1.3, lng: 103.8, mealPeriod: "lunch" });

    expect(places).toHaveLength(8);
    expect(places.at(-1)).toEqual(expect.objectContaining({ id: "node/8" }));
  });

  it.each([
    ["All", ["restaurant", "cafe", "fast_food", "food_court"]],
    ["Restaurant", ["restaurant"]],
    ["Takeaway", ["fast_food", "restaurant"]],
    ["Cafe", ["cafe"]],
    ["Food Court", ["food_court"]],
    ["Open Now", ["restaurant", "cafe", "fast_food", "food_court"]],
  ] as const)("uses the expected OpenStreetMap amenities for %s", async (filter, amenities) => {
    const { searchNearbyPlaces } = await repository();

    await searchNearbyPlaces({ lat: 1.3, lng: 103.8, radius: 900, filter });

    expect(mockedSearchOpenStreetMapPlaces).toHaveBeenCalledWith({
      lat: 1.3,
      lng: 103.8,
      radius: 900,
      amenities,
    });
  });
});
