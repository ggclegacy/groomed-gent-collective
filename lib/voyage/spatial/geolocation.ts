import type { GeolocationProvider } from './model';
export const browserLocation: GeolocationProvider = {
  locate: () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(
          new Error('Location is unavailable. Choose an area to explore.'),
        );
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          }),
        (e) =>
          reject(
            new Error(
              e.code === 1
                ? 'Location access is off. Choose an area, or allow location in your browser settings.'
                : 'Your location could not be found. Choose an area or try again.',
            ),
          ),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    }),
};
