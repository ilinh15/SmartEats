# 🚀 Authentication Quick Reference

## Import Statements

```tsx
// Firebase Auth
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Firestore
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

// Your Utils
import { 
  getCurrentUser,
  logoutUser, 
  getUserProfile,
  updateUserPreferences,
  isUserAuthenticated 
} from "@/lib/authUtils";

// Context Hook (optional)
import { useAuth } from "@/hooks/useAuth";
```

---

## Common Tasks

### Get Current User
```tsx
import { getCurrentUser } from "@/lib/authUtils";

const user = getCurrentUser();
console.log(user?.email);  // "user@example.com"
```

### Check if User is Logged In
```tsx
import { isUserAuthenticated } from "@/lib/authUtils";

if (isUserAuthenticated()) {
  // Show app
} else {
  // Redirect to login
  navigate("/login");
}
```

### Logout User
```tsx
import { logoutUser } from "@/lib/authUtils";

const handleLogout = async () => {
  try {
    await logoutUser();
    navigate("/login");
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
```

### Get User Profile from Firestore
```tsx
import { getUserProfile } from "@/lib/authUtils";
import { getCurrentUser } from "@/lib/authUtils";

const user = getCurrentUser();
if (user) {
  const profile = await getUserProfile(user.uid);
  console.log(profile);
  // {
  //   username: "johndoe",
  //   email: "john@example.com",
  //   preferences: ["Vegan", "Gluten-free"],
  //   createdAt: "2024-04-08T..."
  // }
}
```

### Update User Preferences
```tsx
import { updateUserPreferences } from "@/lib/authUtils";
import { getCurrentUser } from "@/lib/authUtils";

const user = getCurrentUser();
if (user) {
  await updateUserPreferences(user.uid, ["Vegan", "Low-carb", "Halal"]);
}
```

### Listen to Auth State Changes
```tsx
import { getAuth } from "firebase/auth";
import { useState, useEffect } from "react";

const Component = () => {
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;  // Cleanup
  }, []);

  return <div>{user ? `Hello ${user.email}` : "Not logged in"}</div>;
};
```

### Validate Email
```tsx
import { isValidEmail } from "@/lib/authUtils";

if (!isValidEmail(email)) {
  setError("Invalid email format");
}
```

### Validate Password Strength
```tsx
import { validatePasswordStrength } from "@/lib/authUtils";

const { isValid, message } = validatePasswordStrength(password);
if (!isValid) {
  setError(message);  // "Password must be at least 6 characters"
}
```

### Handle Firebase Auth Errors
```tsx
import { getAuthErrorMessage } from "@/lib/authUtils";

try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (error: any) {
  const errorMessage = getAuthErrorMessage(error.code);
  setError(errorMessage);
}
```

---

## Using Auth Context Hook

### Setup (in main.tsx)
```tsx
import { AuthProvider } from "@/hooks/useAuth";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

### Use in Component
```tsx
import { useAuth } from "@/hooks/useAuth";

const MyComponent = () => {
  const { user, userProfile, loading, isAuthenticated, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {userProfile?.username}</h1>
      <p>Email: {user?.email}</p>
      <p>Preferences: {userProfile?.preferences.join(", ")}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
};
```

---

## Firebase Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `auth/user-not-found` | Email not registered | Show: "User not found. Please register first." |
| `auth/wrong-password` | Incorrect password | Show: "Incorrect password. Please try again." |
| `auth/invalid-email` | Bad email format | Show: "Invalid email address." |
| `auth/email-already-in-use` | Account exists | Show: "Email already in use. Please log in." |
| `auth/weak-password` | Password < 6 chars | Show: "Password must be at least 6 characters." |
| `auth/too-many-requests` | Too many login tries | Show: "Too many attempts. Try again later." |
| `auth/network-request-failed` | No internet | Show: "Network error. Check your connection." |

---

## Firestore Database Structure

```
Collection: users
├── Document ID: {user.uid}
│   ├── username: string
│   ├── email: string
│   ├── preferences: array
│   ├── createdAt: string (ISO)
│   └── updatedAt: string (ISO)
```

### Example Document
```json
{
  "username": "foodlover123",
  "email": "foodlover@example.com",
  "preferences": ["Halal", "Vegan"],
  "createdAt": "2024-04-08T10:30:00.000Z",
  "updatedAt": "2024-04-08T11:15:00.000Z"
}
```

---

## Route Map

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|--------------|
| `/` | Index | Home page | ✅ Yes |
| `/login` | LoginPage | User login | ❌ No |
| `/register` | RegisterPage | Create account | ❌ No |
| `/preferences` | PreferencePage | Select food prefs | ❌ No* |

*PreferencePage should only be accessed after registration

---

## TypeScript Interfaces

```tsx
// User Auth
interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  // ... other Firebase Auth properties
}

// Firestore User Profile
interface UserProfile {
  username: string;
  email: string;
  preferences: string[];
  createdAt: string;
}

// Auth Context
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
```

---

## Debugging Tips

### Check Current User
```tsx
import { getAuth } from "firebase/auth";

const auth = getAuth();
console.log(auth.currentUser);  // User object or null
```

### Check Firestore Rules
```tsx
// If getting "Permission denied" error:
// 1. Go to Firebase Console → Firestore Rules
// 2. Switch to Test Mode (for development)
// 3. Or update rules to match your auth needs
```

### Monitor Auth State
```tsx
const auth = getAuth();
auth.onAuthStateChanged(user => {
  console.log("Auth state changed:", user?.email);
});
```

### Check Environment Variables
```tsx
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID);  // Should print project ID
```

---

## Best Practices

✅ **DO:**
- Store Firebase config in .env.local
- Always use try-catch with Firebase calls
- Unsubscribe from listeners to prevent memory leaks
- Validate inputs before Firebase calls
- Show user-friendly error messages

❌ **DON'T:**
- Hardcode Firebase credentials
- Store passwords in local storage
- Make Firestore queries in loops
- Forget to cleanup subscriptions
- Show raw Firebase error messages

---

## Environment Variables Template

```bash
# .env.local
VITE_FIREBASE_API_KEY=SKxxx...
VITE_FIREBASE_AUTH_DOMAIN=myapp-xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=myapp-xxx
VITE_FIREBASE_STORAGE_BUCKET=myapp-xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:xxx
```

---

## Testing Checklist

- [ ] Register new user successfully
- [ ] See success message after preference selection
- [ ] Verify user data in Firestore console
- [ ] Login with created account
- [ ] Test invalid email rejection
- [ ] Test password mismatch detection
- [ ] Test empty field validation
- [ ] Test too many login attempts error
- [ ] Test logout functionality
- [ ] Test preference selection UI feedback

---

## Performance Optimization

### Lazy Load Auth Pages
```tsx
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const PreferencePage = lazy(() => import("./pages/PreferencePage"));
```

### Use React Query for User Profile
```tsx
import { useQuery } from "@tanstack/react-query";

const { data: userProfile } = useQuery({
  queryKey: ["userProfile", user?.uid],
  queryFn: () => getUserProfile(user!.uid),
  staleTime: 5 * 60 * 1000,  // 5 minutes
});
```

---

## Helpful Links

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [React Router](https://reactrouter.com)

---

**Last Updated:** April 8, 2024
