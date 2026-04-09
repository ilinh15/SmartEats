# ✅ Authentication System - Setup Checklist

## Phase 1: Firebase Project Setup

### Step 1: Create Firebase Project
- [ ] Go to https://console.firebase.google.com
- [ ] Click "Add project"
- [ ] Enter project name: `Tasteful Journeys` (or your choice)
- [ ] Leave Google Analytics unchecked (optional)
- [ ] Click "Create project"
- [ ] Wait for project creation (takes ~1 min)

### Step 2: Enable Email/Password Authentication
- [ ] Click "Authentication" in left sidebar
- [ ] Click "Get Started" button
- [ ] Click "Email/Password" provider
- [ ] Toggle "Enable" ON
- [ ] Toggle "Email link (passwordless sign-in)" OFF (we don't need this)
- [ ] Click "Save"

### Step 3: Create Firestore Database
- [ ] Click "Firestore Database" in left sidebar
- [ ] Click "Create Database"
- [ ] Select **"Start in test mode"** (for development)
  - ⚠️ Don't use production mode for testing
- [ ] Select location (e.g., `us-central1` or closest to you)
- [ ] Click "Create"

### Step 4: Get Firebase Configuration
- [ ] Click ⚙️ (gear icon) top right → "Project Settings"
- [ ] Scroll to "Your apps" section
- [ ] Look for Web app (icon: `</>`)
  - If it doesn't exist:
    - Click "Add app"
    - Select "Web"
    - Enter app name: `Tasteful Journeys`
    - Click "Register app"
- [ ] Copy the entire config object shown
  - It looks like:
    ```
    const firebaseConfig = {
      apiKey: "AIz...",
      authDomain: "project.firebaseapp.com",
      projectId: "project-xxx",
      storageBucket: "project.appspot.com",
      messagingSenderId: "123...",
      appId: "1:123:web:abc..."
    };
    ```
- [ ] Save this somewhere safe - you'll need it next

---

## Phase 2: Local Environment Setup

### Step 5: Create .env.local File
- [ ] In your project root (same level as package.json), create file: `.env.local`
- [ ] Copy the values from your Firebase config into this format:

```bash
VITE_FIREBASE_API_KEY=AIz_your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project-xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-xxx
VITE_FIREBASE_STORAGE_BUCKET=your-project-xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

### Step 6: Verify Environment Variables
- [ ] Save `.env.local`
- [ ] ❌ Do NOT commit to git (should be in .gitignore already)
- [ ] In your IDE, you should see syntax highlighting if config is correct
- [ ] Start dev server: `bun dev`
- [ ] Open browser console (F12) and paste: 
  ```js
  console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID)
  ```
- [ ] Should print your project ID (NOT `undefined`)
- [ ] If it prints `undefined`, fix your `.env.local` and restart dev server

---

## Phase 3: Code Verification

### Step 7: Verify Files Were Created
- [ ] Check `/src/pages/LoginPage.tsx` exists
- [ ] Check `/src/pages/RegisterPage.tsx` exists  
- [ ] Check `/src/pages/PreferencePage.tsx` exists
- [ ] Check `/src/lib/authUtils.ts` exists
- [ ] Check `/src/hooks/useAuth.tsx` exists
- [ ] Check `src/App.tsx` has 3 new routes (/login, /register, /preferences)

### Step 8: Verify Firebase Connection
- [ ] Dev server is running
- [ ] Open your app in browser (usually http://localhost:5173/)
- [ ] Open Developer Console (F12)
- [ ] Go to Application tab → Storage → Cookies
- [ ] You should see some Firebase cookies if config is correct
- [ ] If you see errors like "Cannot find firebase module", run: `bun install`

---

## Phase 4: Test Registration Flow

### Step 9: Test Registration
1. [ ] In browser, navigate to: `http://localhost:5173/register`
2. [ ] Create a test account:
   - Username: `testuser123`
   - Email: `testuser@example.com`
   - Password: `Test123456`
   - Confirm: `Test123456`
3. [ ] Click "Register"
4. [ ] You should see loading spinner
5. [ ] After ~2 seconds, should redirect to `/preferences`
   - If error appears:
     - Check browser console for error message
     - Check `.env.local` has valid Firebase credentials
     - Check Firebase project has auth enabled

