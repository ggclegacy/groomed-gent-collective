import type { Coordinates, WorldAdapter } from './model';
type MapInstance = {
  flyTo(o: object): void;
  on(event: string, callback: () => void): void;
  addSource(id: string, o: object): void;
  setTerrain(o: object): void;
  remove(): void;
  resize(): void;
};
type MarkerInstance = {
  setLngLat(p: number[]): MarkerInstance;
  addTo(m: MapInstance): MarkerInstance;
  remove(): void;
};
type MapboxSDK = {
  Map: new (o: object) => MapInstance;
  Marker: new (o: object) => MarkerInstance;
  supported(): boolean;
};
let loading: Promise<MapboxSDK> | undefined;
function sdk(): Promise<MapboxSDK> {
  if (!loading)
    loading = new Promise<MapboxSDK>((resolve, reject) => {
      const existing = (window as Window & { mapboxgl?: MapboxSDK }).mapboxgl;
      if (existing) return resolve(existing);
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://api.mapbox.com/mapbox-gl-js/v3.29.0/mapbox-gl.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.29.0/mapbox-gl.js';
      script.async = true;
      const timeout = setTimeout(
        () => reject(new Error('World connection timed out.')),
        15000,
      );
      script.onload = () => {
        clearTimeout(timeout);
        const api = (window as Window & { mapboxgl?: MapboxSDK }).mapboxgl;
        if (api) resolve(api);
        else reject(new Error('World unavailable.'));
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('World unavailable.'));
      };
      document.head.appendChild(script);
    }).catch((e) => {
      loading = undefined;
      throw e;
    });
  return loading;
}
export async function createMapboxWorld(
  container: HTMLElement,
  token: string,
  center: Coordinates,
  preset: string,
  reduced: boolean,
  failed: () => void,
): Promise<WorldAdapter> {
  const api = await sdk();
  if (!api.supported()) throw new Error('3D is unavailable on this device.');
  const map = new api.Map({
    container,
    accessToken: token,
    style: 'mapbox://styles/mapbox/standard',
    center: [center.longitude, center.latitude],
    zoom: 14.6,
    pitch: 58,
    bearing: -24,
    antialias: false,
    maxPitch: 65,
    config: {
      basemap: {
        lightPreset: preset,
        theme: 'monochrome',
        showPointOfInterestLabels: false,
        showTransitLabels: false,
      },
    },
  });
  try {
    await new Promise<void>((resolve, reject) => {
      let loaded = false;
      const timeout = setTimeout(
        () => reject(new Error('World connection timed out.')),
        15000,
      );
      map.on('error', () => {
        if (loaded) failed();
        else {
          clearTimeout(timeout);
          reject(new Error('World unavailable.'));
        }
      });
      map.on('load', () => {
        clearTimeout(timeout);
        loaded = true;
        try {
          map.addSource('voyage-terrain', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });
          map.setTerrain({ source: 'voyage-terrain', exaggeration: 1.15 });
          resolve();
        } catch {
          reject(new Error('Terrain unavailable.'));
        }
      });
    });
  } catch (error) {
    map.remove();
    throw error;
  }
  const originElement = document.createElement('div');
  originElement.className = 'voyage-origin';
  originElement.setAttribute('aria-label', 'Search area center');
  const origin = new api.Marker({ element: originElement })
    .setLngLat([center.longitude, center.latitude])
    .addTo(map);
  const resize = new ResizeObserver(() => map.resize());
  resize.observe(container);
  let markers: MarkerInstance[] = [];
  return {
    flyTo(location, close = false) {
      if (!close) origin.setLngLat([location.longitude, location.latitude]);
      map.flyTo({
        center: [location.longitude, location.latitude],
        zoom: close ? 16.2 : 14.6,
        pitch: 58,
        duration: reduced ? 0 : 1600,
        essential: false,
      });
    },
    setPlaces(places, selected, select) {
      markers.forEach((m) => m.remove());
      markers = places
        .filter((p) => p.source !== 'demo')
        .map((p, i) => {
          const el = document.createElement('button');
          el.className = `voyage-world-marker ${selected === p.id ? 'selected' : ''}`;
          el.textContent = String(i + 1).padStart(2, '0');
          el.setAttribute('aria-label', `Explore ${p.name}`);
          el.onclick = () => select(p.id);
          return new api.Marker({ element: el })
            .setLngLat([p.location.longitude, p.location.latitude])
            .addTo(map);
        });
    },
    destroy() {
      resize.disconnect();
      markers.forEach((m) => m.remove());
      map.remove();
    },
  };
}
