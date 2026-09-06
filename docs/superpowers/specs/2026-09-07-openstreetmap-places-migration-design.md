# OpenStreetMap Places Migration Design

## Goal

Replace Google Maps Places in SmartEats with OpenStreetMap-backed services so nearby food search works without a Google API key or Google billing account. Preserve the current screens, filters, favorites integration, and `NearbyPlace` consumer contract.

## Scope

The migration covers manual area search, current-location nearby search, time-based meal recommendations, restaurant result normalization, outbound map links, attribution, caching, rate limits, and error handling.

It does not add an interactive map, autocomplete, ratings from another provider, restaurant photos from another provider, or a self-hosted OpenStreetMap service.

## Architecture

Create an OpenStreetMap provider layer with two focused clients:

1. A Nominatim client converts a user-submitted area into one coordinate pair. It runs only after explicit form submission, never on each keystroke.
2. An Overpass client queries food points of interest around a coordinate pair and returns raw OpenStreetMap elements.

`nearbyPlaces.ts` remains the application-facing repository. It maps the existing filters to OpenStreetMap tags, calls the provider clients, normalizes results into the existing `NearbyPlace` interface, calculates distance with the existing code, and deduplicates results.

The React pages and restaurant cards continue using `searchPlacesByArea`, `searchNearbyPlaces`, and `searchMealRecommendations`. This isolates the provider change from UI consumers and favorites storage.

## Components

### Nominatim client

Add `src/lib/openStreetMapNominatim.ts` with a function that:

- trims and validates the submitted area;
- calls the public Nominatim `/search` endpoint with `format=jsonv2`, `limit=1`, and the submitted query;
- sends the browser's normal referrer and requests an English response;
- converts the first result into numeric latitude and longitude;
- reports an empty result separately from network or HTTP failure;
- caches successful area lookups in memory and local storage;
- enforces at least one second between uncached Nominatim requests in this browser session.

The endpoint URL will be a module-level configuration value so it can be changed without touching search behavior. SmartEats will not implement autocomplete or bulk geocoding.

### Overpass client

Add `src/lib/openStreetMapOverpass.ts` with a function that:

- accepts coordinates, radius, and food categories;
- builds one bounded Overpass QL query for nodes, ways, and relations;
- requests JSON from a configurable public Overpass endpoint;
- converts element centers and tags into a provider-neutral raw place shape;
- caches successful queries for five minutes;
- uses a finite request timeout and returns actionable errors for rate limiting, timeout, and server failure.

The initial implementation uses one public Overpass instance. The endpoint remains replaceable so production can move to another hosted or self-hosted instance without changing application code.

### Nearby-place repository

Refactor `src/lib/nearbyPlaces.ts` to remove Google Maps types and loader calls while retaining its public functions and `NearbyPlace` interface.

Filter mappings:

- `All`: restaurant, cafe, fast_food, food_court
- `Restaurant`: restaurant
- `Takeaway`: fast_food plus places tagged `takeaway=yes` or `takeaway=only`
- `Cafe`: cafe
- `Food Court`: food_court
- `Open Now`: all food categories, then evaluate usable `opening_hours` data locally with the `opening_hours` package; places with missing or unparseable hours are excluded from this filter

Normalized fields:

- `id`: OpenStreetMap element type and ID
- `name`: `name`, with `brand` as fallback
- `address`: assembled from `addr:*` tags, falling back to the geocoded area label or `Address unavailable`
- `primaryType`: friendly label derived from `amenity` and takeaway tags
- `distanceText`: existing Haversine calculation
- `mapsUrl`: `https://www.openstreetmap.org/{type}/{id}`
- `rating`: `null`
- `imageUrl`: `null`
- `photoAttributions`: empty array
- `isOpenNow`: set only when opening-hours evaluation succeeds

Use the local `opening_hours` package to evaluate OpenStreetMap opening-hours syntax. It does not make network requests.

## Data Flow

For manual search, the user submits an area. SmartEats geocodes that area once with Nominatim, passes the resulting coordinates to Overpass, normalizes and filters the returned POIs, and displays the existing cards.

For current-location search, browser geolocation supplies coordinates directly to Overpass. Nominatim is not called.

For home-page meal recommendations, the current location and meal period select a food-category query. Overpass returns nearby food POIs, which SmartEats ranks by distance. The migration does not attempt semantic ranking such as "best supper" because OpenStreetMap does not provide popularity or rating data.

## User Interface

Keep the current Nearby and Home layouts. Update provider-specific copy so it refers to nearby food results rather than Google Places. Add visible `© OpenStreetMap contributors` attribution near result lists, linked to the OpenStreetMap copyright page.

Cards with no photo continue using the existing no-image state. Cards omit ratings when `rating` is `null`. The map action opens the corresponding OpenStreetMap object page.

## Error Handling and Service Limits

- A missing geocoding result produces the existing empty state rather than a provider error.
- Nominatim and Overpass HTTP failures produce concise user-facing messages while detailed errors remain in the console.
- HTTP 429 responses identify temporary rate limiting and invite a later retry.
- Requests have timeouts so loading states cannot remain indefinitely.
- Successful results are cached to reduce public-service load and improve repeat searches.
- Nominatim calls remain user-triggered and below one request per second per browser session.
- Both endpoint URLs are centralized so SmartEats can switch providers if a public service requests it.

## Configuration and Cleanup

Remove runtime use of `VITE_GOOGLE_MAPS_API_KEY`, the Google Maps script loader, and Google-specific ambient TypeScript declarations. Remove the Maps key from README setup instructions. Delete the unused loader module after all imports are migrated.

No new secret is required. If an opening-hours dependency is added, it must be a local package with no network service.

## Testing

Follow test-driven development for each behavior:

- Nominatim request construction, rate control, cache hit, empty result, HTTP error, and timeout;
- Overpass query construction for each filter, coordinate/radius bounds, raw element normalization, cache hit, rate limit, and timeout;
- repository normalization into `NearbyPlace`, address fallbacks, distance formatting, deduplication, filter behavior, and OpenStreetMap URLs;
- page behavior for loading, successful results, empty results, denied geolocation with manual search, and service failure;
- attribution visibility and link target;
- existing favorites tests to ensure stored restaurants remain compatible.

Run the complete test suite, frontend production build, and Cloud Functions TypeScript build. Verify manual area search and current-location behavior in the local browser without a Google key.

## Success Criteria

- SmartEats performs no Google Maps or Google Places requests.
- Manual area search returns nearby food POIs without an API key.
- Current-location nearby search works when browser location permission is granted.
- Existing filters, cards, details used by favorites, and distance display remain functional.
- Missing ratings and photos render cleanly.
- OpenStreetMap attribution is visible wherever results appear.
- Public-service limits, caching, and timeouts are enforced.
- All automated checks and local browser verification pass.
