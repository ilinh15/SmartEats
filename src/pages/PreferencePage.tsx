import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, type User, FirebaseError } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

type PreferenceOption = "Halal" | "Economy" | "Vegan" | "Vegetarian" | "Low-carb" | "Gluten-free";

const PREFERENCES: PreferenceOption[] = ["Halal", "Economy", "Vegan", "Vegetarian", "Low-carb", "Gluten-free"];

const PreferencePage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [existingUsername, setExistingUsername] = useState<string | null>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<Set<PreferenceOption>>(new Set());
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      setError("Firebase is not configured. Please check your .env.local file.");
      setCurrentUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

        if (db) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              setExistingUsername(userDoc.data()?.username || null);
            }
          } catch (fetchError) {
            console.error("Failed to load existing username:", fetchError);
          }
        }
      } else {
        setCurrentUser(null);
        navigate("/login");
      }
    });

    return unsubscribe;
  }, [navigate]);

  const togglePreference = (pref: PreferenceOption) => {
    const newPreferences = new Set(selectedPreferences);
    if (newPreferences.has(pref)) {
      newPreferences.delete(pref);
    } else {
      newPreferences.add(pref);
    }
    setSelectedPreferences(newPreferences);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (selectedPreferences.size === 0) {
      setError("Please select at least one preference");
      return;
    }

    if (currentUser === undefined) {
      setError("Waiting for login state. Please try again in a moment.");
      return;
    }

    if (!currentUser) {
      setError("User not authenticated");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const username =
        sessionStorage.getItem("newUserUsername") || existingUsername || currentUser.displayName || "User";
      const email = sessionStorage.getItem("newUserEmail") || currentUser.email || "";

      // Save user data to Firestore
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          username,
          email,
          preferences: Array.from(selectedPreferences),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      setSuccessMessage("Preferences saved successfully!");

      // Clear session storage
      sessionStorage.removeItem("newUserUsername");
      sessionStorage.removeItem("newUserEmail");

      navigate("/", { replace: true });
    } catch (err: unknown) {
      const error = err as FirebaseError;
      if (error.code === "permission-denied") {
        setError("Missing or insufficient permissions. Please make sure Firestore rules allow authenticated users to write to /users/{userId}.");
      } else {
        setError(error.message || "Failed to save preferences. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/");
  };

  if (currentUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Your Food Preferences
          </h1>
          <p className="text-muted-foreground text-sm">
            Select your dietary preferences to personalize your experience
          </p>
        </div>

        {/* Preferences Card */}
        <div className="bg-card rounded-2xl shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preference Chips */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground mb-4">
                Select at least 1 preference:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PREFERENCES.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => togglePreference(pref)}
                    className={`
                      p-4 rounded-xl text-sm font-medium transition-all duration-200
                      flex items-center justify-center min-h-12
                      ${
                        selectedPreferences.has(pref)
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : "bg-muted text-foreground hover:bg-accent"
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      {selectedPreferences.has(pref) && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {pref}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Count */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {selectedPreferences.size > 0
                  ? `${selectedPreferences.size} preference${selectedPreferences.size !== 1 ? "s" : ""} selected`
                  : "No preferences selected yet"}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || currentUser === undefined}
              className="w-full rounded-lg h-11 text-base font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"></div>
                  Saving...
                </span>
              ) : (
                "Continue"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg h-11 text-base font-medium"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </form>

          {/* Info */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            You can update your preferences later in your profile
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreferencePage;
