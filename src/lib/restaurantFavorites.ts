import type { NearbyPlace } from "@/lib/nearbyPlaces";

const FAVORITE_RESTAURANTS_STORAGE_KEY = "smart-eats.favorite-restaurants";

const isNearbyPlace = (value: unknown): value is NearbyPlace => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<NearbyPlace>;
  return typeof candidate.id === "string" && typeof candidate.name === "string";
};

export const loadFavoriteRestaurants = (): NearbyPlace[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(FAVORITE_RESTAURANTS_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isNearbyPlace);
  } catch {
    return [];
  }
};

export const saveFavoriteRestaurants = (restaurants: NearbyPlace[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITE_RESTAURANTS_STORAGE_KEY, JSON.stringify(restaurants));
};
