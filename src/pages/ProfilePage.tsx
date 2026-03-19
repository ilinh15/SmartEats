import { motion } from "framer-motion";
import { User, Leaf, LogOut, ChevronRight, Bell, Shield, HelpCircle } from "lucide-react";

const preferences = [
  { label: "Vegetarian", active: true },
  { label: "Halal", active: false },
  { label: "Vegan", active: false },
  { label: "Gluten-Free", active: true },
  { label: "Low Carb", active: false },
];

const menuItems = [
  { label: "Notifications", icon: Bell },
  { label: "Privacy & Security", icon: Shield },
  { label: "Help & Support", icon: HelpCircle },
];

const ProfilePage = () => {
  return (
    <div className="pb-20 min-h-screen">
      <div className="relative overflow-hidden rounded-b-[32px] px-5 pt-12 pb-8" style={{ background: "var(--hero-gradient)" }}>
        <div className="absolute top-6 right-[-30px] w-40 h-40 rounded-full bg-primary/5 animate-pulse-soft" />

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center shadow-card">
            <User size={32} className="text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-foreground">Alex Johnson</h1>
            <p className="text-sm text-muted-foreground font-body">Home cook & foodie</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6">
        {/* Dietary Preferences */}
        <div>
          <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2 mb-3">
            <Leaf size={18} className="text-secondary" />
            Dietary Preferences
          </h2>
          <div className="flex flex-wrap gap-2">
            {preferences.map((pref) => (
              <motion.button
                key={pref.label}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-xs font-medium font-body transition-all ${
                  pref.active
                    ? "bg-secondary text-secondary-foreground shadow-elevated"
                    : "bg-card text-foreground shadow-soft"
                }`}
              >
                {pref.label}
              </motion.button>
            ))}
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
          whileTap={{ scale: 0.98 }}
          className="w-full mt-8 flex items-center justify-center gap-2 h-12 bg-muted text-muted-foreground rounded-full text-sm font-body font-medium"
        >
          <LogOut size={16} />
          Log Out
        </motion.button>
      </div>
    </div>
  );
};

export default ProfilePage;
