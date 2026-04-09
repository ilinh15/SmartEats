import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { User, Leaf, LogOut, ChevronRight, Bell, Shield, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged, getAuth } from "firebase/auth";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PREFERENCE_OPTIONS = [
  "Halal",
  "Economy",
  "Gluten-Free",
  "Vegan",
  "Vegetarian",
  "Low Carb",
] as const;

const menuItems = [
  { label: "Notifications", icon: Bell },
  { label: "Privacy & Security", icon: Shield },
  { label: "Help & Support", icon: HelpCircle },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [username, setUsername] = useState("User");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStatusMessage(null);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    if (!auth || !db) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && db) {
        setUserId(user.uid);

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData?.username || user.email || "User");
            setSelectedPreferences(
              Array.isArray(userData?.preferences)
                ? userData.preferences.filter((pref: string) => PREFERENCE_OPTIONS.includes(pref as typeof PREFERENCE_OPTIONS[number]))
                : [],
            );
          }
        } catch (error) {
          console.error("Failed to load profile data:", error);
          setUsername(user.email || "User");
        }
      }
    });

    return unsubscribe;
  }, [auth]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const togglePreference = (pref: string) => {
    setSelectedPreferences((current) =>
      current.includes(pref) ? current.filter((item) => item !== pref) : [...current, pref],
    );
    setStatusMessage(null);
  };

  const handleSavePreferences = async () => {
    if (!userId || !db) {
      setStatusMessage("Unable to save preferences right now.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      await setDoc(
        doc(db, "users", userId),
        { preferences: selectedPreferences, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      setStatusMessage("Preferences updated successfully.");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      setStatusMessage("Could not update preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="relative overflow-hidden rounded-b-[32px] px-5 pt-12 pb-8" style={{ background: "var(--hero-gradient)" }}>
        <div className="absolute top-6 right-[-30px] w-40 h-40 rounded-full bg-primary/5 animate-pulse-soft" />

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center shadow-card">
            <User size={32} className="text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-foreground">{username}</h1>
            <p className="text-sm text-muted-foreground font-body">Home cook & foodie</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6">
        {statusMessage ? (
          <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm">
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        ) : null}

        {/* Dietary Preferences */}
        <div>
          <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2 mb-3">
            <Leaf size={18} className="text-secondary" />
            Dietary Preferences
          </h2>
          <div className="flex flex-wrap gap-2">
            {PREFERENCE_OPTIONS.map((pref) => {
              const active = selectedPreferences.includes(pref);

              return (
                <motion.button
                  key={pref}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => togglePreference(pref)}
                  className={`px-4 py-2 rounded-full text-xs font-medium font-body transition-all ${
                    active
                      ? "bg-secondary text-secondary-foreground shadow-elevated"
                      : "bg-card text-foreground shadow-soft hover:bg-accent"
                  }`}
                >
                  {pref}
                </motion.button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={saving}
              className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving preferences..." : "Save Preferences"}
            </button>
          </div>
        </div>

        {/* Menu */}
        <div className="mt-8 space-y-2">
          {menuItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="w-full flex items-center justify-between bg-card p-4 rounded-2xl shadow-soft"
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-muted-foreground" />
                <span className="text-sm font-body text-foreground">{label}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleLogout}
          className="w-full mt-8 flex items-center justify-center gap-2 h-12 bg-orange-500 text-white rounded-full text-sm font-body font-semibold shadow-lg shadow-orange-500/20 transition duration-200 ease-out hover:bg-orange-600"
        >
          <LogOut size={16} />
          Log Out
        </motion.button>
      </div>
    </div>
  );
};

export default ProfilePage;
