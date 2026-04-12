# Meal-Time Recipe Display - Setup Guide

## Overview

This feature allows recipes to be displayed at specific meal times on the home page. A single recipe can be suitable for multiple meal times (e.g., Nasi Lemak for both lunch and dinner).

## How It Works

1. **Recipe Storage**: Recipes are stored in the `cooking_recommendations` collection with a `mealType` field
2. **Multiple Meal Times**: The `mealType` can be an array to support multiple meal times (e.g., `["lunch", "dinner"]`)
3. **Time Detection**: The app detects the current time and shows recipes for that meal period
4. **Favorites**: Users can save recipes to their favorites, which displays them on the Favorites page

## Step 1: Update Firestore Rules

Update your Firestore security rules to support arrays in the cooking_recommendations collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profiles
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Favorite restaurants
    match /favorite_restaurants/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Favorite recipes - now supports arrays in mealType
    match /favorite_recipes/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Public cooking recommendations - read-only
    match /cooking_recommendations/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Step 2: Update Firestore Data

Update each recipe in the `cooking_recommendations` collection to have `mealType` as an ARRAY instead of a single string:

### In Firebase Console:

1. Go to **Firestore Database**
2. Open the **cooking_recommendations** collection
3. For each recipe, update the `mealType` field:

**Before (Single Value - ❌ Old):**
```
mealType: "lunch"
```

**After (Array - ✅ New):**
```
mealType: ["breakfast", "lunch", "dinner"]
```

### Recommended Meal Times Per Recipe:

| Recipe | Meal Times |
|--------|-----------|
| Nasi Lemak | `["lunch", "dinner"]` |
| Pesto Pasta | `["lunch", "dinner"]` |
| Avocado Toast | `["breakfast", "lunch"]` |
| Smoothie Bowl | `["breakfast"]` |
| Salad | `["lunch", "dinner"]` |
| Chocolate Cake | `["breakfast", "lunch", "dinner", "supper"]` |

## Step 3: Test the Feature

### On Home Page:

1. **Morning (5 AM - 11 AM)**: App detects "breakfast" and shows recipes with `mealType` including "breakfast"
2. **Afternoon (11 AM - 4 PM)**: App detects "lunch" and shows recipes with `mealType` including "lunch"
3. **Evening (4 PM - 10 PM)**: App detects "dinner" and shows recipes with `mealType` including "dinner"
4. **Night (10 PM - 5 AM)**: App detects "supper" and shows recipes with `mealType` including "supper"

### On Cook Page & Favorites:

- All recipes are shown in the Cook page
- Users can save recipes to favorites
- Saved recipes appear on the Favorites page
- Users can unsave recipes anytime

## Data Structure

### cooking_recommendations Collection:

```json
{
  "id": "nasi-lemak",
  "title": "Nasi Lemak",
  "description": "...",
  "cuisine": "malay",
  "mealType": ["lunch", "dinner"],
  "cookTimeMinutes": 30,
  "ingredients": [...],
  "instructions": [...],
  "imageUrl": "...",
  "isRecommended": true,
  "difficulty": "Medium",
  "createdAt": "2026-04-13T...",
  "updatedAt": "2026-04-13T..."
}
```

### favorite_recipes Collection:

```json
{
  "userId": {
    "recipe-id-1": {
      "id": "recipe-id-1",
      "title": "Nasi Lemak",
      "cuisine": "malay",
      "mealType": ["lunch", "dinner"],
      "imageUrl": "...",
      "source": "recommendation",
      "savedAt": "2026-04-13T..."
    }
  }
}
```

## Time Detection

The app uses the user's local time to determine meal periods:

```typescript
getMealPeriod(date: Date): MealPeriod {
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 22) return "dinner";
  return "supper"; // 22:00 - 05:00
}
```

## Code Changes Made

### 1. `src/lib/cookingRecommendations.ts`
- Updated `CookingRecommendation.mealType` to accept `CookingMealType | CookingMealType[]`
- Added `isCookingMealTypeOrArray()` validation function
- Added `normalizeMealType()` to convert single values to arrays
- Updated `mapRecommendation()` to normalize mealType
- Updated `listCookingRecommendations()` filter to check if requested mealType is in the array

### 2. `src/lib/recipeFavorites.ts`
- Updated `SavedRecipe.mealType` to accept `CookingMealType | CookingMealType[]`

## How Recipe Display Works

### On Home Page:

```
1. Detect current time → "lunch"
2. Query cooking_recommendations where isRecommended = true
3. Filter recipes where mealType includes "lunch"
4. Display those recipes in CookingRecommendationSection
5. User can save to favorites by clicking heart icon
```

### On Cook Page:

```
1. Show all recommended recipes (all meal times)
2. User can search/filter by cuisine, ingredients
3. User can save recipes to favorites
```

### On Favorites Page:

```
1. Show all user's saved recipes (from favorite_recipes)
2. Can sort/filter by meal time, cuisine
3. Can unsave recipes
```

## Troubleshooting

### Recipes Not Showing at Meal Time

**Cause**: Recipe's `mealType` doesn't include the current meal period

**Solution**:
1. Check the current time on your device
2. Go to Firebase Console → cooking_recommendations
3. Find the recipe and verify `mealType` includes the current period
4. Example: If it's noon, the recipe needs `"lunch"` in its mealType array

### Recipe Shows Wrong Meal Type

**Cause**: `mealType` is still a single string instead of an array

**Solution**:
1. In Firebase Console, update the field to an array
2. Change `"lunch"` to `["lunch"]`
3. Or add more meal times: `["lunch", "dinner"]`

### Recipes Not Showing in Cook Page

**Cause**: `isRecommended` is false or recipe validation failed

**Solution**:
1. Check Firebase Console → cooking_recommendations
2. Ensure `isRecommended` is `true`
3. Verify all required fields are present: title, description, cuisine, mealType, etc.

## Advanced: Add New Recipes

To add a new recipe to the cooking_recommendations collection:

1. In Firebase Console, go to cooking_recommendations
2. Click **"Add document"**
3. Set Document ID: `unique-recipe-id` (lowercase, hyphens)
4. Add fields:
   - `title`: string
   - `description`: string
   - `cuisine`: "chinese", "malay", "indian", "japanese", or "western"
   - `mealType`: array like `["lunch", "dinner"]`
   - `cookTimeMinutes`: number
   - `ingredients`: array of strings
   - `instructions`: array of strings
   - `imageUrl`: string (optional)
   - `isRecommended`: true/false
   - `difficulty`: "Easy", "Medium", "Hard" (optional)
   - `tags`: array of strings (optional)
   - `createdAt`: server timestamp
   - `updatedAt`: server timestamp

## Testing Checklist

- [ ] Firestore rules updated
- [ ] All recipes have mealType as arrays (not strings)
- [ ] Visit home page at different times
- [ ] Verify correct recipes show for breakfast, lunch, dinner
- [ ] Add recipe to favorites from Cook page
- [ ] View saved recipes on Favorites page
- [ ] Remove recipe from favorites
- [ ] No errors in browser console (F12)
- [ ] No permission denied errors

## Files Modified

- `src/lib/cookingRecommendations.ts` - Support for mealType arrays
- `src/lib/recipeFavorites.ts` - Support for mealType arrays in saved recipes

## Summary

✅ Recipes can now be suitable for multiple meal times  
✅ The app detects current time and displays relevant recipes  
✅ Users can save recipes to favorites  
✅ Each user only sees their own saved favorites  
✅ All data persists in Firestore
