import type { Coordinates } from "@/lib/geolocation";
import type { MealPeriod } from "@/lib/mealTime";
import { geocodeArea, searchNearbyFoodByCoordinates, type OpenStreetMapSearchResult } from "@/lib/openStreetMap";

export type NearbyFilter = "All" | "Restaurant" | "Takeaway" | "Cafe" | "Food Court" | "Open Now";

export interface NearbyPlace {
  id: string;
  name: string;
  imageUrl: string | null;
  photoAttributions: Array<{ displayName: string; uri?: string }>;
  distanceText?: string;
  rating: number | null;
  address: string;
  primaryType?: string;
  isOpenNow?: boolean;
  mapsUrl?: string;
}

export const nearbyFilters: NearbyFilter[] = [
  "All",
  "Restaurant",
  "Takeaway",
  "Cafe",
  "Food Court",
  "Open Now",
];

interface NearbySearchParams {
  lat: number;
  lng: number;
  radius?: number;
  filter: NearbyFilter;
}

interface AreaSearchParams {
  textQuery: string;
  filter: NearbyFilter;
  userLocation?: Coordinates;
  radius?: number;
}

interface MealRecommendationSearchParams {
  lat: number;
  lng: number;
  mealPeriod: MealPeriod;
  radius?: number;
}

const DEFAULT_RADIUS_METERS = 1800;
const PLACE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "googleMapsURI",
  "location",
  "photos",
  "primaryType",
  "primaryTypeDisplayName",
  "rating",
];

const FILTER_TYPE_MAP: Record<Exclude<NearbyFilter, "All" | "Open Now">, string> = {
  Restaurant: "restaurant",
  Takeaway: "meal_takeaway",
  Cafe: "cafe",
  "Food Court": "food_court",
};

const ALL_FOOD_TYPES = ["restaurant", "meal_takeaway", "cafe", "food_court"];
const MEAL_QUERY_MAP: Record<MealPeriod, string> = {
  breakfast: "best breakfast cafes and food stalls",
  lunch: "best lunch restaurants and food stalls",
  dinner: "best dinner restaurants and food stalls",
  supper: "best supper food stalls and late-night cafes",
};

const dedupePlaces = (places: NearbyPlace[]) => {
  const seen = new Set<string>();

  return places.filter((place) => {
    if (seen.has(place.id)) {
      return false;
    }

    seen.add(place.id);
    return true;
  });
};

const getPhotoData = (place: OpenStreetMapSearchResult) => ({
  imageUrl: place.imageUrl ?? null,
  photoAttributions: place.photoAttributions ?? [],
});

const getLatLng = (place: OpenStreetMapSearchResult) => ({
  lat: place.lat,
  lng: place.lng,
});

const formatDistance = (meters: number) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const calculateDistanceMeters = (from: Coordinates, to: Coordinates) => {
  const earthRadius = 6_371_000;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(fromLat) * Math.cos(toLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const normalizePlace = (place: OpenStreetMapSearchResult, userLocation?: Coordinates, isOpenNow?: boolean): NearbyPlace => {
  const photoData = getPhotoData(place);
  const placeCoordinates = getLatLng(place);

  return {
    id: place.id,
    name: place.name,
    imageUrl: photoData.imageUrl,
    photoAttributions: photoData.photoAttributions,
    distanceText:
      userLocation && placeCoordinates
        ? formatDistance(calculateDistanceMeters(userLocation, placeCoordinates))
        : undefined,
    rating: null,
    address: place.address,
    primaryType: place.primaryType,
    isOpenNow,
    mapsUrl: place.mapsUrl,
  };
};

const buildManualTextQuery = (textQuery: string, filter: NearbyFilter) => {
  switch (filter) {
    case "Restaurant":
      return `restaurants near ${textQuery}`;
    case "Takeaway":
      return `takeaway food near ${textQuery}`;
    case "Cafe":
      return `cafes near ${textQuery}`;
    case "Food Court":
      return `food courts near ${textQuery}`;
    case "Open Now":
      return `food stalls and restaurants near ${textQuery}`;
    case "All":
    default:
      return `food stalls and restaurants near ${textQuery}`;
  }
};

const getNearbyRequestTypes = (filter: NearbyFilter) => {
  switch (filter) {
    case "All":
    case "Open Now":
      return ALL_FOOD_TYPES;
    case "Restaurant":
    case "Takeaway":
    case "Cafe":
    case "Food Court":
      return [FILTER_TYPE_MAP[filter]];
    default:
      return ALL_FOOD_TYPES;
  }
};

export const searchPlacesByArea = async ({
  textQuery,
  filter,
  userLocation,
  radius = DEFAULT_RADIUS_METERS,
}: AreaSearchParams): Promise<NearbyPlace[]> => {
  const trimmedQuery = textQuery.trim();

  if (!trimmedQuery) {
    return [];
  }

  const geocodedLocation = (await geocodeArea(trimmedQuery)) ?? userLocation;
  if (!geocodedLocation) {
    return [];
  }

  const results = await searchNearbyFoodByCoordinates({
    lat: geocodedLocation.lat,
    lng: geocodedLocation.lng,
    radius,
    filter,
  });

  return dedupePlaces(
    results.map((place) => normalizePlace(place, userLocation ?? geocodedLocation, filter === "Open Now")),
  );
};

export const searchNearbyPlaces = async ({
  lat,
  lng,
  radius = DEFAULT_RADIUS_METERS,
  filter,
}: NearbySearchParams): Promise<NearbyPlace[]> => {
  const results = await searchNearbyFoodByCoordinates({ lat, lng, radius, filter });

  return dedupePlaces(results.map((place) => normalizePlace(place, { lat, lng }, filter === "Open Now")));
};

export const searchMealRecommendations = async ({
  lat,
  lng,
  mealPeriod,
  radius = DEFAULT_RADIUS_METERS,
}: MealRecommendationSearchParams): Promise<NearbyPlace[]> => {
  const filter = mealPeriod === "breakfast" ? "Cafe" : "Restaurant";
  const results = await searchNearbyFoodByCoordinates({
    lat,
    lng,
    radius,
    filter,
  });

  return dedupePlaces(results.map((place) => normalizePlace(place, { lat, lng }))).slice(0, 8);
};
