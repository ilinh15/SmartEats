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
    if (!navigator.geolocation) {
      reject({ message: "Geolocation is not supported by this browser." } satisfies GeolocationFailure);
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
        reject({
          code: error.code,
          message: error.message || "Unable to retrieve your location.",
        } satisfies GeolocationFailure);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  });
