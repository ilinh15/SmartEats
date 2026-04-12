import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { NearbyPlace } from "@/lib/nearbyPlaces";

const FAVORITE_RESTAURANTS_COLLECTION = "favorite_restaurants";

interface FavoriteRestaurantDocument {
  name?: unknown;
  address?: unknown;
  imageUrl?: unknown;
  distanceText?: unknown;
  rating?: unknown;
  primaryType?: unknown;
  mapsUrl?: unknown;
  isOpenNow?: unknown;
  savedAt?: unknown;
}

const toNullableString = (value: unknown) => (typeof value === "string" ? value : null);

const toOptionalString = (value: unknown) => (typeof value === "string" ? value : undefined);

const toNullableNumber = (value: unknown) => (typeof value === "number" ? value : null);

const toSavedAtString = (value: unknown) => (typeof value === "string" ? value : "");

const mapFavoriteRestaurant = (
  id: string,
  data: FavoriteRestaurantDocument,
): { restaurant: NearbyPlace; savedAt: string } | null => {
  if (typeof data.name !== "string" || typeof data.address !== "string") {
    return null;
  }

  return {
    restaurant: {
      id,
      name: data.name,
      address: data.address,
      imageUrl: toNullableString(data.imageUrl),
      photoAttributions: [],
      distanceText: toOptionalString(data.distanceText),
      rating: toNullableNumber(data.rating),
      primaryType: toOptionalString(data.primaryType),
      isOpenNow: typeof data.isOpenNow === "boolean" ? data.isOpenNow : undefined,
      mapsUrl: toOptionalString(data.mapsUrl),
    },
    savedAt: toSavedAtString(data.savedAt),
  };
};

const getFavoriteRestaurantCollection = (uid: string) =>
  collection(db!, "users", uid, FAVORITE_RESTAURANTS_COLLECTION);

const getFavoriteRestaurantDocument = (uid: string, restaurantId: string) =>
  doc(db!, "users", uid, FAVORITE_RESTAURANTS_COLLECTION, restaurantId);

export const loadFavoriteRestaurants = async (uid: string): Promise<NearbyPlace[]> => {
  if (!isFirebaseConfigured || !db || !uid) {
    return [];
  }

  const snapshot = await getDocs(getFavoriteRestaurantCollection(uid));

  return snapshot.docs
    .map((docSnapshot) =>
      mapFavoriteRestaurant(docSnapshot.id, docSnapshot.data() as FavoriteRestaurantDocument),
    )
    .filter(
      (favorite): favorite is { restaurant: NearbyPlace; savedAt: string } => favorite !== null,
    )
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .map((favorite) => favorite.restaurant);
};

export const toggleFavoriteRestaurant = async (
  uid: string,
  restaurant: NearbyPlace,
): Promise<boolean> => {
  if (!isFirebaseConfigured || !db || !uid) {
    throw new Error("Firebase is not configured for favorites.");
  }

  const favoriteDocument = getFavoriteRestaurantDocument(uid, restaurant.id);
  const snapshot = await getDoc(favoriteDocument);

  if (snapshot.exists()) {
    await deleteDoc(favoriteDocument);
    return false;
  }

  await setDoc(favoriteDocument, {
    name: restaurant.name,
    address: restaurant.address,
    imageUrl: restaurant.imageUrl,
    distanceText: restaurant.distanceText ?? null,
    rating: restaurant.rating,
    primaryType: restaurant.primaryType ?? null,
    mapsUrl: restaurant.mapsUrl ?? null,
    isOpenNow: restaurant.isOpenNow ?? null,
    savedAt: new Date().toISOString(),
  });

  return true;
};
