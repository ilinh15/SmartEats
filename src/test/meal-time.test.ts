import { describe, expect, it } from "vitest";
import { getMealPeriod, getMealTimeContent } from "@/lib/mealTime";

describe("meal time helpers", () => {
  it("maps the configured time boundaries to meal periods", () => {
    expect(getMealPeriod(new Date("2026-04-05T04:59:00"))).toBe("supper");
    expect(getMealPeriod(new Date("2026-04-05T05:00:00"))).toBe("breakfast");
    expect(getMealPeriod(new Date("2026-04-05T10:59:00"))).toBe("breakfast");
    expect(getMealPeriod(new Date("2026-04-05T11:00:00"))).toBe("lunch");
    expect(getMealPeriod(new Date("2026-04-05T15:59:00"))).toBe("lunch");
    expect(getMealPeriod(new Date("2026-04-05T16:00:00"))).toBe("dinner");
    expect(getMealPeriod(new Date("2026-04-05T21:59:00"))).toBe("dinner");
    expect(getMealPeriod(new Date("2026-04-05T22:00:00"))).toBe("supper");
  });

  it("returns supper copy late at night", () => {
    const content = getMealTimeContent(new Date("2026-04-05T23:15:00"));

    expect(content.mealPeriod).toBe("supper");
    expect(content.mealLabel).toBe("Supper");
    expect(content.heroSuggestion).toMatch(/light supper/i);
  });
});
