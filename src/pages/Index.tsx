import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import CookPage from "@/pages/CookPage";
import NearbyPage from "@/pages/NearbyPage";
import FavoritesPage from "@/pages/FavoritesPage";
import ProfilePage from "@/pages/ProfilePage";

type Tab = "home" | "cook" | "nearby" | "favorites" | "profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const handleNavigate = (tab: string) => {
    const validTabs: Tab[] = ["home", "cook", "nearby", "favorites", "profile"];
    if (tab === "planner") {
      setActiveTab("favorites");
      return;
    }
    if (validTabs.includes(tab as Tab)) {
      setActiveTab(tab as Tab);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {activeTab === "home" && <HomePage onNavigate={handleNavigate} />}
      {activeTab === "cook" && <CookPage />}
      {activeTab === "nearby" && <NearbyPage />}
      {activeTab === "favorites" && <FavoritesPage />}
      {activeTab === "profile" && <ProfilePage />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
