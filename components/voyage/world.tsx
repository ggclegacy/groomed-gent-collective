'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type {
  Coordinates,
  RankedPlace,
  WorldAdapter,
} from '@/lib/voyage/spatial/model';
import { createMapboxWorld } from '@/lib/voyage/spatial/mapbox';
export function VoyageWorld({
  location,
  places,
  selected,
  select,
  preset,
  recenter,
}: {
  location: Coordinates;
  places: RankedPlace[];
  selected: string;
  select: (id: string) => void;
  preset: string;
  recenter: number;
}) {
  const container = useRef<HTMLDivElement>(null),
    adapter = useRef<WorldAdapter | null>(null);
  const [state, setState] = useState('Atmospheric preview');
  const [ready, setReady] = useState(0);
  const initialLocation = useEffectEvent(() => location);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  useEffect(() => {
    if (!token || !container.current) return;
    let disposed = false;
    let world: WorldAdapter | null = null;
    void createMapboxWorld(
      container.current,
      token,
      initialLocation(),
      preset,
      matchMedia('(prefers-reduced-motion: reduce)').matches,
      () =>
        setState('Map connection interrupted · discovery remains available'),
    )
      .then((w) => {
        if (disposed) {
          w.destroy();
          return;
        }
        world = w;
        adapter.current = w;
        setState('Mapbox · 3D where available');
        setReady((v) => v + 1);
      })
      .catch(() => setState('3D unavailable · atmospheric preview'));
    return () => {
      disposed = true;
      world?.destroy();
      adapter.current = null;
    };
    // Location updates use the existing camera rather than recreating WebGL.
  }, [token, preset]);
  useEffect(() => {
    adapter.current?.flyTo(location);
  }, [location, recenter, ready]);
  useEffect(() => {
    adapter.current?.setPlaces(places, selected, select);
    const place = places.find((p) => p.id === selected);
    if (place?.source === 'mapbox')
      adapter.current?.flyTo(place.location, true);
  }, [places, selected, select, ready]);
  return (
    <div className="voyage-world">
      <div className="voyage-atmosphere" aria-hidden="true">
        <div className="voyage-radar">
          <i />
          <i />
          <i />
          <span>V</span>
        </div>
      </div>
      <div
        ref={container}
        className="voyage-map"
        aria-label="Interactive world map"
      />
      <span className="voyage-world-status">{state}</span>
    </div>
  );
}
