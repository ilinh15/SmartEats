import opening_hours from "opening_hours";
import type { Coordinates } from "@/lib/geolocation";
import type { MealPeriod } from "@/lib/mealTime";
import { geocodeArea } from "@/lib/openStreetMapNominatim";
import {
  searchOpenStreetMapPlaces,
  type OpenStreetMapAmenity,
  type OpenStreetMapPlace,
} from "@/lib/openStreetMapOverpass";

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
const FILTER_AMENITIES: Record<NearbyFilter, OpenStreetMapAmenity[]> = {
  All: ["restaurant", "cafe", "fast_food", "food_court"],
  Restaurant: ["restaurant"],
  Takeaway: ["fast_food", "restaurant"],
  Cafe: ["cafe"],
  "Food Court": ["food_court"],
  "Open Now": ["restaurant", "cafe", "fast_food", "food_court"],
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

const isCurrentlyOpen = (value?: string) => {
  if (!value) return undefined;
  try {
    const hours = new opening_hours(value);
    return hours.getUnknown() ? undefined : hours.getState(new Date());
  } catch {
    return undefined;
  }
};

const getName = (tags: Record<string, string>) => {
  const name = tags.name?.trim() || tags.brand?.trim();
  return name || null;
};

const getAddress = (tags: Record<string, string>, areaLabel?: string) => {
  const streetAddress = [tags["addr:housenumber"], tags["addr:street"]]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  const locality = tags["addr:city"] || tags["addr:place"] || tags["addr:suburb"];
  const parts = [streetAddress, tags["addr:unit"], tags["addr:floor"], tags["addr:postcode"], locality]
    .filter((value): value is string => Boolean(value?.trim()));

  return parts.join(", ") || areaLabel || "Address unavailable";
};

const getPrimaryType = (tags: Record<string, string>) => {
  if (tags.amenity === "cafe") return "Cafe";
  if (tags.amenity === "food_court") return "Food Court";
  if (tags.amenity === "fast_food" || tags.takeaway === "yes" || tags.takeaway === "only") return "Takeaway";
  if (tags.amenity === "restaurant") return "Restaurant";
  return undefined;
};

const isTakeawayPlace = (place: OpenStreetMapPlace) =>
  place.tags.amenity === "fast_food" ||
  (place.tags.amenity === "restaurant" && (place.tags.takeaway === "yes" || place.tags.takeaway === "only"));

interface RankedPlace {
  place: NearbyPlace;
  distanceMeters: number;
}

const normalizePlace = (
  place: OpenStreetMapPlace,
  referenceLocation: Coordinates,
  areaLabel?: string,
): RankedPlace | null => {
  const name = getName(place.tags);
  if (!name) return null;

  const distanceMeters = calculateDistanceMeters(referenceLocation, place);
  const isOpenNow = isCurrentlyOpen(place.tags.opening_hours);

  return {
    distanceMeters,
    place: {
      id: place.id,
      name,
      imageUrl: null,
      photoAttributions: [],
      distanceText: formatDistance(distanceMeters),
      rating: null,
      address: getAddress(place.tags, areaLabel),
      primaryType: getPrimaryType(place.tags),
      isOpenNow,
      mapsUrl: `https://www.openstreetmap.org/${place.id}`,
    },
  };
};

const dedupeAndRankPlaces = (places: RankedPlace[], limit: number) => {
  const seen = new Set<string>();

  return places
    .filter((place) => {
      if (seen.has(place.place.id)) return false;
      seen.add(place.place.id);
      return true;
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, limit)
    .map((place) => place.place);
};

const searchAndNormalize = async ({
  searchLocation,
  distanceReference,
  radius,
  filter,
  areaLabel,
  limit,
}: {
  searchLocation: Coordinates;
  distanceReference: Coordinates;
  radius: number;
  filter: NearbyFilter;
  areaLabel?: string;
  limit: number;
}) => {
  const rawPlaces = await searchOpenStreetMapPlaces({
    lat: searchLocation.lat,
    lng: searchLocation.lng,
    radius,
    amenities: FILTER_AMENITIES[filter],
  });
  const filteredPlaces = filter === "Takeaway" ? rawPlaces.filter(isTakeawayPlace) : rawPlaces;
  const normalizedPlaces = filteredPlaces
    .map((place) => normalizePlace(place, distanceReference, areaLabel))
    .filter((place): place is RankedPlace => place !== null);
  const openPlaces = filter === "Open Now" ? normalizedPlaces.filter((place) => place.place.isOpenNow === true) : normalizedPlaces;

  return dedupeAndRankPlaces(openPlaces, limit);
};

export const searchPlacesByArea = async ({
  textQuery,
  filter,
  userLocation,
  radius = DEFAULT_RADIUS_METERS,
}: AreaSearchParams): Promise<NearbyPlace[]> => {
  const trimmedQuery = textQuery.trim();
  if (!trimmedQuery) return [];

  const area = await geocodeArea(trimmedQuery);
  if (!area) return [];

  return searchAndNormalize({
    searchLocation: { lat: area.lat, lng: area.lng },
    distanceReference: userLocation ?? { lat: area.lat, lng: area.lng },
    radius,
    filter,
    areaLabel: area.displayName,
    limit: 12,
  });
};

export const searchNearbyPlaces = async ({
  lat,
  lng,
  radius = DEFAULT_RADIUS_METERS,
  filter,
}: NearbySearchParams): Promise<NearbyPlace[]> =>
  searchAndNormalize({
    searchLocation: { lat, lng },
    distanceReference: { lat, lng },
    radius,
    filter,
    limit: 12,
  });

export const searchMealRecommendations = async ({
  lat,
  lng,
  mealPeriod: _mealPeriod,
  radius = DEFAULT_RADIUS_METERS,
}: MealRecommendationSearchParams): Promise<NearbyPlace[]> =>
  searchAndNormalize({
    searchLocation: { lat, lng },
    distanceReference: { lat, lng },
    radius,
    filter: "All",
    limit: 8,
  });
