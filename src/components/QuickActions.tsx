import { motion } from "framer-motion";
import { ChefHat, MapPin, CalendarDays, Heart } from "lucide-react";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const actions = [
  { id: "cook", label: "Smart Cook", icon: ChefHat, color: "bg-primary/10 text-primary" },
  { id: "nearby", label: "Nearby Food", icon: MapPin, color: "bg-secondary/10 text-secondary" },
  { id: "planner", label: "Meal Plan", icon: CalendarDays, color: "bg-accent text-accent-foreground" },
  { id: "favorites", label: "Favorites", icon: Heart, color: "bg-primary/10 text-primary" },
];

const QuickActions = ({ onAction }: QuickActionsProps) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map(({ id, label, icon: Icon, color }, i) => (
        <motion.button
          key={id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onAction(id)}
          className="flex flex-col items-center gap-2"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-soft`}>
            <Icon size={22} />
          </div>
          <span className="text-[11px] font-medium text-foreground font-body">{label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default QuickActions;
