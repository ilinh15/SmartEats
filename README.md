# SmartEats

SmartEats is a Vite + React mobile-first food discovery MVP with restaurant recommendations, home cooking recommendations, saved recipes, and recipe detail flows.

## Local Setup

Install dependencies and start the app:

```bash
npm install
npm run dev
```

## Firebase Firestore Setup

The cooking recommendation feature reads from a Firestore collection named `cooking_recommendations`.

1. Create a Firebase project and add a web app.
2. Enable Cloud Firestore.
3. Add the Firebase web config values to `.env`.
4. Create a `cooking_recommendations` collection in Firestore.
5. Add recipe documents using the recipe slug as the document id, for example `tamago-sando`.

Required `.env` variables:

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Optional AI recipe generation variables in `.env`:

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=
VITE_MISTRAL_API_KEY=your_mistral_api_key
VITE_MISTRAL_MODEL=mistral-small-latest
```

The local recipe generator tries Gemini first and automatically falls back to Mistral if Gemini is unavailable or returns unusable output.

Document shape for `cooking_recommendations`:

```json
{
  "title": "Tamago Sando",
  "description": "Creamy Japanese egg salad tucked into pillowy milk bread for a soft, satisfying bite.",
  "cuisine": "japanese",
  "mealType": "breakfast",
  "cookTimeMinutes": 15,
  "ingredients": ["Eggs", "Japanese mayo", "Milk bread", "Butter", "Salt", "White pepper"],
  "instructions": [
    "Boil the eggs until just set, then cool and peel them.",
    "Mash the eggs with Japanese mayo, salt, and white pepper.",
    "Butter the milk bread lightly for richness.",
    "Sandwich the egg filling between the bread and slice neatly."
  ],
  "imageUrl": "https://your-hosted-image-url",
  "isRecommended": true,
  "difficulty": "Easy",
  "tags": ["Soft", "Cafe-style"]
}
```

Notes:

- `cuisine` must be one of `chinese`, `malay`, `indian`, `japanese`, `western`
- `mealType` must be one of `breakfast`, `lunch`, `dinner`, `supper`
- use the Firestore document id as the recipe id
- `imageUrl` must be a hosted URL
- when Firebase config is missing, the app falls back to the local mock recipe dataset in `src/data/cookingRecommendations.ts`

Suggested Firestore rules for a simple read-only client setup:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cooking_recommendations/{document} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Per-User Favorites Storage

Restaurant and recipe favorites are stored per authenticated user in Firestore instead of browser `localStorage`.

Collections:

- `users/{uid}/favorite_restaurants/{restaurantId}`
- `users/{uid}/favorite_recipes/{recipeId}`

This covers favorites from:

- Home restaurant cards
- Nearby restaurant cards
- Home cooking recommendation cards
- Cook AI-generated recipe results

Recommended fields for `favorite_restaurants`:

```json
{
  "name": "Breakfast Corner",
  "address": "Serangoon Road, Singapore",
  "imageUrl": null,
  "distanceText": "0.6 km",
  "rating": 4.5,
  "primaryType": "Cafe",
  "mapsUrl": "https://maps.google.com/?cid=breakfast-corner",
  "isOpenNow": true,
  "savedAt": "2026-04-12T10:00:00.000Z"
}
```

`favorite_recipes` stores the saved recipe snapshot fields from the app plus `savedAt`.

For AI-generated Cook recipes, the app saves a deterministic snapshot document in `favorite_recipes` instead of creating a global recipe record. Firestore creates the subcollection automatically on first save, so you do not need to create it manually.

Recommended rules for user-owned favorites:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /favorite_restaurants/{restaurantId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      match /favorite_recipes/{recipeId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    match /cooking_recommendations/{document} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Verification

```bash
npm test
npm run lint
npm run build
```
