import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface RecipeCardProps {
  image: string;
  title: string;
  time: string;
  tag?: string;
  tagColor?: "primary" | "secondary";
}

const RecipeCard = ({ image, title, time, tag, tagColor = "primary" }: RecipeCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className="group flex-shrink-0 w-44 bg-card p-3 rounded-[24px] shadow-card cursor-pointer"
    >
      <div className="aspect-square overflow-hidden rounded-2xl mb-3">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      <h3 className="font-display text-sm font-semibold text-foreground leading-tight line-clamp-2">
        {title}
      </h3>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground text-[10px] rounded-md font-bold uppercase tracking-wider">
          <Clock size={10} />
          {time}
        </span>
        {tag && (
          <span
            className={`px-2 py-1 text-[10px] rounded-md font-bold uppercase tracking-wider ${
              tagColor === "secondary"
                ? "bg-secondary/10 text-secondary"
                : "bg-primary/10 text-primary"
            }`}
          >
            {tag}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default RecipeCard;
