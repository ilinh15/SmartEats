import { beforeEach, describe, expect, it, vi } from "vitest";

describe("searchOpenStreetMapPlaces", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useRealTimers();
  });

  it("queries nodes, ways, and relations within the requested radius", async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");

    await searchOpenStreetMapPlaces({ lat: 1.3, lng: 103.8, radius: 1800, amenities: ["restaurant", "cafe"] });

    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get("data")).toContain('nwr["amenity"~"^(restaurant|cafe)$"](around:1800,1.3,103.8);');
    expect(body.get("data")).toContain("out center tags;");
  });

  it("uses center coordinates for ways and relations", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [
      { type: "node", id: 7, lat: 1.31, lon: 103.81, tags: { amenity: "cafe", name: "Node Cafe" } },
      { type: "way", id: 8, center: { lat: 1.32, lon: 103.82 }, tags: { amenity: "restaurant", name: "Way Restaurant" } },
      { type: "relation", id: 9, center: { lat: 1.33, lon: 103.83 }, tags: { amenity: "food_court", name: "Relation Court" } },
    ] }), { status: 200 })));
    const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");

    await expect(searchOpenStreetMapPlaces({ lat: 1.3, lng: 103.8, radius: 1800, amenities: ["restaurant"] })).resolves.toEqual([
      { id: "node/7", elementId: 7, elementType: "node", lat: 1.31, lng: 103.81, tags: { amenity: "cafe", name: "Node Cafe" } },
      { id: "way/8", elementId: 8, elementType: "way", lat: 1.32, lng: 103.82, tags: { amenity: "restaurant", name: "Way Restaurant" } },
      { id: "relation/9", elementId: 9, elementType: "relation", lat: 1.33, lng: 103.83, tags: { amenity: "food_court", name: "Relation Court" } },
    ]);
  });

  it("uses a successful result from cache for five minutes", async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");
    const params = { lat: 1.3, lng: 103.8, radius: 1800, amenities: ["restaurant"] as const };
    await searchOpenStreetMapPlaces(params);
    await searchOpenStreetMapPlaces(params);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1_000);
    await searchOpenStreetMapPlaces(params);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("discards malformed elements", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [
      { type: "node", id: 1, lat: 1, lon: 2 }, { type: "way", id: 2, center: { lat: "bad", lon: 2 }, tags: {} },
      { type: "node", id: 3, lat: 1, lon: 2, tags: { amenity: "cafe" } },
    ] }), { status: 200 })));
    const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");
    await expect(searchOpenStreetMapPlaces({ lat: 1, lng: 2, radius: 100, amenities: ["cafe"] })).resolves.toEqual([
      { id: "node/3", elementId: 3, elementType: "node", lat: 1, lng: 2, tags: { amenity: "cafe" } },
    ]);
  });

  it("reports rate limit and gateway timeout failures", async () => {
    const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");
    for (const [status, message] of [[429, "temporarily rate-limited"], [504, "timed out"]] as const) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
      await expect(searchOpenStreetMapPlaces({ lat: 1, lng: 2, radius: 100, amenities: ["cafe"] })).rejects.toThrow(message);
      vi.resetModules();
    }
  });

  it("reports an aborted request as a timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, options?: RequestInit) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");
    const result = searchOpenStreetMapPlaces({ lat: 1, lng: 2, radius: 100, amenities: ["cafe"] });
    const expectation = expect(result).rejects.toThrow("OpenStreetMap place search timed out.");
    await vi.advanceTimersByTimeAsync(12_000);
    await expectation;
  });

  it("keeps the timeout active while consuming the response body", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options?: RequestInit) => {
      requestSignal = options?.signal ?? undefined;

      return {
        ok: true,
        status: 200,
        json: () => new Promise((_resolve, reject) => {
          requestSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
      } as Response;
    }));
    const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");

    const result = searchOpenStreetMapPlaces({ lat: 1, lng: 2, radius: 100, amenities: ["cafe"] });
    const expectation = expect(result).rejects.toThrow("OpenStreetMap place search timed out.");
    await vi.advanceTimersByTimeAsync(12_000);

    expect(requestSignal?.aborted).toBe(true);
    await expectation;
  });

  it.each([
    [{ lat: -91, lng: 2, radius: 100, amenities: ["cafe"] }, "latitude"],
    [{ lat: 1, lng: 181, radius: 100, amenities: ["cafe"] }, "longitude"],
    [{ lat: 1, lng: 2, radius: 99, amenities: ["cafe"] }, "radius"],
    [{ lat: 1, lng: 2, radius: 100, amenities: ["bar"] }, "amenit"],
  ])("rejects invalid search bounds (%s)", async (params, message) => {
    vi.stubGlobal("fetch", vi.fn());
    const { searchOpenStreetMapPlaces } = await import("@/lib/openStreetMapOverpass");
    await expect(searchOpenStreetMapPlaces(params as never)).rejects.toThrow(message);
  });
});
