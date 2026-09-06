# OpenStreetMap Places Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Google Places with API-key-free OpenStreetMap search for manual areas, current location, and home-page meal recommendations.

**Architecture:** Keep `nearbyPlaces.ts` as the application-facing repository and preserve its exported functions and `NearbyPlace` contract. Add separate Nominatim and Overpass clients, normalize their responses in the repository, and leave React consumers isolated from provider details.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, TanStack Query, Nominatim Search API, Overpass API, `opening_hours` 3.14.x.

**Spec:** `docs/superpowers/specs/2026-09-07-openstreetmap-places-migration-design.md`

## Global Constraints

- Perform no Google Maps or Google Places requests after migration.
- Require no new service secret or API key.
- Call public Nominatim only after explicit area submission, never as autocomplete.
- Keep uncached Nominatim calls at least 1,000 ms apart in one browser session.
- Cache successful area lookups and place queries.
- Display `© OpenStreetMap contributors` anywhere OpenStreetMap results appear.
- Preserve `searchPlacesByArea`, `searchNearbyPlaces`, `searchMealRecommendations`, and the `NearbyPlace` shape for current consumers.
- Preserve existing unrelated working-tree changes.

---

### Task 1: Nominatim Area Geocoder

**Files:**
- Create: `src/lib/openStreetMapNominatim.ts`
- Create: `src/test/open-street-map-nominatim.test.ts`

**Interfaces:**
- Consumes: a user-submitted area string and browser `fetch`/`localStorage`.
- Produces: `geocodeArea(textQuery: string): Promise<GeocodedArea | null>` where `GeocodedArea` is `{ lat: number; lng: number; displayName: string }`.

- [ ] **Step 1: Write failing geocoding and validation tests**

