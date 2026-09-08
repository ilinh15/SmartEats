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

  it("uses the cached result for a case-insensitive second lookup", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { lat: "1.3", lon: "103.8", display_name: "Singapore" },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");

    await expect(geocodeArea("Singapore")).resolves.toEqual({ lat: 1.3, lng: 103.8, displayName: "Singapore" });
    await expect(geocodeArea(" singapore ")).resolves.toEqual({ lat: 1.3, lng: 103.8, displayName: "Singapore" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("starts uncached requests at least one second apart", async () => {
    const startedAt: number[] = [];
    const fetchMock = vi.fn().mockImplementation(async () => {
      startedAt.push(Date.now());
      return new Response("[]", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");

    const first = geocodeArea("One");
    await vi.runAllTimersAsync();
    await first;
    const second = geocodeArea("Two");
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(startedAt[1] - startedAt[0]).toBeGreaterThanOrEqual(1000);
  });

  it("reports a rate-limited response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");
    await expect(geocodeArea("Singapore")).rejects.toThrow("OpenStreetMap geocoding is temporarily rate-limited.");
  });

  it("reports an aborted request as a timeout", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, options?: RequestInit) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");
    const result = geocodeArea("Singapore");
    const expectation = expect(result).rejects.toThrow("OpenStreetMap geocoding timed out.");
    await vi.advanceTimersByTimeAsync(8_000);
    await expectation;
  });

  it("keeps the timeout active while consuming the response body", async () => {
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
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");

    const result = geocodeArea("Singapore");
    const expectation = expect(result).rejects.toThrow("OpenStreetMap geocoding timed out.");
    await vi.advanceTimersByTimeAsync(8_000);

    expect(requestSignal?.aborted).toBe(true);
    await expectation;
  });

  it("rejects invalid coordinates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { lat: "unknown", lon: "103.8", display_name: "Singapore" },
    ]), { status: 200 })));
    const { geocodeArea } = await import("@/lib/openStreetMapNominatim");
    await expect(geocodeArea("Singapore")).rejects.toThrow("Nominatim returned invalid coordinates.");
  });
});
