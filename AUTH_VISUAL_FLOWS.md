# 🎨 Authentication System - Visual Flow Diagrams

## Complete User Journey

```
START
  │
  ├─→ [User visits /] ─→ [Logged in?] ─→ YES ─→ [Show Home]
  │                         │
  │                         NO
  │                         ↓
  │                    [Redirect to /login]
  │
  └─→ [/login page]
      │
      ├─→ [Has account?] ─→ YES ─→ [Enter credentials]
      │                           │
      │                           ├─→ [Valid?] ─→ YES ─→ [Sign in] ─→ [→ HOME] ✅
      │                           │       NO
      │                           └─→ [Show error]
      │
      └─→ [NO account] ─→ [Click register] ─→ [/register]
                              │
                              ├─→ [Fill form]
                              │
                              ├─→ [All valid?]
                              │   NO ─→ [Show error] ─→ [Try again]
                              │
                              └─→ YES ─→ [Create Firebase Auth] 
                                      ↓
                                   [/preferences]
                                      ↓
                                   [Select prefs]
                                      ↓
                                   [Save to Firestore]
                                      ↓
                                   [Success message]
                                      ↓
                                   [Redirect to /login] ✅
```

---

## Login Flow

```
                    ┌─────────────────────┐
                    │    LOGIN PAGE       │
                    │    (/login)         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Enter Email &      │
                    │  Password           │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Validate Inputs    │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         Empty │         Invalid │            │
          Field│         Email  │        Valid
                │              │              │
                ▼              ▼              ▼
            [Error]       [Error]       [Firebase Auth]
                │              │              │
                │              │              ├─→ User not found
                │              │              │   └─→ [Error]
                │              │              │
                │              │              ├─→ Wrong password
                │              │              │   └─→ [Error]
                │              │              │
                │              │              ├─→ Too many attempts
                │              │              │   └─→ [Error]
                │              │              │
                │              │              └─→ Success
                │              │                  └─→ [Redirect /] ✅
                │              │
                └──────────────┴──────────────┘
                         │
                    [Retry login]
```

---

## Registration Flow

```
                  ┌──────────────────┐
                  │  REGISTER PAGE   │
                  │ (/register)      │
                  └────────┬─────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      [Username]      [Email]        [Password]
      
          └────────────────┬────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Validate All   │
                  └────────┬────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    Username   Email    Password       Confirm
    too short  invalid  too short      mismatch
        │        │         │              │
        ▼        ▼         ▼              ▼
    [Error]  [Error]  [Error]       [Error]
        │        │         │              │
        └────────┼─────────┴──────────────┘
                 │
           [Retry registration]
           
           OR
           
           [All valid] ─→ [Create Firebase Auth]
                             │
                   ┌─────────┼─────────┐
                   │         │         │
              Success    Email        Another
                       Already        User
                       Exists         Error
                   │         │         │
                   │         ▼         ▼
                   │      [Error]   [Error]
                   │         │       │
                   └─────────┴───────┘
                         │
                      [Try again]
                      
                      OR
                      
        [Success] ─→ Store username in session
                  ─→ [Redirect to /preferences] ✅
```

---

## Preference Setup Flow

```
                ┌──────────────────────┐
                │  PREFERENCE PAGE     │
                │  (/preferences)      │
                └──────────┬───────────┘
                           │
                 ┌─────────▼─────────┐
                 │  Display Options  │
                 │  - Halal          │
                 │  - Economy        │
                 │  - Vegan          │
                 │  - Vegetarian     │
                 │  - Low-carb       │
                 │  - Gluten-free    │
                 └──────────┬────────┘
                            │
                 ┌──────────▼─────────┐
                 │  User Selects      │
                 │  Preferences       │
                 │  (Multi-select)    │
                 └──────────┬────────┘
                            │
                 ┌──────────▼─────────┐
                 │  Click Continue    │
                 └──────────┬────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Check: ≥1 selected?│
                 └──────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
            No (0)        Yes (1+)
              │             │
              ▼             ▼
          [Error]       [Save to
           msg]         Firestore]
            │                │
            │     ┌──────────▼────────────┐
            │     │ Update user document  │
            │     │ Collection: users     │
            │     │ Doc ID: {uid}         │
            │     │ username: ...         │
            │     │ email: ...            │
            │     │ preferences: [...]    │
            │     └──────────┬────────────┘
            │                │
            │              Success?
            │                │
            │       ┌────────┼────────┐
            │       │        │        │
            │       YES      │        NO
            │       │        │        │
            │       ▼        ▼        ▼
            │   [Allow]   [Error]  [Error]
            │   Continue   msg      msg
            │       │        │
            └───────┼────────┘
                    │
            [Show Success msg]
                    │
              (Wait 1.5 sec)
                    │
        [Redirect to /login] ✅
```

---

## Data Storage

```
FIREBASE PROJECT
│
├─ Authentication
│  └─ Users
│     ├─ user1@example.com
│     │  └─ UID: abc123xyz
│     ├─ user2@example.com
│     │  └─ UID: def456uvw
│     └─ user3@example.com
│        └─ UID: ghi789klm
│
└─ Firestore Database
   └─ users (collection)
      ├─ abc123xyz (document)
      │  ├─ username: "johndoe"
      │  ├─ email: "john@example.com"
      │  ├─ preferences: ["Vegan", "Gluten-free"]
      │  └─ createdAt: "2024-04-08T10:30:00Z"
      │
      ├─ def456uvw (document)
      │  ├─ username: "sallyc"
      │  ├─ email: "sally@example.com"
      │  ├─ preferences: ["Halal", "Low-carb"]
      │  └─ createdAt: "2024-04-08T11:15:00Z"
      │
      └─ ghi789klm (document)
         ├─ username: "marksmith"
         ├─ email: "mark@example.com"
         ├─ preferences: ["Economy", "Vegetarian"]
         └─ createdAt: "2024-04-08T12:00:00Z"
```