Create tests with a real `Response` fixture and a mocked network boundary:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("geocodeArea", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useFakeTimers();
  });

  it("converts the first Nominatim result into coordinates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { lat: "1.3000", lon: "103.8000", display_name: "Singapore" },
    ]), { status: 200 })));
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");

    await expect(geocodeArea(" Singapore ")).resolves.toEqual({
      lat: 1.3,
      lng: 103.8,
      displayName: "Singapore",
    });
  });

  it("returns null for an empty result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");
    await expect(geocodeArea("Atlantis")).resolves.toBeNull();
  });

  it("rejects a blank area without a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");
    await expect(geocodeArea("   ")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run: `npm test -- src/test/open-street-map-nominatim.test.ts`

Expected: FAIL because `@/lib/openStreetMapNominatim` does not exist.

- [ ] **Step 3: Implement the minimal geocoder**

Create the module with this public structure:

```ts
export interface GeocodedArea {
  lat: number;
  lng: number;
  displayName: string;
}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const CACHE_KEY = "smarteats.osm-geocoding.v1";
const MIN_REQUEST_INTERVAL_MS = 1_000;

export async function geocodeArea(textQuery: string): Promise<GeocodedArea | null> {
  const query = textQuery.trim();
  if (!query) return null;

  const cached = readCachedArea(query);
  if (cached) return cached;

  await waitForNominatimSlot();
  const url = new URL(NOMINATIM_ENDPOINT);
  url.search = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", "accept-language": "en" }).toString();
  const response = await fetchWithTimeout(url.toString(), 8_000);
  if (!response.ok) throw nominatimHttpError(response.status);

  const [first] = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
  if (!first) return null;
  const result = { lat: Number(first.lat), lng: Number(first.lon), displayName: first.display_name };
  if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) {
    throw new Error("Nominatim returned invalid coordinates.");
  }
  cacheArea(query, result);
  return result;
}
```

Implement `fetchWithTimeout` with `AbortController`, a case-insensitive JSON cache keyed by trimmed query, and a module-level promise queue that updates the last-request timestamp before each uncached call.

- [ ] **Step 4: Add failing cache, pacing, HTTP, and timeout tests**

Add cases proving a cached second lookup makes one fetch, two uncached calls begin at least 1,000 ms apart under fake timers, HTTP 429 becomes `OpenStreetMap geocoding is temporarily rate-limited.`, and abort becomes `OpenStreetMap geocoding timed out.`

- [ ] **Step 5: Run the focused tests until all pass**

Run: `npm test -- src/test/open-street-map-nominatim.test.ts`

Expected: all Nominatim tests PASS.

- [ ] **Step 6: Commit the geocoder**

```bash
git add src/lib/openStreetMapNominatim.ts src/test/open-street-map-nominatim.test.ts
git commit -m "feat: add OpenStreetMap area geocoder"
```

---

### Task 2: Overpass Food-Place Client

**Files:**
- Create: `src/lib/openStreetMapOverpass.ts`
- Create: `src/test/open-street-map-overpass.test.ts`

**Interfaces:**
- Consumes: `SearchOpenStreetMapPlacesParams` containing `lat`, `lng`, `radius`, and `amenities`.
- Produces: `searchOpenStreetMapPlaces(params): Promise<OpenStreetMapPlace[]>`.
- Produces type: `OpenStreetMapAmenity = "restaurant" | "cafe" | "fast_food" | "food_court"`.
- Produces type: `OpenStreetMapPlace = { id: string; elementId: number; elementType: "node" | "way" | "relation"; lat: number; lng: number; tags: Record<string, string> }`.

- [ ] **Step 1: Write the failing query and normalization tests**

```ts
it("queries nodes, ways, and relations within the requested radius", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");

  await searchOpenStreetMapPlaces({
    lat: 1.3,
    lng: 103.8,
    radius: 1800,
    amenities: ["restaurant", "cafe"],
  });

  const body = String(fetchMock.mock.calls[0][1]?.body);
  expect(body).toContain('nwr["amenity"~"^(restaurant|cafe)$"](around:1800,1.3,103.8);');
  expect(body).toContain("out center tags;");
});

it("uses center coordinates for ways and relations", async () => {
  // Return one node and one way with center coordinates and assert exact normalized objects.
});
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run: `npm test -- src/test/open-street-map-overpass.test.ts`

Expected: FAIL because `@/lib/openStreetMapOverpass` does not exist.

- [ ] **Step 3: Implement bounded Overpass queries and normalization**

```ts
export interface SearchOpenStreetMapPlacesParams {
  lat: number;
  lng: number;
  radius: number;
  amenities: OpenStreetMapAmenity[];
}

export type OpenStreetMapAmenity = "restaurant" | "cafe" | "fast_food" | "food_court";

export interface OpenStreetMapPlace {
  id: string;
  elementId: number;
  elementType: "node" | "way" | "relation";
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export async function searchOpenStreetMapPlaces(
  params: SearchOpenStreetMapPlacesParams,
): Promise<OpenStreetMapPlace[]> {
  validateSearchBounds(params);
  const cached = readCachedPlaces(params);
  if (cached) return cached;

  const query = buildOverpassQuery(params);
  const response = await fetchWithTimeout(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
  }, 12_000);
  if (!response.ok) throw overpassHttpError(response.status);
  const payload = await response.json() as OverpassResponse;
  const places = payload.elements.flatMap(normalizeElement);
  cachePlaces(params, places, 5 * 60 * 1_000);
  return places;
}
```

Validate latitude `-90..90`, longitude `-180..180`, radius `100..10_000`, and amenities against `restaurant`, `cafe`, `fast_food`, and `food_court`. Escape the amenity alternatives before building the regular expression.

- [ ] **Step 4: Add failing cache and failure-mode tests**

Add literal-result tests for five-minute cache hits, expired cache refetch, malformed elements being discarded, HTTP 429, HTTP 504, abort timeout, and invalid coordinate/radius rejection.

- [ ] **Step 5: Run the focused tests until all pass**

Run: `npm test -- src/test/open-street-map-overpass.test.ts`

Expected: all Overpass tests PASS.

- [ ] **Step 6: Commit the Overpass client**

```bash
git add src/lib/openStreetMapOverpass.ts src/test/open-street-map-overpass.test.ts
git commit -m "feat: add Overpass food place search"
```

---

### Task 3: Migrate the Nearby-Place Repository

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/lib/nearbyPlaces.ts`
- Create: `src/test/nearby-places.test.ts`

**Interfaces:**
- Consumes: `geocodeArea(textQuery)` from Task 1 and `searchOpenStreetMapPlaces(params)` from Task 2.
- Preserves: all existing exported types and search function signatures in `nearbyPlaces.ts`.

- [ ] **Step 1: Install the opening-hours parser**

Run: `npm install opening_hours@^3.14.0`

Expected: `package.json` and `package-lock.json` include `opening_hours`.

- [ ] **Step 2: Write failing repository normalization tests**

Mock only the two provider modules. Assert hand-written expected values:

```ts
vi.mock("@/lib/openStreetMapNominatim", () => ({
  geocodeArea: vi.fn().mockResolvedValue({ lat: 1.3, lng: 103.8, displayName: "Singapore" }),
}));
vi.mock("@/lib/openStreetMapOverpass", () => ({
  searchOpenStreetMapPlaces: vi.fn().mockResolvedValue([
    {
      id: "node/42",
      elementId: 42,
      elementType: "node",
      lat: 1.301,
      lng: 103.801,
      tags: {
        name: "Kopi Corner",
        amenity: "cafe",
        "addr:housenumber": "10",
        "addr:street": "Market Street",
        opening_hours: "24/7",
      },
    },
  ]),
}));

it("normalizes OpenStreetMap places into the existing contract", async () => {
  const { searchPlacesByArea } = await import("@/lib/nearbyPlaces");
  await expect(searchPlacesByArea({ textQuery: "Singapore", filter: "Cafe" })).resolves.toEqual([
    expect.objectContaining({
      id: "node/42",
      name: "Kopi Corner",
      address: "10 Market Street",
      primaryType: "Cafe",
      rating: null,
      imageUrl: null,
      photoAttributions: [],
      isOpenNow: true,
      mapsUrl: "https://www.openstreetmap.org/node/42",
    }),
  ]);
});
```

Add separate tests for `brand` name fallback, area-label address fallback, missing names being discarded, duplicate IDs, Haversine distance, and all six filter mappings.

- [ ] **Step 3: Run the repository tests and verify they fail against Google-backed code**

Run: `npm test -- src/test/nearby-places.test.ts`

Expected: FAIL because `nearbyPlaces.ts` still imports Google Maps and does not call the new clients.

- [ ] **Step 4: Replace Google types and calls while preserving the repository API**

Use exact mappings:

```ts
const FILTER_AMENITIES: Record<NearbyFilter, OpenStreetMapAmenity[]> = {
  All: ["restaurant", "cafe", "fast_food", "food_court"],
  Restaurant: ["restaurant"],
  Takeaway: ["fast_food", "restaurant"],
  Cafe: ["cafe"],
  "Food Court": ["food_court"],
  "Open Now": ["restaurant", "cafe", "fast_food", "food_court"],
};
```

Implement `isCurrentlyOpen(value)` as:

```ts
const isCurrentlyOpen = (value?: string) => {
  if (!value) return undefined;
  try {
    const hours = new opening_hours(value);
    return hours.getUnknown() ? undefined : hours.getState(new Date());
  } catch {
    return undefined;
  }
};
```

For `Takeaway`, retain `fast_food` plus `restaurant` elements with `takeaway=yes` or `takeaway=only`. For `Open Now`, retain only elements where `isCurrentlyOpen` returns `true`. Rank all results by calculated distance and cap at 12, or 8 for meal recommendations.

- [ ] **Step 5: Run repository and consumer tests**

Run: `npm test -- src/test/nearby-places.test.ts src/test/home-page.test.tsx src/test/firestore-favorites.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 6: Commit the repository migration**

```bash
git add package.json package-lock.json src/lib/nearbyPlaces.ts src/test/nearby-places.test.ts
git commit -m "feat: migrate nearby search to OpenStreetMap"
```

---

### Task 4: Attribution, Provider Copy, and Google Cleanup

**Files:**
- Modify: `src/components/RestaurantCard.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/NearbyPage.tsx`
- Modify: `src/vite-env.d.ts`
- Modify: `README.md`
- Delete: `src/lib/googleMapsPlaces.ts`
- Modify: `src/test/home-page.test.tsx`
- Create: `src/test/nearby-page.test.tsx`

**Interfaces:**
- Consumes: unchanged `NearbyPlace` values from Task 3.
- Produces: provider-neutral cards and visible OpenStreetMap attribution.

- [ ] **Step 1: Write failing UI tests**

Add tests that render successful Home and Nearby results and assert:

```ts
expect(screen.getByRole("link", { name: "© OpenStreetMap contributors" })).toHaveAttribute(
  "href",
  "https://www.openstreetmap.org/copyright",
);
expect(screen.getByRole("link", { name: "Open in OpenStreetMap" })).toHaveAttribute(
  "href",
  "https://www.openstreetmap.org/node/42",
);
expect(screen.queryByText(/google places/i)).not.toBeInTheDocument();
```

The Nearby page test must also cover denied geolocation followed by a manual area submission and a provider-error message that contains no Google configuration instructions.

- [ ] **Step 2: Run UI tests and verify provider-specific assertions fail**

Run: `npm test -- src/test/home-page.test.tsx src/test/nearby-page.test.tsx`

Expected: FAIL because attribution is absent and the card label still says `Open in Google Maps`.

- [ ] **Step 3: Add attribution and provider-neutral behavior**

Change the `RestaurantCard` default to `Open in OpenStreetMap`. Add this element once below each result collection:

```tsx
<a
  href="https://www.openstreetmap.org/copyright"
  target="_blank"
  rel="noreferrer"
  className="text-[10px] font-body text-muted-foreground underline underline-offset-2"
>
  © OpenStreetMap contributors
</a>
```

Remove `VITE_GOOGLE_MAPS_API_KEY` branches from Home and Nearby error copy. Use `Nearby search is temporarily unavailable. Please try again.` for provider failures.

- [ ] **Step 4: Remove Google runtime configuration**

Delete `src/lib/googleMapsPlaces.ts`, remove `VITE_GOOGLE_MAPS_API_KEY` from `src/vite-env.d.ts`, and ensure README environment examples do not mention Google Maps. Run:

`rg -n "googleMapsPlaces|VITE_GOOGLE_MAPS_API_KEY|maps.googleapis.com|Google Places|Google Maps" src README.md`

Expected: no runtime/config matches. Historical documentation under `docs/superpowers/` may still explain the migration source.

- [ ] **Step 5: Run UI tests and the full suite**

Run: `npm test -- src/test/home-page.test.tsx src/test/nearby-page.test.tsx`

Expected: selected tests PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit UI and cleanup changes**

```bash
git add README.md src/components/RestaurantCard.tsx src/pages/HomePage.tsx src/pages/NearbyPage.tsx src/vite-env.d.ts src/test/home-page.test.tsx src/test/nearby-page.test.tsx
git add -u src/lib/googleMapsPlaces.ts
git commit -m "feat: finish OpenStreetMap places migration"
```

---

### Task 5: End-to-End Verification

**Files:**
- Verify only; modify a file only if a failing check identifies a defect in the migration.

**Interfaces:**
- Consumes: the complete implementation from Tasks 1–4.
- Produces: verified local behavior with no Google Maps dependency.

- [ ] **Step 1: Run formatting and repository checks**

Run: `git diff --check`

Expected: exit 0 with no whitespace errors.

Run: `rg -n "googleMapsPlaces|VITE_GOOGLE_MAPS_API_KEY|maps.googleapis.com" src README.md`

Expected: no matches.

- [ ] **Step 2: Run automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: frontend build exits 0.

Run: `npm run build --prefix functions`

Expected: Cloud Functions TypeScript build exits 0.

- [ ] **Step 3: Verify manual area search in the local browser**

Start or reuse `npm run dev -- --host 127.0.0.1`. Open `http://127.0.0.1:8080/`, go to Nearby, deny or leave location unavailable, submit `Singapore`, and verify:

- result cards render or a legitimate empty result appears;
- no Google permission error appears;
- card links target `openstreetmap.org`;
- `© OpenStreetMap contributors` is visible.

- [ ] **Step 4: Verify current-location behavior**

Grant browser location permission, press `Use location`, and verify the request either returns nearby food results or a bounded provider error. Confirm loading does not remain beyond the configured timeout.

- [ ] **Step 5: Review final diff and commit any verification fix**

Run: `git status --short` and `git diff --stat`.

If verification required a code fix, repeat the relevant failing-test-first cycle and commit only those migration files with `git commit -m "fix: complete OpenStreetMap migration verification"`.
