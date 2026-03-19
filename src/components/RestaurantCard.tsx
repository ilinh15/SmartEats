import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";

interface RestaurantCardProps {
  name: string;
  distance: string;
  rating: number;
  image: string;
  badges?: string[];
}

const RestaurantCard = ({ name, distance, rating, image, badges }: RestaurantCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className="flex items-center gap-4 bg-card p-3 rounded-[20px] shadow-card cursor-pointer"
    >
      <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
        <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-base font-semibold text-foreground truncate">{name}</h3>
        <div className="flex items-center gap-3 mt-1 text-muted-foreground text-xs font-body">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {distance}
          </span>
          <span className="flex items-center gap-1">
            <Star size={12} fill="currentColor" className="text-primary" />
            <span className="text-foreground font-medium">{rating}</span>
          </span>
        </div>
        {badges && badges.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] rounded-md font-bold uppercase tracking-wider"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RestaurantCard;
