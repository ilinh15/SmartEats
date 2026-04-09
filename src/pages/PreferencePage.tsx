import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PreferenceOption = "Halal" | "Economy" | "Vegan" | "Vegetarian" | "Low-carb" | "Gluten-free";

const PREFERENCES: PreferenceOption[] = ["Halal", "Economy", "Vegan", "Vegetarian", "Low-carb", "Gluten-free"];

const PreferencePage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<Set<PreferenceOption>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        navigate("/login");
      }
      setChecking(false);
    });
  }, [navigate]);

  const togglePreference = (pref: PreferenceOption) => {
    const next = new Set(selectedPreferences);
    if (next.has(pref)) next.delete(pref); else next.add(pref);
    setSelectedPreferences(next);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedPreferences.size === 0) {
      setError("Please select at least one preference");
      return;
    }
    if (!userId) {
      setError("Not authenticated");
      return;
    }

    setLoading(true);
    try {
      // Delete existing then insert new
      await supabase.from("user_dietary_preferences").delete().eq("user_id", userId);
      const { error: insertError } = await supabase.from("user_dietary_preferences").insert(
        Array.from(selectedPreferences).map((p) => ({ user_id: userId, preference: p }))
      );
      if (insertError) throw insertError;

      toast.success("Preferences saved successfully!");
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to save preferences.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Your Food Preferences</h1>
          <p className="text-muted-foreground text-sm">Select your dietary preferences to personalize your experience</p>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground mb-4">Select at least 1 preference:</p>
              <div className="grid grid-cols-2 gap-3">
                {PREFERENCES.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => togglePreference(pref)}
                    className={`p-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center min-h-12 ${
                      selectedPreferences.has(pref)
                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                        : "bg-muted text-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {selectedPreferences.has(pref) && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {pref}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {selectedPreferences.size > 0
                  ? `${selectedPreferences.size} preference${selectedPreferences.size !== 1 ? "s" : ""} selected`
                  : "No preferences selected yet"}
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-lg h-11 text-base font-medium">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  Saving...
                </span>
              ) : "Continue"}
            </Button>

            <Button type="button" variant="outline" className="w-full rounded-lg h-11 text-base font-medium" onClick={() => navigate("/")}>
              Skip for now
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">You can update your preferences later in your profile</p>
        </div>
      </div>
    </div>
  );
};

export default PreferencePage;