---

## State Management (with useAuth Hook)

```
                    ┌──────────────┐
                    │ AuthProvider │
                    └───────┬──────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
        [user]        [userProfile]   [loading]
        (User|null)   (Profile|null)  (boolean)
            │               │               │
            └───────┬───────┴───────┬───────┘
                    │
         ┌──────────▼──────────┐
         │   AuthContext       │
         │   (Context API)     │
         └──────────┬──────────┘
                    │
        (Available to all components)
                    │
         ┌──────────▼──────────┐
         │   useAuth() hook    │
         │                     │
         │ Returns:            │
         │ - user              │
         │ - userProfile       │
         │ - loading           │
         │ - logout()          │
         │ - isAuthenticated   │
         └─────────────────────┘
```

---

## Component Structure

```
App.tsx
├─ BrowserRouter
│  └─ Routes
│     ├─ / (Index.tsx)
│     │  ├─ HomePage
│     │  ├─ CookPage
│     │  ├─ NearbyPage
│     │  ├─ FavoritesPage
│     │  ├─ ProfilePage
│     │  └─ BottomNav
│     │
│     ├─ /recipes/:recipeId (RecipeDetailPage)
│     │
│     ├─ /login (LoginPage)
│     │  ├─ Input (email)
│     │  ├─ Input (password)
│     │  ├─ Button (login)
│     │  └─ Link (register)
│     │
│     ├─ /register (RegisterPage)
│     │  ├─ Input (username)
│     │  ├─ Input (email)
│     │  ├─ Input (password)
│     │  ├─ Input (confirm)
│     │  ├─ Button (register)
│     │  └─ Link (login)
│     │
│     ├─ /preferences (PreferencePage)
│     │  ├─ Chip (Halal)
│     │  ├─ Chip (Economy)
│     │  ├─ Chip (Vegan)
│     │  ├─ Chip (Vegetarian)
│     │  ├─ Chip (Low-carb)
│     │  ├─ Chip (Gluten-free)
│     │  └─ Button (continue)
│     │
│     └─ * (NotFound)
```

---

## Error Handling Flow

```
                    [User Action]
                          │
                          ▼
                  [Input Validation]
                          │
          ┌───────────────┼───────────────┐
          │               │               │
        FAIL            PASS
          │               │
          ▼               ▼
    [Local Error]  [Firebase Call]
    (e.g., empty)        │
          │       ┌───────┼───────┐
          │       │       │       │
          │   SUCCESS   FAIL   NETWORK
          │       │       │       │
          │       │       ▼       ▼
          │       │   [Get Error] [Offline]
          │       │    Code
          │       │       │
          │       │    [Map to User
          │       │     Friendly Msg]
          │       │       │
          └───────┼───────┘
                  │
            [Display Error]
                  │
         [User Retries Action]
```

---

## Authentication State Timeline

```
App Load
│
├─→ onAuthStateChanged() listener
│   activated
│   │
│   ├─→ Check browser auth (localStorage)
│   │
│   ├─→ If user found:
│   │   └─→ Fetch user profile from Firestore
│   │       └─→ Set state [user, loaded]
│   │
│   └─→ If no user:
│       └─→ Set state [no user, loaded]
│
└─→ Components render with auth state
   │
   ├─→ If loaded & user:
   │   └─→ Show app
   │
   ├─→ If loaded & no user:
   │   └─→ Show /login
   │
   └─→ If loading:
       └─→ Show spinner
```

---

## File Dependencies

```
LoginPage.tsx
    ├─ firebase/auth
    │  ├─ getAuth
    │  └─ signInWithEmailAndPassword
    ├─ components/ui/button
    ├─ components/ui/input
    └─ react-router-dom

RegisterPage.tsx
    ├─ firebase/auth
    │  └─ createUserWithEmailAndPassword
    ├─ components/ui/button
    ├─ components/ui/input
    └─ react-router-dom

PreferencePage.tsx
    ├─ firebase/auth
    │  └─ getAuth
    ├─ firebase/firestore
    │  ├─ getFirestore
    │  ├─ setDoc
    │  └─ doc
    ├─ components/ui/button
    └─ react-router-dom

authUtils.ts
    ├─ firebase/auth
    └─ firebase/firestore

useAuth.tsx
    ├─ firebase/auth
    │  ├─ getAuth
    │  ├─ onAuthStateChanged
    │  └─ signOut
    ├─ authUtils.ts (getUserProfile)
    └─ React Context API
```

---

## Quick Decision Tree

```
START
│
├─ Is user on /login or /register?
│  ├─ YES → Allow access
│  └─ NO → Continue
│
├─ Is user logged in? (check auth state)
│  ├─ YES → Allow home page access
│  └─ NO → Redirect to /login
│
├─ Is user on /preferences?
│  ├─ YES → Only allow if just registered
│  └─ NO → Continue
│
└─ Show appropriate UI
   └─ Done ✅
```

---

**Last Updated:** April 8, 2024
