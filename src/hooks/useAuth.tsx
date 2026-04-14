/**
 * Authentication Context with Hook
 * 
 * Optional: Use this for global auth state management
 * 
 * USAGE IN APP:
 * 1. Wrap your app with <AuthProvider> in main.tsx:
 *    
 *    import { AuthProvider } from "@/hooks/useAuth"
 *    
 *    <AuthProvider>
 *      <App />
 *    </AuthProvider>
 * 
 * 2. Use in any component:
 *    
 *    import { useAuth } from "@/hooks/useAuth"
 *    
 *    const MyComponent = () => {
 *      const { user, loading, logout } = useAuth()
 *      
 *      if (loading) return <div>Loading...</div>
 *      if (!user) return <div>Not logged in</div>
 *      
 *      return <div>Welcome {user.email}</div>
 *    }
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { getUserProfile, type UserProfile } from "@/lib/authUtils";

interface UserData {
  user: User | null;
  profile: UserProfile | null;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component - Wrap your app with this
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // Load user profile from Firestore if logged in
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error: unknown) {
          console.error("Error loading user profile:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [auth]);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error: unknown) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use Auth Context
 * Usage: const { user, loading, logout } = useAuth()
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Higher Order Component to protect routes
 * Usage: <ProtectedRoute element={<YourPage />} />
 */
export const ProtectedRoute: React.FC<{
  element: React.ReactNode;
}> = ({ element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login
    window.location.href = "/login";
    return null;
  }

  return element;
};
