export interface SearchOpenStreetMapPlacesParams {
  lat: number;
  lng: number;
  radius: number;
  amenities: OpenStreetMapAmenity[];
}

export type OpenStreetMapAmenity = "restaurant" | "cafe" | "fast_food" | "food_court";

export interface OpenStreetMapPlace {
  id: string;
  elementId: number;
  elementType: "node" | "way" | "relation";
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const CACHE_KEY = "smarteats.osm-places.v1";
const CACHE_TTL_MS = 5 * 60 * 1_000;
const REQUEST_TIMEOUT_MS = 12_000;
const VALID_AMENITIES: OpenStreetMapAmenity[] = ["restaurant", "cafe", "fast_food", "food_court"];

type OverpassElement = {
  type?: unknown;
  id?: unknown;
  lat?: unknown;
  lon?: unknown;
  center?: { lat?: unknown; lon?: unknown };
  tags?: unknown;
};
type OverpassResponse = { elements?: unknown };
type CachedPlaces = { createdAt: number; places: OpenStreetMapPlace[] };

const cacheKey = (params: SearchOpenStreetMapPlacesParams) => JSON.stringify({
  lat: params.lat,
  lng: params.lng,
  radius: params.radius,
  amenities: [...params.amenities].sort(),
});

const readCachedPlaces = (params: SearchOpenStreetMapPlacesParams): OpenStreetMapPlace[] | null => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, CachedPlaces>;
    const entry = cache[cacheKey(params)];
    if (!entry || !Number.isFinite(entry.createdAt) || Date.now() - entry.createdAt >= CACHE_TTL_MS || !Array.isArray(entry.places)) {
      return null;
    }
    return entry.places;
  } catch {
    return null;
  }
};

const cachePlaces = (params: SearchOpenStreetMapPlacesParams, places: OpenStreetMapPlace[]) => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const cache = raw ? (JSON.parse(raw) as Record<string, CachedPlaces>) : {};
    cache[cacheKey(params)] = { createdAt: Date.now(), places };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Search remains usable when storage is unavailable or full.
  }
};

const validateSearchBounds = (params: SearchOpenStreetMapPlacesParams) => {
  if (!Number.isFinite(params.lat) || params.lat < -90 || params.lat > 90) throw new Error("OpenStreetMap latitude must be between -90 and 90.");
  if (!Number.isFinite(params.lng) || params.lng < -180 || params.lng > 180) throw new Error("OpenStreetMap longitude must be between -180 and 180.");
  if (!Number.isFinite(params.radius) || params.radius < 100 || params.radius > 10_000) throw new Error("OpenStreetMap radius must be between 100 and 10000 meters.");
  if (!Array.isArray(params.amenities) || params.amenities.length === 0 || params.amenities.some((amenity) => !VALID_AMENITIES.includes(amenity))) {
    throw new Error("OpenStreetMap amenities must be valid food-place types.");
  }
};

const escapeRegex = (value: string) => value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

const buildOverpassQuery = (params: SearchOpenStreetMapPlacesParams) => {
  const amenities = params.amenities.map(escapeRegex).join("|");
  return `[out:json][timeout:25];nwr["amenity"~"^(${amenities})$"](around:${params.radius},${params.lat},${params.lng});out center tags;`;
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("OpenStreetMap place search timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const overpassHttpError = (status: number) => {
  if (status === 429) return new Error("OpenStreetMap place search is temporarily rate-limited.");
  if (status === 504) return new Error("OpenStreetMap place search timed out.");
  return new Error(`OpenStreetMap place search failed (HTTP ${status}).`);
};

const normalizeElement = (element: unknown): OpenStreetMapPlace | null => {
  if (!element || typeof element !== "object") return null;
  const candidate = element as OverpassElement;
  if (candidate.type !== "node" && candidate.type !== "way" && candidate.type !== "relation") return null;
  if (typeof candidate.id !== "number" || !Number.isSafeInteger(candidate.id)) return null;
  const coordinates = candidate.type === "node" ? { lat: candidate.lat, lon: candidate.lon } : candidate.center;
  if (!coordinates || typeof coordinates.lat !== "number" || typeof coordinates.lon !== "number" || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lon)) return null;
  if (!candidate.tags || typeof candidate.tags !== "object" || Array.isArray(candidate.tags)) return null;
  const tags = Object.entries(candidate.tags).filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string");
  if (tags.length !== Object.keys(candidate.tags).length) return null;
  return { id: `${candidate.type}/${candidate.id}`, elementId: candidate.id, elementType: candidate.type, lat: coordinates.lat, lng: coordinates.lon, tags: Object.fromEntries(tags) };
};

export async function searchOpenStreetMapPlaces(params: SearchOpenStreetMapPlacesParams): Promise<OpenStreetMapPlace[]> {
  validateSearchBounds(params);
  const cached = readCachedPlaces(params);
  if (cached) return cached;
  const response = await fetchWithTimeout(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: buildOverpassQuery(params) }),
  }, REQUEST_TIMEOUT_MS);
  if (!response.ok) throw overpassHttpError(response.status);
  let payload: OverpassResponse;
  try {
    payload = await response.json() as OverpassResponse;
  } catch {
    throw new Error("OpenStreetMap place search returned an invalid response.");
  }
  if (!Array.isArray(payload.elements)) throw new Error("OpenStreetMap place search returned an invalid response.");
  const places = payload.elements.map(normalizeElement).filter((place): place is OpenStreetMapPlace => place !== null);
  cachePlaces(params, places);
  return places;
}
