import { motion } from "framer-motion";
import { Clock, Heart, ImageOff } from "lucide-react";
import {
  COOKING_CUISINE_LABELS,
  formatCookTimeMinutes,
} from "@/lib/cookingRecommendations";
import { cn } from "@/lib/utils";
import type { FavoriteRecipeInput } from "@/lib/recipeFavorites";

interface CookingRecommendationCardProps {
  recommendation: FavoriteRecipeInput;
  className?: string;
  isFavorited?: boolean;
  compact?: boolean;
  onSelect?: () => void;
  onToggleFavorite?: (recommendation: FavoriteRecipeInput) => void;
}

const CookingRecommendationCard = ({
  recommendation,
  className,
  isFavorited = false,
  compact = false,
  onSelect,
  onToggleFavorite,
}: CookingRecommendationCardProps) => {
  const cuisineLabel =
    "cuisineLabel" in recommendation && recommendation.cuisineLabel
      ? recommendation.cuisineLabel
      : recommendation.cuisine
        ? COOKING_CUISINE_LABELS[recommendation.cuisine]
        : undefined;
  const cookTimeLabel =
    "cookTimeLabel" in recommendation && recommendation.cookTimeLabel
      ? recommendation.cookTimeLabel
      : typeof recommendation.cookTimeMinutes === "number"
        ? formatCookTimeMinutes(recommendation.cookTimeMinutes)
        : undefined;
  const cardTags = Array.from(
    new Set(
      [
        ...(("tags" in recommendation && recommendation.tags) || []),
        "tag" in recommendation ? recommendation.tag : undefined,
      ].filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0),
    ),
  ).slice(0, 2);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!onSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative overflow-hidden rounded-[24px] bg-card shadow-card transition-shadow",
        onSelect && "cursor-pointer",
        className,
      )}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? `Open ${recommendation.title} recipe details` : undefined}
    >
      {compact ? (
        <div className="flex items-start gap-4 p-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-accent/60 flex-shrink-0 flex items-center justify-center">
            {recommendation.imageUrl ? (
              <img
                src={recommendation.imageUrl}
                alt={recommendation.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageOff size={18} />
                <span className="text-[10px] font-body font-medium">No image</span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {cookTimeLabel && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                  <Clock size={10} />
                  {cookTimeLabel}
                </span>
              )}
              {cuisineLabel && (
                <span className="rounded-md bg-secondary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {cuisineLabel}
                </span>
              )}
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-display font-semibold text-foreground">
              {recommendation.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-xs font-body text-muted-foreground">
              {recommendation.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-body text-muted-foreground">
              {recommendation.difficulty && <span>{recommendation.difficulty}</span>}
              {cardTags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative aspect-[4/3] overflow-hidden bg-accent/60">
            {recommendation.imageUrl ? (
              <img
                src={recommendation.imageUrl}
                alt={recommendation.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff size={20} />
                <span className="text-xs font-body font-medium">No image available</span>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              {cookTimeLabel && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                  <Clock size={10} />
                  {cookTimeLabel}
                </span>
              )}
              {cuisineLabel && (
                <span className="rounded-md bg-secondary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {cuisineLabel}
                </span>
              )}
            </div>

            <h3 className="mt-3 line-clamp-2 text-base font-display font-semibold text-foreground">
              {recommendation.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm font-body text-muted-foreground">
              {recommendation.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-body text-muted-foreground">
              {recommendation.difficulty && <span>{recommendation.difficulty}</span>}
              {cardTags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2.5 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(recommendation);
          }}
          aria-label={
            isFavorited
              ? `Remove ${recommendation.title} from favorites`
              : `Save ${recommendation.title} to favorites`
          }
          className={cn(
            "absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
            isFavorited
              ? "border-primary bg-primary text-primary-foreground shadow-soft"
              : "border-border bg-background/90 text-muted-foreground hover:border-primary/40 hover:text-primary",
          )}
        >
          <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
        </button>
      )}
    </motion.article>
  );
};

export default CookingRecommendationCard;
