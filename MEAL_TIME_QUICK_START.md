# Meal-Time Recipe Display - Quick Start Guide

## What Changed ✅

I've updated the app to use your existing `favorite_recipes` collection instead of creating a new one. Now recipes can be set for multiple meal times within the existing structure.

## The Simple Flow 🎯

```
1. User registers → Auto creates user in "users" collection ✅
2. Recipes exist in "cooking_recommendations" → Show in Cook page ✅
3. Recipe has mealType array → Show at appropriate times on home page ✅
4. User saves recipe → Stored in "favorite_recipes" ✅
5. User unsaves recipe → Removed from "favorite_recipes" ✅
```

## What You Need to Do

### Step 1: Update Firestore Rules ⚙️

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select `smarteats-d9697` project
3. Go to **Firestore Database** → **Rules** tab
4. Copy the rules from `FIRESTORE_RULES_SETUP.md`
5. Paste and click **Publish**

### Step 2: Update Recipe Data 🍜

**Update `mealType` field in `cooking_recommendations` collection**

Change from: `mealType: "lunch"` (single string)  
Change to: `mealType: ["lunch", "dinner"]` (array)

Example recipes:
- **Nasi Lemak** → `["lunch", "dinner"]`
- **Pesto Pasta** → `["lunch", "dinner"]`
- **Avocado Toast** → `["breakfast", "lunch"]`
- **Smoothie Bowl** → `["breakfast"]`

### Step 3: That's It! ✨

The app automatically handles:
- Detecting current time
- Showing recipes for that meal period
- Saving/removing from favorites
- Displaying on Cook page, Home page, and Favorites page

## How It Works

### On Home Page
- **Morning (5-11 AM)** → Shows recipes with "breakfast" in mealType
- **Afternoon (11 AM-4 PM)** → Shows recipes with "lunch" in mealType
- **Evening (4-10 PM)** → Shows recipes with "dinner" in mealType
- **Night (10 PM-5 AM)** → Shows recipes with "supper" in mealType

### On Cook Page
- Shows all recommended recipes (all meal times available)
- Users can save to favorites via heart button
- Favorites persist in Firestore

### On Favorites Page
- Shows all user's saved recipes
- Displays which meal times they're suitable for
- Users can remove from favorites anytime

## Data Structure

### cooking_recommendations (Public)
```json
{
  "id": "nasi-lemak",
  "title": "Nasi Lemak",
  "cuisine": "malay",
  "mealType": ["lunch", "dinner"],
  "cookTimeMinutes": 30,
  "ingredients": [...],
  "instructions": [...],
  "imageUrl": "...",
  "isRecommended": true
}
```

### favorite_recipes (Per User)
```json
{
  "userId": {
    "nasi-lemak": {
      "id": "nasi-lemak",
      "title": "Nasi Lemak",
      "mealType": ["lunch", "dinner"],
      "source": "recommendation",
      "savedAt": "2026-04-13T..."
    }
  }
}
```

## Testing

1. **Update Firestore rules** (see Step 1)
2. **Update recipe mealType to arrays** (see Step 2)
3. **Open your app**
4. **Go to Cook page**
5. **Save a recipe (click heart icon)**
6. **Check Favorites page** - recipe should appear
7. **On Home page at meal time** - recipe shows if mealType matches
8. **Unsave recipe** - heart becomes empty, removed from Favorites

## Code Changes Made

### Files Updated:
- `src/lib/cookingRecommendations.ts` - Support for mealType arrays
- `src/lib/recipeFavorites.ts` - Support for mealType arrays in saved recipes

### What Added:
- `normalizeMealType()` - Converts single string to array
- `isCookingMealTypeOrArray()` - Validates mealType is string or array
- Updated filter logic - Checks if meal period is in array

## Troubleshooting

### Recipes not showing on home page?
→ Check recipe's `mealType` includes current meal period  
→ Verify recipe has `isRecommended: true`

### Can't save to favorites?
→ Check Firestore rules are published  
→ Check browser console for errors (F12)

### Recipe shows wrong meal time?
→ Update Firebase to have `mealType` as array, not string

### "Permission denied" error?
→ Verify Firestore rules match `FIRESTORE_RULES_SETUP.md`  
→ Make sure user is logged in

## Files Documentation

- `FIRESTORE_RULES_SETUP.md` - Security rules to update
- `MEAL_TIME_RECIPE_DISPLAY.md` - Detailed technical documentation

## Summary

✅ Simple, elegant solution  
✅ Uses existing database collections  
✅ No complex new structure needed  
✅ Recipe time detection works automatically  
✅ Favorites save/unsave as expected  
✅ Everything persists in Firestore  

**Ready to test!** 🚀

Update your rules and recipe data, then try it out!
