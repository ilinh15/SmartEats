import { describe, expect, it, vi } from "vitest";
import { getCurrentPosition } from "@/lib/geolocation";

describe("getCurrentPosition", () => {
  it("rejects with a helpful message when the page is not served via HTTPS or localhost", async () => {
    const originalNavigator = globalThis.navigator;
    const originalWindow = globalThis.window;

    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
    });

    Object.defineProperty(window, "location", {
      value: { ...window.location, hostname: "smart-eats.example.com" },
      configurable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: {
        ...originalNavigator,
        geolocation: {
          getCurrentPosition: vi.fn(),
        },
      },
      configurable: true,
    });

    await expect(getCurrentPosition()).rejects.toMatchObject({
      message: expect.stringContaining("secure connection"),
    });

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  it("resolves coordinates when geolocation is available in a secure context", async () => {
    const getCurrentPositionMock = vi.fn((success, _error, options) => {
      expect(options).toMatchObject({
        enableHighAccuracy: false,
        timeout: 30000,
      });

      success({
        coords: {
          latitude: 1.234,
          longitude: 5.678,
        },
      });
    });

    Object.defineProperty(window, "isSecureContext", {
      value: true,
      configurable: true,
    });

    Object.defineProperty(window, "location", {
      value: { ...window.location, hostname: "localhost" },
      configurable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          getCurrentPosition: getCurrentPositionMock,
        },
      },
      configurable: true,
    });

    await expect(getCurrentPosition()).resolves.toEqual({
      lat: 1.234,
      lng: 5.678,
    });
  });
});
