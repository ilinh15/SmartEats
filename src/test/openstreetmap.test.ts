import { describe, expect, it } from "vitest";
import { buildOverpassQuery } from "@/lib/openStreetMap";

describe("openstreetmap query builder", () => {
  it("builds a valid Overpass query for food search", () => {
    const query = buildOverpassQuery({
      lat: 1.3521,
      lng: 103.8198,
      radius: 1800,
      filter: "All",
    });

    expect(query).toContain("[out:json][timeout:25]");
    expect(query).toContain('nwr["amenity"~"^(restaurant|fast_food|food_court|cafe)$"]');
    expect(query).toContain("(around:1800,1.3521,103.8198)");
    expect(query).toContain("out center tags;");
  });
});
