import { motion } from "framer-motion";
import { ArrowUpRight, Heart, ImageOff, MapPin, Star } from "lucide-react";

interface PhotoAttribution {
  displayName: string;
  uri?: string;
}

interface RestaurantCardProps {
  name: string;
  address?: string;
  badges?: string[];
  distance?: string;
  image?: string;
  imageUrl?: string | null;
  mapsLabel?: string;
  mapsUrl?: string;
  photoAttributions?: PhotoAttribution[];
  rating?: number | null;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

const RestaurantCard = ({
  name,
  address,
  badges,
  distance,
  image,
  imageUrl,
  mapsLabel = "Open in Google Maps",
  mapsUrl,
  photoAttributions,
  rating,
  isFavorited = false,
  onToggleFavorite,
}: RestaurantCardProps) => {
  const imageSource = imageUrl ?? image;

  const content = (
    <>
      <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-accent/60 flex items-center justify-center">
        {imageSource ? (
          <img src={imageSource} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageOff size={18} />
            <span className="text-[10px] font-body font-medium">No photo</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 pr-12">
        <h3 className="font-display text-base font-semibold text-foreground truncate">{name}</h3>
        {address && <p className="text-xs font-body text-muted-foreground mt-1 line-clamp-2">{address}</p>}
        <div className="flex items-center gap-3 mt-2 text-muted-foreground text-xs font-body flex-wrap">
          {distance && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {distance}
            </span>
          )}
          {typeof rating === "number" && (
            <span className="flex items-center gap-1">
              <Star size={12} fill="currentColor" className="text-primary" />
              <span className="text-foreground font-medium">{rating.toFixed(1)}</span>
            </span>
          )}
        </div>
        {badges && badges.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
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
        {photoAttributions && photoAttributions.length > 0 && (
          <div className="mt-2 text-[10px] font-body text-muted-foreground">
            Photo:
            {" "}
            {photoAttributions.map((attribution, index) => (
              <span key={`${attribution.displayName}-${index}`}>
                {index > 0 && ", "}
                {attribution.uri ? (
                  <a
                    href={attribution.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {attribution.displayName}
                  </a>
                ) : (
                  attribution.displayName
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
      <div className="relative bg-card p-3 rounded-[20px] shadow-card">
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorited ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
            className={`absolute top-3 right-3 inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors ${
              isFavorited
                ? "bg-primary text-primary-foreground border-primary shadow-soft"
                : "bg-background/90 text-muted-foreground border-border hover:text-primary hover:border-primary/40"
            }`}
          >
            <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
          </button>
        )}
        <div className="flex items-start gap-4">
          {content}
        </div>
        {mapsUrl && (
          <div className="mt-3 pt-3 border-t border-border">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-body font-medium hover:bg-primary/15 transition-colors"
            >
              {mapsLabel}
              <ArrowUpRight size={14} />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RestaurantCard;