### Step 10: Test Preference Selection
1. [ ] You're now on `/preferences` page
2. [ ] You should see 6 preference chips:
   - [ ] Halal
   - [ ] Economy
   - [ ] Vegan
   - [ ] Vegetarian
   - [ ] Low-carb
   - [ ] Gluten-free
3. [ ] Click at least 1 chip (should turn orange/selected)
4. [ ] Click "Continue" button
5. [ ] Should see "Preferences saved successfully!" message
6. [ ] After ~1.5 seconds, should redirect to `/login`
   - If error appears:
     - Check browser console
     - Check Firestore security rules (should be in test mode)

### Step 11: Verify Data in Firestore
1. [ ] Go to Firebase Console → Firestore Database
2. [ ] You should see a new collection: `users`
3. [ ] Inside, you should see a document with your UID
4. [ ] Document should contain:
   ```json
   {
     "username": "testuser123",
     "email": "testuser@example.com",
     "preferences": ["Vegan"],  // or whichever you selected
     "createdAt": "2024-04-08T10:30:00.000Z"
   }
   ```
5. [ ] If document is not there:
   - Check browser console for Firestore errors
   - Check Firebase Firestore Rules tab
   - Switch to "Test Mode" if not already

---

## Phase 5: Test Login Flow

### Step 12: Test Login
1. [ ] You're on `/login` page (redirected after preferences)
2. [ ] Enter credentials:
   - Email: `testuser@example.com`
   - Password: `Test123456`
3. [ ] Click "Log In"
4. [ ] You should see loading spinner
5. [ ] Should redirect to home page (`/`)
   - If error:
     - Double-check email and password
     - Make sure they match what you registered with
     - Check browser console for specific error

---

## Phase 6: Test Error Cases

### Step 13: Test Login Errors
1. [ ] Go back to `/login`
2. [ ] Try each error case:

| Test | Input | Expected Result |
|------|-------|-----------------|
| Empty email | (leave blank) | Error: "Email is required" |
| Invalid email | `notanemail` | Error: "Please enter a valid email" |
| Empty password | (leave blank) | Error: "Password is required" |
| Wrong password | correct email + `wrong123` | Error: "Incorrect password" |
| Non-existent email | `nonexistent@test.com` | Error: "User not found" |

- [ ] All error messages appear correctly
- [ ] Button shows loading state while submitting
- [ ] Button disables while loading

### Step 14: Test Registration Errors
1. [ ] Go to `/register`
2. [ ] Try each error case:

| Test | Input | Expected Result |
|------|-------|-----------------|
| Short username | `ab` | Error: "Username must be at least 3 characters" |
| Invalid email | `notanemail` | Error: "Please enter a valid email" |
| Short password | `123` | Error: "Password must be at least 6 characters" |
| Mismatched password | different confirm | Error: "Passwords don't match" |
| Existing email | testuser@example.com | Error: "Email is already in use" |

- [ ] All validation works correctly
- [ ] Clear error messages

### Step 15: Test Preference Errors
1. [ ] Go to `/register` again
2. [ ] Create another test account:
   - Username: `testuser2`
   - Email: `testuser2@example.com`
   - Password: `Test123456`
3. [ ] Redirect to `/preferences`
4. [ ] Click "Continue" WITHOUT selecting any preferences
5. [ ] Should see error: "Please select at least one preference"
6. [ ] Select a preference and try again
7. [ ] Should work

- [ ] Error appears correctly
- [ ] Can retry without issues

---

## Phase 7: Cleanup & Optimization

### Step 16: Firestore Security Rules
1. [ ] Go to Firebase Console → Firestore Database
2. [ ] Click "Rules" tab
3. Currently you're in "test mode" - for production, replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

4. [ ] Click "Publish"
5. [ ] This ensures users can only access their own data

### Step 17: Clean Up Test Accounts (Optional)
1. [ ] Go to Firebase Console → Authentication
2. [ ] You should see your test users listed
3. [ ] You can keep them for testing or delete them
4. [ ] If you delete them, the Firestore documents should be cleaned up manually

---

## Phase 8: Code Integration

### Step 18: Add Auth to Other Pages
Plan which pages need auth:
- [ ] Homepage - requires login
- [ ] Profile page - requires login
- [ ] Settings - requires login

