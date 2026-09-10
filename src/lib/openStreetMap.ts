import type { Coordinates } from "@/lib/geolocation";
import { fetchRecipeImage } from "@/lib/recipeGeneration";

export type OSMElementType = "node" | "way" | "relation";

export interface GeocodedArea {
  lat: number;
  lng: number;
  displayName: string;
}

export interface OpenStreetMapSearchResult {
  id: string;
  name: string;
  address: string;
  primaryType?: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  type: OSMElementType;
  rawType?: string;
  imageUrl?: string | null;
  photoAttributions?: Array<{ displayName: string; uri?: string }>;
}

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MALAYSIA_BOUNDING_BOX = "100.0,1.0,119.5,7.5";
const MALAYSIA_COUNTRY_CODE = "MY";
const REQUEST_TIMEOUT_MS = 12_000;

const FOOD_TYPE_MAP: Record<string, string> = {
  All: "restaurant",
  Restaurant: "restaurant",
  Takeaway: "restaurant",
  Cafe: "cafe",
  "Food Court": "food court",
  "Open Now": "restaurant",
};

const isInMalaysia = (lat: number, lng: number) => {
  const [minLng, minLat, maxLng, maxLat] = MALAYSIA_BOUNDING_BOX.split(",").map(Number);
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
};

const fetchWithTimeout = async <T>(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  consumeResponse: (response: Response) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return await consumeResponse(response);
  } catch (error) {
    if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw new Error("OpenStreetMap query timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const overpassQueryForFilter = (filter: string) => {
  const resolved = filter && filter !== "All" ? FOOD_TYPE_MAP[filter] ?? FOOD_TYPE_MAP.All : FOOD_TYPE_MAP.All;
  return resolved === "cafe" ? ["cafe"] : ["restaurant", "fast_food", "food_court", "cafe"]; 
};

export const buildOverpassQuery = ({
  query,
  lat,
  lng,
  radius = 1800,
  filter,
}: {
  query?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  filter?: string;
}) => {
  const amenities = overpassQueryForFilter(filter ?? "All")
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  const candidate = query && query.trim().length > 0 ? query.trim() : "/";
  const aroundClause = typeof lat === "number" && typeof lng === "number" ? `(around:${radius},${lat},${lng})` : "";

  return `[out:json][timeout:25];nwr["amenity"~"^(${amenities})$"]${aroundClause};out center tags;`;
};

const getRestaurantImageFallback = async (restaurantName: string): Promise<string | null> => {
  const cleanName = restaurantName.trim();
  if (!cleanName) {
    return null;
  }

  const unsplashImage = await fetchRecipeImage(`${cleanName} restaurant`);
  return unsplashImage ?? null;
};

const normalizeOverpassElement = (element: unknown): OpenStreetMapSearchResult | null => {
  if (!element || typeof element !== "object") {
    return null;
  }

  const candidate = element as {
    type?: unknown;
    id?: unknown;
    lat?: unknown;
    lon?: unknown;
    center?: { lat?: unknown; lon?: unknown };
    tags?: Record<string, string>;
  };

  if (candidate.type !== "node" && candidate.type !== "way" && candidate.type !== "relation") {
    return null;
  }

  if (typeof candidate.id !== "number" || !Number.isSafeInteger(candidate.id)) {
    return null;
  }

  const coordinates = candidate.type === "node" ? { lat: candidate.lat, lon: candidate.lon } : candidate.center;
  if (!coordinates || typeof coordinates.lat !== "number" || typeof coordinates.lon !== "number") {
    return null;
  }

  const tags = candidate.tags;
  if (!tags || typeof tags !== "object") {
    return null;
  }

  const name = tags.name?.trim() || tags.brand?.trim() || `Food place ${candidate.id}`;
  const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"], tags["addr:postcode"]]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(", ") || "Address unavailable";
  const amenity = tags.amenity ?? tags.shop ?? "restaurant";

  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    id: `${candidate.type}/${candidate.id}`,
    name,
    address,
    primaryType: amenity,
    lat,
    lng,
    mapsUrl: `https://www.openstreetmap.org/${candidate.type}/${candidate.id}`,
    type: candidate.type,
    rawType: amenity,
    imageUrl: null,
    photoAttributions: [],
  };
};

export const geocodeArea = async (textQuery: string): Promise<Coordinates | null> => {
  const query = textQuery.trim();
  if (!query) {
    return null;
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    "accept-language": "en",
    countrycodes: MALAYSIA_COUNTRY_CODE,
  }).toString();

  const results = await fetchWithTimeout(url.toString(), { headers: { Accept: "application/json" } }, REQUEST_TIMEOUT_MS, async (response) => {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenStreetMap geocoding failed (${response.status}): ${text.slice(0, 120)}`);
    }

    return (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  });

  const first = results[0];
  if (!first || !first.lat || !first.lon) {
    return null;
  }

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInMalaysia(lat, lng)) {
    return null;
  }

  return { lat, lng };
};

export const searchNearbyFoodByCoordinates = async ({
  lat,
  lng,
  radius,
  filter,
}: {
  lat: number;
  lng: number;
  radius: number;
  filter: "All" | "Restaurant" | "Takeaway" | "Cafe" | "Food Court" | "Open Now";
}): Promise<OpenStreetMapSearchResult[]> => {
  const query = buildOverpassQuery({ lat, lng, radius, filter });

  const payload = await fetchWithTimeout(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
  }, REQUEST_TIMEOUT_MS, async (response) => {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenStreetMap place search failed (${response.status}): ${text.slice(0, 120)}`);
    }

    return (await response.json()) as { elements?: unknown[] };
  });

  const elements = payload.elements ?? [];
  const places = elements
    .map(normalizeOverpassElement)
    .filter((place): place is OpenStreetMapSearchResult => place !== null)
    .filter((place) => isInMalaysia(place.lat, place.lng));

  const withImages = await Promise.all(
    places.slice(0, 12).map(async (place) => ({
      ...place,
      imageUrl: (await getRestaurantImageFallback(place.name)) ?? place.imageUrl ?? null,
    })),
  );

  return withImages;
};
