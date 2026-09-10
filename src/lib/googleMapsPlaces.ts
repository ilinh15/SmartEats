const GOOGLE_MAPS_SCRIPT_ID = "google-maps-javascript-api";

interface GoogleMapsPlacesLibrary {
  Place: {
    searchNearby: (request: Record<string, unknown>) => Promise<{ places: GoogleMapsPlace[] }>;
    searchByText: (request: Record<string, unknown>) => Promise<{ places: GoogleMapsPlace[] }>;
  };
  SearchNearbyRankPreference: {
    DISTANCE: string;
    POPULARITY: string;
  };
  SearchByTextRankPreference: {
    DISTANCE: string;
    RELEVANCE: string;
  };
}

export interface GoogleMapsAuthorAttribution {
  displayName: string;
  uri?: string;
}

export interface GoogleMapsPhoto {
  authorAttributions?: GoogleMapsAuthorAttribution[];
  getURI: (options?: { maxHeight?: number; maxWidth?: number }) => string;
}

interface GoogleMapsLocation {
  lat: () => number;
  lng: () => number;
}

export interface GoogleMapsPlace {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  googleMapsURI?: string;
  location?: GoogleMapsLocation;
  photos?: GoogleMapsPhoto[];
  primaryType?: string;
  primaryTypeDisplayName?: string;
  rating?: number;
}

export interface GooglePlaceSearchResult {
  id: string;
  name: string;
  address: string;
  primaryType?: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  rating: number | null;
  imageUrl?: string | null;
  photoAttributions?: Array<{ displayName: string; uri?: string }>;
}

let scriptLoadPromise: Promise<void> | null = null;

const buildScriptUrl = (apiKey: string) => {
  const params = new URLSearchParams({
    key: apiKey,
    v: "weekly",
    libraries: "places",
    loading: "async",
  });

  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
};

const ensureGoogleMapsScript = (apiKey: string) => {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps JavaScript API.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = buildScriptUrl(apiKey);
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps JavaScript API."));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

export const loadGoogleMapsPlacesLibrary = async (): Promise<GoogleMapsPlacesLibrary> => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing VITE_GOOGLE_MAPS_API_KEY.");
  }

  await ensureGoogleMapsScript(apiKey);

  if (!window.google?.maps?.importLibrary) {
    throw new Error("Google Maps Places library is unavailable.");
  }

  return window.google.maps.importLibrary("places") as Promise<GoogleMapsPlacesLibrary>;
};

const getGoogleIncludedTypes = (filter: "All" | "Restaurant" | "Takeaway" | "Cafe" | "Food Court" | "Open Now") => {
  switch (filter) {
    case "Restaurant":
      return ["restaurant"];
    case "Takeaway":
      return ["meal_takeaway", "restaurant"];
    case "Cafe":
      return ["cafe"];
    case "Food Court":
      return ["food_court"];
    case "Open Now":
      return ["restaurant", "cafe", "meal_takeaway", "food_court"];
    case "All":
    default:
      return ["restaurant", "cafe", "meal_takeaway", "food_court", "bar"];
  }
};

const toGooglePlaceSearchResult = (place: GoogleMapsPlace): GooglePlaceSearchResult => {
  const lat = place.location?.lat?.() ?? 0;
  const lng = place.location?.lng?.() ?? 0;
  const imageUrl = place.photos?.[0]?.getURI?.({ maxWidth: 400, maxHeight: 300 }) ?? null;
  const photoAttributions = place.photos?.[0]?.authorAttributions?.map((author) => ({
    displayName: author.displayName,
    uri: author.uri,
  })) ?? [];

  return {
    id: place.id ?? `${place.displayName ?? "google-place"}-${lat}-${lng}`,
    name: place.displayName ?? "Restaurant",
    address: place.formattedAddress ?? "Address unavailable",
    primaryType: place.primaryType ?? place.primaryTypeDisplayName,
    lat,
    lng,
    mapsUrl: place.googleMapsURI ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName ?? "restaurant")}`,
    rating: typeof place.rating === "number" ? place.rating : null,
    imageUrl,
    photoAttributions,
  };
};

export const searchGooglePlacesByCoordinates = async ({
  lat,
  lng,
  radius,
  filter,
}: {
  lat: number;
  lng: number;
  radius: number;
  filter: "All" | "Restaurant" | "Takeaway" | "Cafe" | "Food Court" | "Open Now";
}): Promise<GooglePlaceSearchResult[]> => {
  const library = await loadGoogleMapsPlacesLibrary();
  const request = {
    fields: [
      "id",
      "displayName",
      "formattedAddress",
      "googleMapsURI",
      "location",
      "photos",
      "primaryType",
      "primaryTypeDisplayName",
      "rating",
    ],
    includedTypes: getGoogleIncludedTypes(filter),
    locationRestriction: {
      center: { lat, lng },
      radius: Math.max(radius, 200),
    },
    maxResultCount: 10,
    language: "en",
    rankPreference: library.SearchNearbyRankPreference.DISTANCE,
  };

  const result = await library.Place.searchNearby(request);
  return (result.places ?? []).map(toGooglePlaceSearchResult).slice(0, 10);
};

export const searchGooglePlacesByText = async ({
  textQuery,
  filter,
  lat,
  lng,
  radius,
}: {
  textQuery: string;
  filter: "All" | "Restaurant" | "Takeaway" | "Cafe" | "Food Court" | "Open Now";
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<GooglePlaceSearchResult[]> => {
  const library = await loadGoogleMapsPlacesLibrary();
  const request = {
    textQuery: `${textQuery} ${filter === "All" ? "restaurant" : filter}`.trim(),
    fields: [
      "id",
      "displayName",
      "formattedAddress",
      "googleMapsURI",
      "location",
      "photos",
      "primaryType",
      "primaryTypeDisplayName",
      "rating",
    ],
    maxResultCount: 10,
    language: "en",
    rankPreference: library.SearchByTextRankPreference.RELEVANCE,
    ...(typeof lat === "number" && typeof lng === "number" && typeof radius === "number"
      ? {
          locationBias: {
            circle: {
              center: { lat, lng },
              radius: Math.max(radius, 500),
            },
          },
        }
      : {}),
  };

  const result = await library.Place.searchByText(request);
  return (result.places ?? []).map(toGooglePlaceSearchResult).slice(0, 10);
};