Choose method:
- [ ] Option A: Use `useAuth()` hook (recommended)
- [ ] Option B: Use `getCurrentUser()` from authUtils
- [ ] Option C: Use `onAuthStateChanged()` directly

### Step 19: Example - Protect Homepage
If required, add to your home page component:

```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

export const HomePage = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
    }
  }, [auth.currentUser, navigate]);

  return (
    // ... your home page content
  );
};
```

- [ ] Homepage protected with auth check
- [ ] Non-logged-in users redirected to login

### Step 20: Add Logout Button
Add logout to your profile/menu:

```tsx
import { logoutUser } from "@/lib/authUtils";

const handleLogout = async () => {
  await logoutUser();
  window.location.href = "/login";
};

return <button onClick={handleLogout}>Logout</button>;
```

- [ ] Logout button added to profile/menu
- [ ] Clicking logout signs out user and redirects to login

---

## Phase 9: Final Testing

### Step 21: Full Flow Test
1. [ ] Clear browser cache (Ctrl+Shift+Delete)
2. [ ] Restart dev server (Ctrl+C, then `bun dev`)
3. [ ] Go to `/register`
4. [ ] Create new account
5. [ ] Set preferences
6. [ ] Login page appears (auto-redirect)
7. [ ] Login with new account
8. [ ] Home page appears
9. [ ] Click logout (if implemented)
10. [ ] Back to login
11. [ ] Login again
12. [ ] All working ✅

- [ ] Complete flow works without errors

### Step 22: Mobile Testing
1. [ ] Resize browser to mobile (375px width)
2. [ ] Test all pages:
   - [ ] Login page responsive
   - [ ] Register page responsive
   - [ ] Preference page responsive
   - [ ] All buttons clickable
   - [ ] Text readable
   - [ ] No overflow

- [ ] All mobile responsive

### Step 23: Cross-Browser Testing
Test in multiple browsers:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

- [ ] All browsers work

---

## Phase 10: Documentation & Backup

### Step 24: Read Documentation
- [ ] Read [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed guide
- [ ] Read [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) for integration
- [ ] Read [AUTH_QUICK_REFERENCE.md](./AUTH_QUICK_REFERENCE.md) for quick lookup
- [ ] Read [AUTH_VISUAL_FLOWS.md](./AUTH_VISUAL_FLOWS.md) for visual diagrams

### Step 25: Backup & Version Control
- [ ] Commit your code to git (excluding .env.local)
- [ ] Create a backup of your Firebase credentials (secure location)
- [ ] Document: project name, Firebase project ID, database URL

---

## ✅ Everything Done!

If you've completed all steps, you now have:

✅ Firebase authentication working
✅ Firestore data storage working
✅ Registration flow complete
✅ Login flow complete
✅ Preference selection complete
✅ All pages responsive
✅ Error handling tested
✅ Security rules configured

**You're ready to deploy! 🚀**

---

## 🐛 Troubleshooting

### Common Issues & Solutions

**Issue: "Cannot find module firebase"**
```bash
bun install firebase
```

**Issue: "VITE_FIREBASE_API_KEY is undefined"**
- Check `.env.local` exists
- Check file has correct format
- Restart dev server

**Issue: "Permission denied" in Firestore**
- Go to Firestore → Rules
- Switch to "Test mode"
- Or update rules for authenticated users

**Issue: "User not found" on login**
- Make sure email matches registration exactly
- Check if user was actually created in Firebase Console

**Issue: Preferences not saving**
- Check Firestore rules allow writes
- Check browser console for specific Firestore errors
- Verify user is authenticated

**Issue: Page not showing**
- Check import path is correct
- Check component is exported as default
- Check route path is correct in App.tsx

---

## 📞 Need Help?

1. **Check browser console** (F12) for error messages
2. **Check Firebase Console** auth and Firestore tabs
3. **Review logs** at https://console.firebase.google.com
4. **Read documentation files** in this project
5. **Check Firebase status** at status.firebase.io

---

**Checklist Status:** ___ / 118 items completed  
**Estimated Time:** 1-2 hours total  
**Difficulty:** Beginner to Intermediate  

Good luck! 🎉
