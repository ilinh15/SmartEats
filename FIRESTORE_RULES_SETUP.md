# Firestore Security Rules Setup

This guide explains how to update your Firestore security rules.

## Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **smarteats-d9697**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top

## Step 2: Update Your Security Rules

Replace your existing rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Allow authenticated users to read/write their own favorite restaurants
    match /favorite_restaurants/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Allow authenticated users to read/write their own favorite recipes
    match /favorite_recipes/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Public cooking recommendations - read-only for all users
    match /cooking_recommendations/{document=**} {
      allow read: if true;
      allow write: if false;
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Step 3: Publish Rules

1. Click the **Publish** button at the bottom right
2. Confirm the update when prompted
3. Wait for the rules to deploy (usually takes a few seconds)

## Firestore Collection Structure

Your Firestore should have this structure:

```
users (collection)
├── {userId} (document)
│   ├── username: string
│   ├── email: string
│   ├── preferences: array
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp

cooking_recommendations (collection)
├── {recipeId} (document)
│   ├── id: string
│   ├── title: string
│   ├── description: string
│   ├── cuisine: string (chinese, malay, indian, japanese, western)
│   ├── mealType: array ["breakfast", "lunch", "dinner"]
│   ├── cookTimeMinutes: number
│   ├── ingredients: array
│   ├── instructions: array
│   ├── imageUrl: string
│   ├── isRecommended: boolean
│   ├── difficulty: string
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp

favorite_recipes (collection)
├── {userId} (document)
│   └── {recipeId}: {recipe data}

favorite_restaurants (collection)
├── {userId} (document)
│   └── {restaurantId}: {restaurant data}
```

## Testing the Rules

To test if your rules are working:

1. In Firebase Console, go to **Firestore Database**
2. Click **Rules simulator**
3. Test with these scenarios:
   - **Collection path**: `users/{userId}`
   - **Document path**: `cooking_recommendations/{recipeId}`
   - **Request type**: Read (should allow)

## Troubleshooting

### "Permission denied" Error

If you see permission denied errors:

1. **Check Authentication**: Ensure the user is properly authenticated
2. **Check UID Match**: The `userId` in the path must match `request.auth.uid`
3. **Verify Rules**: Make sure you've published the correct rules

### Can't Read Cooking Recommendations

Make sure `cooking_recommendations` rule has `allow read: if true;`

### Rules Taking Time to Apply

Rules can take up to 2 minutes to propagate globally.

## Security Best Practices

- ✅ Only authenticated users can access their own data
- ✅ User IDs in paths act as access control
- ✅ Public cooking data available to all
- ✅ All other access is explicitly denied

## More Information

- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
