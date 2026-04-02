import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LocateFixed, MapPin, Search, SlidersHorizontal } from "lucide-react";
import RestaurantCard from "@/components/RestaurantCard";
import { getCurrentPosition, type Coordinates, type GeolocationFailure } from "@/lib/geolocation";
import { nearbyFilters, searchNearbyPlaces, searchPlacesByArea, type NearbyFilter, type NearbyPlace } from "@/lib/nearbyPlaces";

type LocationState = "idle" | "requesting" | "granted" | "denied" | "error";

const SEARCH_RADIUS_METERS = 1800;

interface NearbyPageProps {
  favoriteRestaurantIds: ReadonlySet<string>;
  onToggleFavoriteRestaurant: (restaurant: NearbyPlace) => void;
}

const NearbyPage = ({ favoriteRestaurantIds, onToggleFavoriteRestaurant }: NearbyPageProps) => {
  const [activeFilter, setActiveFilter] = useState<NearbyFilter>("All");
  const [searchInput, setSearchInput] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationRequestNonce, setLocationRequestNonce] = useState(0);

  useEffect(() => {
    let ignore = false;

    const requestLocation = async () => {
      setLocationState("requesting");
      setLocationError(null);

      try {
        const position = await getCurrentPosition();

        if (ignore) {
          return;
        }

        setCoordinates(position);
        setLocationState("granted");
      } catch (error) {
        if (ignore) {
          return;
        }

        const failure = error as GeolocationFailure;
        setCoordinates(null);
        setLocationState(failure.code === 1 ? "denied" : "error");
        setLocationError(failure.message);
      }
    };

    requestLocation();

    return () => {
      ignore = true;
    };
  }, [locationRequestNonce]);

  const searchMode = manualQuery.trim() ? "manual" : coordinates ? "nearby" : "idle";

  const placesQuery = useQuery({
    queryKey: [
      "nearby-places",
      searchMode,
      activeFilter,
      manualQuery.trim(),
      coordinates?.lat ?? null,
      coordinates?.lng ?? null,
    ],
    enabled: searchMode !== "idle",
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 250,
    queryFn: async () => {
      if (searchMode === "manual") {
        return searchPlacesByArea({
          textQuery: manualQuery.trim(),
          filter: activeFilter,
          radius: SEARCH_RADIUS_METERS,
          userLocation: coordinates ?? undefined,
        });
      }

      if (!coordinates) {
        return [];
      }

      return searchNearbyPlaces({
        lat: coordinates.lat,
        lng: coordinates.lng,
        radius: SEARCH_RADIUS_METERS,
        filter: activeFilter,
      });
    },
  });

  const places = placesQuery.data ?? [];

  const summaryText = useMemo(() => {
    if (manualQuery.trim()) {
      return `Showing live results for "${manualQuery.trim()}"`;
    }

    if (coordinates) {
      return "Showing live food stalls and restaurants near your current location";
    }

    if (locationState === "requesting") {
      return "Checking your current location";
    }

    return "Enable location or enter an area to fetch nearby places";
  }, [coordinates, locationState, manualQuery]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualQuery(searchInput.trim());
  };

  const handleUseCurrentLocation = () => {
    setManualQuery("");
    setSearchInput("");
    setLocationRequestNonce((value) => value + 1);
  };

  const emptyStateMessage =
    searchMode === "manual"
      ? `No nearby food spots found for "${manualQuery.trim()}"`
      : `No nearby places found for "${activeFilter}"`;

  return (
    <div className="pb-20 min-h-screen">
      <div
        className="relative overflow-hidden rounded-b-[32px] px-5 pt-12 pb-6"
        style={{ background: "var(--hero-gradient)" }}
      >
        <div className="absolute top-8 right-[-20px] w-32 h-32 rounded-full bg-secondary/10 animate-float" />
        <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
          <MapPin size={24} className="text-primary" />
          Nearby Food
        </h1>
        <p className="text-sm text-muted-foreground font-body mt-1">Live food stalls and restaurant results around you</p>
      </div>

      <div className="px-5 mt-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={
                coordinates
                  ? "Search another area, e.g. Bugis or Tampines..."
                  : "Search an area to find nearby food..."
              }
              className="w-full bg-card rounded-2xl pl-11 pr-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-body font-medium shadow-soft"
          >
            Search
          </button>
        </form>

        <div className="flex items-center justify-between gap-3 mb-4 bg-card rounded-2xl p-4 shadow-soft">
          <div>
            <p className="text-sm font-body text-foreground">{summaryText}</p>
            {(locationState === "denied" || locationState === "error") && locationError && (
              <p className="text-xs font-body text-muted-foreground mt-1">{locationError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-body font-medium shrink-0"
          >
            <LocateFixed size={14} />
            Use location
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <SlidersHorizontal size={16} className="text-primary" />
          </div>
          {nearbyFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-xs font-medium font-body whitespace-nowrap transition-all ${
                activeFilter === filter
                  ? "bg-primary text-primary-foreground shadow-elevated"
                  : "bg-card text-foreground shadow-soft"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 mt-5">
          {locationState === "requesting" && searchMode === "idle" && (
            <div className="bg-card rounded-[20px] shadow-card p-5">
              <p className="text-sm font-body text-muted-foreground">Fetching your location to load nearby food spots...</p>
            </div>
          )}

          {(locationState === "denied" || locationState === "error") && searchMode === "idle" && (
            <div className="bg-card rounded-[20px] shadow-card p-5">
              <p className="text-sm font-body text-foreground">Search an area manually to find live nearby food stalls and restaurants.</p>
            </div>
          )}

          {placesQuery.isLoading && searchMode !== "idle" && (
            <div className="bg-card rounded-[20px] shadow-card p-5">
              <p className="text-sm font-body text-muted-foreground">Loading live nearby food information...</p>
            </div>
          )}

          {placesQuery.isError && (
            <div className="bg-card rounded-[20px] shadow-card p-5">
              <p className="text-sm font-body text-foreground">Could not load nearby places right now.</p>
              <p className="text-xs font-body text-muted-foreground mt-1">
                {(placesQuery.error as Error).message.includes("VITE_GOOGLE_MAPS_API_KEY")
                  ? "Add VITE_GOOGLE_MAPS_API_KEY to your environment to enable Google Places."
                  : (placesQuery.error as Error).message}
              </p>
            </div>
          )}

          {!placesQuery.isLoading &&
            !placesQuery.isError &&
            places.map((place, index) => {
              const badges = [place.primaryType, place.isOpenNow ? "Open Now" : null].filter(Boolean) as string[];

              return (
                <motion.div
                  key={place.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <RestaurantCard
                    address={place.address}
                    badges={badges}
                    distance={place.distanceText}
                    imageUrl={place.imageUrl}
                    isFavorited={favoriteRestaurantIds.has(place.id)}
                    mapsUrl={place.mapsUrl}
                    name={place.name}
                    onToggleFavorite={() => onToggleFavoriteRestaurant(place)}
                    photoAttributions={place.photoAttributions}
                    rating={place.rating}
                  />
                </motion.div>
              );
            })}

          {!placesQuery.isLoading && !placesQuery.isError && searchMode !== "idle" && places.length === 0 && (
            <p className="text-center text-muted-foreground font-body py-12 text-sm">{emptyStateMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NearbyPage;
