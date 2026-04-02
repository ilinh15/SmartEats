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
