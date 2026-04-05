import type { Coordinates } from "@/lib/geolocation";
import type { MealPeriod } from "@/lib/mealTime";
import {
  loadGoogleMapsPlacesLibrary,
  type GoogleMapsAuthorAttribution,
  type GoogleMapsPhoto,
  type GoogleMapsPlace,
} from "@/lib/googleMapsPlaces";

export type NearbyFilter = "All" | "Restaurant" | "Takeaway" | "Cafe" | "Food Court" | "Open Now";

export interface NearbyPlace {
  id: string;
  name: string;
  imageUrl: string | null;
  photoAttributions: GoogleMapsAuthorAttribution[];
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

const getPhotoData = (photo?: GoogleMapsPhoto) => ({
  imageUrl: photo ? photo.getURI({ maxWidth: 240, maxHeight: 240 }) : null,
  photoAttributions: photo?.authorAttributions ?? [],
});

const getLatLng = (place: GoogleMapsPlace) => {
  if (!place.location) {
    return null;
  }

  return {
    lat: place.location.lat(),
    lng: place.location.lng(),
  };
};

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

const normalizePlace = (place: GoogleMapsPlace, userLocation?: Coordinates, isOpenNow?: boolean): NearbyPlace => {
  const photo = place.photos?.[0];
  const photoData = getPhotoData(photo);
  const placeCoordinates = getLatLng(place);

  return {
    id: place.id ?? place.googleMapsURI ?? `${place.displayName ?? "place"}-${place.formattedAddress ?? "address"}`,
    name: place.displayName ?? "Unknown place",
    imageUrl: photoData.imageUrl,
    photoAttributions: photoData.photoAttributions,
    distanceText:
      userLocation && placeCoordinates
        ? formatDistance(calculateDistanceMeters(userLocation, placeCoordinates))
        : undefined,
    rating: typeof place.rating === "number" ? Number(place.rating.toFixed(1)) : null,
    address: place.formattedAddress ?? "Address unavailable",
    primaryType: place.primaryTypeDisplayName ?? place.primaryType,
    isOpenNow,
    mapsUrl: place.googleMapsURI,
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
  const { Place, SearchByTextRankPreference } = await loadGoogleMapsPlacesLibrary();
  const trimmedQuery = textQuery.trim();

  if (!trimmedQuery) {
    return [];
  }

  const request: Record<string, unknown> = {
    fields: PLACE_FIELDS,
    maxResultCount: 12,
    rankPreference: userLocation ? SearchByTextRankPreference.DISTANCE : SearchByTextRankPreference.RELEVANCE,
    textQuery: buildManualTextQuery(trimmedQuery, filter),
  };

  if (userLocation) {
    request.locationBias = {
      center: userLocation,
      radius,
    };
  }

  if (filter === "Open Now") {
    request.isOpenNow = true;
  } else if (filter !== "All") {
    request.includedType = FILTER_TYPE_MAP[filter];
    request.useStrictTypeFiltering = true;
  }

  const response = await Place.searchByText(request);

  return dedupePlaces(
    (response.places ?? []).map((place) => normalizePlace(place, userLocation, filter === "Open Now")),
  );
};

export const searchNearbyPlaces = async ({
  lat,
  lng,
  radius = DEFAULT_RADIUS_METERS,
  filter,
}: NearbySearchParams): Promise<NearbyPlace[]> => {
  if (filter === "Open Now") {
    return searchPlacesByArea({
      textQuery: "my location",
      filter,
      radius,
      userLocation: { lat, lng },
    });
  }

  const { Place, SearchNearbyRankPreference } = await loadGoogleMapsPlacesLibrary();
  const response = await Place.searchNearby({
    fields: PLACE_FIELDS,
    includedTypes: getNearbyRequestTypes(filter),
    locationRestriction: {
      center: { lat, lng },
      radius,
    },
    maxResultCount: 12,
    rankPreference: SearchNearbyRankPreference.DISTANCE,
  });

  return dedupePlaces(
    (response.places ?? []).map((place) => normalizePlace(place, { lat, lng })),
  );
};

export const searchMealRecommendations = async ({
  lat,
  lng,
  mealPeriod,
  radius = DEFAULT_RADIUS_METERS,
}: MealRecommendationSearchParams): Promise<NearbyPlace[]> => {
  const { Place, SearchByTextRankPreference } = await loadGoogleMapsPlacesLibrary();
  const response = await Place.searchByText({
    fields: PLACE_FIELDS,
    locationBias: {
      center: { lat, lng },
      radius,
    },
    maxResultCount: 8,
    rankPreference: SearchByTextRankPreference.RELEVANCE,
    textQuery: MEAL_QUERY_MAP[mealPeriod],
  });

  return dedupePlaces(
    (response.places ?? []).map((place) => normalizePlace(place, { lat, lng })),
  );
};
