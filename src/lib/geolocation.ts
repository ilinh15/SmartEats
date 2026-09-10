export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeolocationFailure {
  code?: number;
  message: string;
}

export const getCurrentPosition = (): Promise<Coordinates> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject({ message: "Geolocation is not supported by this browser." } satisfies GeolocationFailure);
      return;
    }

    const isSecureContext = typeof window !== "undefined" && "isSecureContext" in window ? window.isSecureContext : false;
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.startsWith("127.");

    if (!isSecureContext && !isLocalhost) {
      reject({
        code: 0,
        message: "Location access requires a secure connection. Please use HTTPS or localhost, then try again.",
      } satisfies GeolocationFailure);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        const message =
          error.code === error.TIMEOUT
            ? "Location request timed out. Please try again and make sure your device has a clear GPS signal."
            : error.message || "Unable to retrieve your location.";

        reject({
          code: error.code,
          message,
        } satisfies GeolocationFailure);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30_000,
        timeout: 30_000,
      },
    );
  });
