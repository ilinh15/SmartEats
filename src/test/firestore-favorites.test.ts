import { beforeEach, describe, expect, it } from "vitest";
import type { NearbyPlace } from "@/lib/nearbyPlaces";
import type { CookingRecommendation } from "@/lib/cookingRecommendations";
import { loadFavoriteRestaurants, toggleFavoriteRestaurant } from "@/lib/restaurantFavorites";
import {
  createSavedRecipeFromGeneratedRecipe,
  loadFavoriteRecipes,
  toggleFavoriteRecipe,
} from "@/lib/recipeFavorites";
import {
  getFirestoreDocument,
  resetFirebaseTestState,
  seedFirestoreDocument,
} from "./firebaseTestUtils";

const sampleRestaurant: NearbyPlace = {
  id: "rest-1",
  name: "Roti Corner",
  imageUrl: null,
  photoAttributions: [],
  distanceText: "0.5 km",
  rating: 4.6,
  address: "Little India, Singapore",
  primaryType: "Restaurant",
  isOpenNow: true,
  mapsUrl: "https://maps.google.com/?cid=rest-1",
};

const sampleRecipe: CookingRecommendation = {
  id: "tamago-sando",
  title: "Tamago Sando",
  description: "Creamy Japanese egg salad tucked into pillowy milk bread for a soft, satisfying bite.",
  cuisine: "japanese",
  mealType: "breakfast",
  cookTimeMinutes: 15,
  ingredients: ["Eggs", "Japanese mayo", "Milk bread"],
  instructions: ["Boil the eggs.", "Mash with mayo.", "Assemble the sandwich."],
  imageUrl: null,
  isRecommended: true,
  difficulty: "Easy",
  tags: ["Cafe-style"],
};

describe("Firestore favorites repositories", () => {
  beforeEach(() => {
    resetFirebaseTestState();
  });

  it("loads only the signed-in user's restaurant favorites", async () => {
    seedFirestoreDocument("users/user-a/favorite_restaurants/rest-1", {
      name: sampleRestaurant.name,
      address: sampleRestaurant.address,
      imageUrl: sampleRestaurant.imageUrl,
      distanceText: sampleRestaurant.distanceText,
      rating: sampleRestaurant.rating,
      primaryType: sampleRestaurant.primaryType,
      mapsUrl: sampleRestaurant.mapsUrl,
      isOpenNow: sampleRestaurant.isOpenNow,
      savedAt: "2026-04-12T10:00:00.000Z",
    });
    seedFirestoreDocument("users/user-b/favorite_restaurants/rest-2", {
      name: "Another Cafe",
      address: "Bugis, Singapore",
      imageUrl: null,
      distanceText: "1.2 km",
      rating: 4.1,
      primaryType: "Cafe",
      mapsUrl: "https://maps.google.com/?cid=rest-2",
      isOpenNow: false,
      savedAt: "2026-04-12T09:00:00.000Z",
    });

    const favorites = await loadFavoriteRestaurants("user-a");

    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.id).toBe("rest-1");
    expect(favorites[0]?.name).toBe("Roti Corner");
  });

  it("writes and deletes restaurant favorites under the current user's subcollection", async () => {
    await toggleFavoriteRestaurant("user-a", sampleRestaurant);

    expect(getFirestoreDocument("users/user-a/favorite_restaurants/rest-1")).toMatchObject({
      name: "Roti Corner",
      address: "Little India, Singapore",
    });

    await toggleFavoriteRestaurant("user-a", sampleRestaurant);

    expect(getFirestoreDocument("users/user-a/favorite_restaurants/rest-1")).toBeNull();
  });

  it("loads only the signed-in user's recipe favorites", async () => {
    seedFirestoreDocument("users/user-a/favorite_recipes/tamago-sando", {
      ...sampleRecipe,
      savedAt: "2026-04-12T10:00:00.000Z",
    });
    seedFirestoreDocument("users/user-b/favorite_recipes/ochazuke-bowl", {
      ...sampleRecipe,
      title: "Ochazuke Bowl",
      mealType: "supper",
      savedAt: "2026-04-12T09:00:00.000Z",
    });

    const favorites = await loadFavoriteRecipes("user-a");

    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.id).toBe("tamago-sando");
    expect(favorites[0]?.title).toBe("Tamago Sando");
  });

  it("writes and deletes recipe favorites under the current user's subcollection", async () => {
    const savedRecipe = await toggleFavoriteRecipe("user-a", sampleRecipe);

    expect(savedRecipe).not.toBeNull();
    expect(getFirestoreDocument("users/user-a/favorite_recipes/tamago-sando")).toMatchObject({
      title: "Tamago Sando",
      cuisine: "japanese",
      mealType: "breakfast",
    });

    const removedRecipe = await toggleFavoriteRecipe("user-a", sampleRecipe);

    expect(removedRecipe).toBeNull();
    expect(getFirestoreDocument("users/user-a/favorite_recipes/tamago-sando")).toBeNull();
  });

  it("stores generated Cook recipes as user-owned snapshot favorites", async () => {
    const generatedFavorite = createSavedRecipeFromGeneratedRecipe(
      {
        title: "One Pan Garlic Noodles",
        prepTime: "5 Min",
        cookTime: "15 Min",
        servings: "2",
        difficulty: "Easy",
        tag: "Weeknight",
        ingredients: ["Noodles", "Garlic", "Soy sauce"],
        instructions: ["Boil the noodles.", "Toss with the sauce."],
        imageUrl: null,
      },
      {
        selectedIngredients: ["Noodles", "Garlic", "Soy sauce"],
        selectedCuisine: "Japanese",
      },
    );

    await toggleFavoriteRecipe("user-a", generatedFavorite);

    expect(getFirestoreDocument(`users/user-a/favorite_recipes/${generatedFavorite.id}`)).toMatchObject({
      title: "One Pan Garlic Noodles",
      source: "generated",
      cuisineLabel: "Japanese",
      seedIngredients: ["Noodles", "Garlic", "Soy sauce"],
    });
  });
});
