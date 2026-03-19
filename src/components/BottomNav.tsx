import { Home, ChefHat, MapPin, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "home" | "cook" | "nearby" | "favorites" | "profile";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "cook", label: "Cook", icon: ChefHat },
  { id: "nearby", label: "Nearby", icon: MapPin },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "profile", label: "Profile", icon: User },
];

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200",
              activeTab === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon
              size={22}
              className={cn(
                "transition-transform duration-200",
                activeTab === id && "scale-110"
              )}
              fill={activeTab === id ? "currentColor" : "none"}
            />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
