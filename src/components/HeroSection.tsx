import { motion } from "framer-motion";
import { Search } from "lucide-react";
import heroImg from "@/assets/hero-breakfast.jpg";

const HeroSection = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const mealSuggestion = hour < 12 ? "Ready for some Cinnamon Oats?" : hour < 17 ? "How about a fresh salad?" : "Time for a cozy dinner?";

  return (
    <section className="relative overflow-hidden rounded-b-[32px]" style={{ background: "var(--hero-gradient)" }}>
      {/* Decorative blobs */}
      <div className="absolute top-10 right-[-40px] w-48 h-48 rounded-full bg-primary/5 animate-pulse-soft" />
      <div className="absolute bottom-[-20px] left-[-30px] w-32 h-32 rounded-full bg-secondary/10 animate-float" />

      <div className="relative px-5 pt-12 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-muted-foreground font-body"
            >
              {greeting}, Alex 👋
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-display font-semibold text-foreground mt-1"
            >
              {mealSuggestion}
            </motion.h1>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-14 h-14 rounded-2xl overflow-hidden shadow-card flex-shrink-0"
            style={{ clipPath: "polygon(10% 0%, 100% 0%, 100% 90%, 90% 100%, 0% 100%, 0% 10%)" }}
          >
            <img src={heroImg} alt="Today's suggestion" className="w-full h-full object-cover" />
          </motion.div>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <div className="flex items-center h-14 bg-card rounded-full shadow-soft px-5 gap-3">
            <Search size={20} className="text-primary flex-shrink-0" />
            <input
              type="text"
              placeholder="Search recipes, restaurants..."
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm font-body outline-none"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
