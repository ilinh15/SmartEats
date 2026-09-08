export interface GeocodedArea {
  lat: number;
  lng: number;
  displayName: string;
}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const CACHE_KEY = "smarteats.osm-geocoding.v1";
const MIN_REQUEST_INTERVAL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 8_000;

type NominatimResult = { lat: string; lon: string; display_name: string };

let lastRequestAt: number | null = null;
let requestQueue: Promise<void> = Promise.resolve();

const wait = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));

const readCachedArea = (query: string): GeocodedArea | null => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, GeocodedArea>;
    const result = cache[query.toLocaleLowerCase()];
    if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lng) || typeof result.displayName !== "string") {
      return null;
    }
    return result;
  } catch {
    return null;
  }
};

const cacheArea = (query: string, result: GeocodedArea) => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const cache = raw ? (JSON.parse(raw) as Record<string, GeocodedArea>) : {};
    cache[query.toLocaleLowerCase()] = result;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Geocoding remains usable when storage is unavailable or full.
  }
};

const waitForNominatimSlot = () => {
  const slot = requestQueue.then(async () => {
    if (lastRequestAt !== null) {
      const remaining = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
      if (remaining > 0) await wait(remaining);
    }
    lastRequestAt = Date.now();
  });
  requestQueue = slot.catch(() => undefined);
  return slot;
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("OpenStreetMap geocoding timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const nominatimHttpError = (status: number) => {
  if (status === 429) return new Error("OpenStreetMap geocoding is temporarily rate-limited.");
  return new Error(`OpenStreetMap geocoding failed (HTTP ${status}).`);
};

export async function geocodeArea(textQuery: string): Promise<GeocodedArea | null> {
  const query = textQuery.trim();
  if (!query) return null;

  const cached = readCachedArea(query);
  if (cached) return cached;

  await waitForNominatimSlot();
  const url = new URL(NOMINATIM_ENDPOINT);
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    "accept-language": "en",
  }).toString();
  const response = await fetchWithTimeout(url.toString(), REQUEST_TIMEOUT_MS);
  if (!response.ok) throw nominatimHttpError(response.status);

  const [first] = await response.json() as NominatimResult[];
  if (!first) return null;
  const result = { lat: Number(first.lat), lng: Number(first.lon), displayName: first.display_name };
  if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) {
    throw new Error("Nominatim returned invalid coordinates.");
  }
  cacheArea(query, result);
  return result;
}
