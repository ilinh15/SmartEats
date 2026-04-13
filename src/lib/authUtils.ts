/**
 * Authentication Utilities
 * Common functions for auth operations used throughout the app
 */

import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

export const BUDGET_PREFERENCES = ["Budget-friendly", "Moderate", "Premium"] as const;

export type BudgetPreference = (typeof BUDGET_PREFERENCES)[number];

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  mealReminders: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  push: true,
  email: true,
  mealReminders: true,
};

export interface UserProfile {
  username: string;
  email: string;
  preferences: string[];
  budgetPreference?: BudgetPreference | null;
  notificationSettings?: NotificationSettings;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get current authenticated user
 * @returns User object from Firebase Auth or null
 */
export const getCurrentUser = () => {
  const auth = getAuth();
  return auth.currentUser;
};

/**
 * Sign out current user
 * @returns Promise that resolves when sign out is complete
 */
export const logoutUser = async (): Promise<void> => {
  const auth = getAuth();
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

/**
 * Get user profile from Firestore
 * @param uid - User ID from Firebase Auth
 * @returns UserProfile object or null if not found
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, "users", uid));

    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

/**
 * Update user preferences
 * @param uid - User ID
 * @param preferences - Array of preference strings
 */
export const updateUserPreferences = async (
  uid: string,
  preferences: string[]
): Promise<void> => {
  try {
    const db = getFirestore();
    await updateDoc(doc(db, "users", uid), {
      preferences,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    throw error;
  }
};

/**
 * Update username
 * @param uid - User ID
 * @param username - New username
 */
export const updateUsername = async (uid: string, username: string): Promise<void> => {
  try {
    const db = getFirestore();
    await updateDoc(doc(db, "users", uid), {
      username,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating username:", error);
    throw error;
  }
};

/**
 * Check if user is authenticated
 * @returns Boolean indicating auth status
 */
export const isUserAuthenticated = (): boolean => {
  const user = getCurrentUser();
  return !!user;
};

/**
 * Get user email
 * @returns User email string or empty string
 */
export const getUserEmail = (): string => {
  const user = getCurrentUser();
  return user?.email || "";
};

/**
 * Subscribe to authentication state changes
 * @param callback - Function called when auth state changes
 * @returns Unsubscribe function
 */
export const subscribeToAuthStateChanges = (
  callback: (user: any) => void
): (() => void) => {
  const auth = getAuth();
  return auth.onAuthStateChanged(callback);
};

/**
 * Get user preferences
 * @returns Array of preference strings
 */
export const getUserPreferences = async (uid: string): Promise<string[]> => {
  try {
    const profile = await getUserProfile(uid);
    return profile?.preferences || [];
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return [];
  }
};

/**
 * Check if user has specific preference
 * @param uid - User ID
 * @param preference - Preference to check
 * @returns Boolean indicating if user has preference
 */
export const userHasPreference = async (
  uid: string,
  preference: string
): Promise<boolean> => {
  const preferences = await getUserPreferences(uid);
  return preferences.includes(preference);
};

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns Boolean indicating valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isBudgetPreference = (value: string): value is BudgetPreference =>
  BUDGET_PREFERENCES.includes(value as BudgetPreference);

export const normalizeNotificationSettings = (value?: Partial<NotificationSettings> | null): NotificationSettings => ({
  push: typeof value?.push === "boolean" ? value.push : DEFAULT_NOTIFICATION_SETTINGS.push,
  email: typeof value?.email === "boolean" ? value.email : DEFAULT_NOTIFICATION_SETTINGS.email,
  mealReminders:
    typeof value?.mealReminders === "boolean" ? value.mealReminders : DEFAULT_NOTIFICATION_SETTINGS.mealReminders,
});

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid boolean and message string
 */
export const validatePasswordStrength = (
  password: string
): { isValid: boolean; message: string } => {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters",
    };
  }

  // Optional: Add more strength checks
  // if (!/[A-Z]/.test(password)) {
  //   return { isValid: false, message: "Password must contain uppercase letter" };
  // }
  // if (!/[0-9]/.test(password)) {
  //   return { isValid: false, message: "Password must contain a number" };
  // }

  return { isValid: true, message: "Password is strong" };
};

/**
 * Format Firebase Auth error messages
 * @param errorCode - Firebase error code
 * @returns Human readable error message
 */
export const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    "auth/user-not-found": "User not found. Please register first.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Invalid email address.",
    "auth/email-already-in-use": "Email is already in use. Please log in or use a different email.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/too-many-requests": "Too many login attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your internet connection.",
    "auth/operation-not-allowed": "This operation is not allowed.",
    "auth/invalid-credential": "Invalid credentials. Please try again.",
    "auth/requires-recent-login": "Please log in again before making this security-sensitive change.",
  };

  return errorMessages[errorCode] || "An error occurred. Please try again.";
};
