export type Coordinates = { latitude: number; longitude: number };
export type Territory = Coordinates & { name: string; timeZone: string };
export type Taste = {
  version: 1;
  quiet: boolean;
  locallyOwned: boolean;
  maxPrice: 1 | 2 | 3 | 4;
  crowd: 'calm' | 'social' | 'either';
  context: 'everyday' | 'work' | 'date' | 'business';
  categories: string[];
  home: Territory | null;
};
export type Place = {
  id: string;
  name: string;
  category: string;
  location: Coordinates;
  address?: string;
  city?: string;
  source: 'demo' | 'mapbox';
  tags: string[];
  rating?: number;
  reviewCount?: number;
  price?: number;
  open?: boolean;
  photos?: { url: string; attribution: string }[];
};
export type RankedPlace = Place & {
  match: number;
  rationale: string[];
  distanceKm: number;
  scoring: 'heuristic-v1';
};
export type DiscoveryRequest = {
  query: string;
  location: Coordinates;
  taste: Taste;
};
export type DiscoveryResult = {
  places: RankedPlace[];
  source: 'demo' | 'mapbox';
  message: string;
  attribution: string;
};
export interface PlacesProvider {
  discover(request: DiscoveryRequest, signal: AbortSignal): Promise<Place[]>;
}
export interface GeolocationProvider {
  locate(): Promise<Coordinates>;
}
export interface WorldAdapter {
  flyTo(location: Coordinates, close?: boolean): void;
  setPlaces(
    places: RankedPlace[],
    selected: string,
    select: (id: string) => void,
  ): void;
  destroy(): void;
}
export interface ConciergeProvider {
  rank(request: DiscoveryRequest, places: Place[]): Promise<RankedPlace[]>;
}
export interface ContextProvider {
  kind:
    | 'calendar'
    | 'weather'
    | 'hotels'
    | 'flights'
    | 'events'
    | 'transportation'
    | 'itinerary';
  read(
    location: Coordinates,
    signal: AbortSignal,
  ): Promise<{ summary: string; observedAt: string; sourceUrl?: string }[]>;
}
export interface ReservationProvider {
  availability(
    placeId: string,
    at: string,
  ): Promise<{ url: string; checkedAt: string }[]>;
}
export interface NavigationProvider {
  destination(place: Place): string | null;
}
export type TasteEvent = {
  kind: 'save' | 'dismiss' | 'visit';
  placeId: string;
  category: string;
  at: string;
  source: 'explicit-user-action';
};
export const defaultTaste: Taste = {
  version: 1,
  quiet: false,
  locallyOwned: false,
  maxPrice: 3,
  crowd: 'either',
  context: 'everyday',
  categories: [],
  home: null,
};
export const lafayette: Territory = {
  name: 'Lafayette, Louisiana',
  latitude: 30.2241,
  longitude: -92.0198,
  timeZone: 'America/Chicago',
};
export const territories: Territory[] = [
  lafayette,
  {
    name: 'New Orleans, Louisiana',
    latitude: 29.9511,
    longitude: -90.0715,
    timeZone: 'America/Chicago',
  },
  {
    name: 'Austin, Texas',
    latitude: 30.2672,
    longitude: -97.7431,
    timeZone: 'America/Chicago',
  },
  {
    name: 'New York, New York',
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: 'America/New_York',
  },
];
export const views = [
  'Cassius picks',
  'New near you',
  'Worth trying',
  'Tonight',
  'Saved',
  'Hidden gems',
  'Best places to work',
  'After-hours',
  'Date ideas',
  'Weekend',
  'Recovery / Wellness',
  'Barbers',
  'Gyms',
  'Restaurants / Coffee',
] as const;
export function validCoordinates(v: unknown): v is Coordinates {
  const x = v as Coordinates | null;
  return (
    !!x &&
    typeof x.latitude === 'number' &&
    Number.isFinite(x.latitude) &&
    Math.abs(x.latitude) <= 90 &&
    typeof x.longitude === 'number' &&
    Number.isFinite(x.longitude) &&
    Math.abs(x.longitude) <= 180
  );
}
export function distance(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const d =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(d), Math.sqrt(Math.max(0, 1 - d)));
}
export function territoryContext(
  location: Coordinates,
  home: Territory | null,
) {
  return !home
    ? 'EXPLORING'
    : distance(location, home) <= 60
      ? 'HOME TERRITORY'
      : 'AWAY';
}
export function parseTaste(raw: unknown): Taste {
  const x = raw as Partial<Taste> | null;
  if (!x || x.version !== 1) return { ...defaultTaste };
  let home: Territory | null = null;
  if (
    x.home &&
    validCoordinates(x.home) &&
    typeof x.home.name === 'string' &&
    x.home.name.length <= 120 &&
    typeof x.home.timeZone === 'string'
  ) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: x.home.timeZone });
      home = { ...x.home };
    } catch {
      /* Ignore invalid device data. */
    }
  }
  return {
    version: 1,
    quiet: x.quiet === true,
    locallyOwned: x.locallyOwned === true,
    maxPrice: [1, 2, 3, 4].includes(x.maxPrice as number) ? x.maxPrice! : 3,
    crowd: ['calm', 'social', 'either'].includes(x.crowd ?? '')
      ? x.crowd!
      : 'either',
    context: ['everyday', 'work', 'date', 'business'].includes(x.context ?? '')
      ? x.context!
      : 'everyday',
    categories: Array.isArray(x.categories)
      ? x.categories
          .filter((v): v is string => typeof v === 'string' && v.length < 60)
          .slice(0, 20)
      : [],
    home,
  };
}
export function intent(query: string) {
  const q = query.toLowerCase();
  if (/barber|haircut|groom/.test(q)) return 'barber';
  if (/gym|train|fitness/.test(q)) return 'gym';
  if (/wellness|recovery|spa/.test(q)) return 'spa';
  if (/work|quiet|coffee|café/.test(q)) return 'coffee';
  if (/drink|after.hours|cocktail|bar\b/.test(q)) return 'cocktail bar';
  if (/dinner|date|restaurant|tonight|premium/.test(q)) return 'restaurant';
  return 'places to visit';
}
export function rankPlaces(
  places: Place[],
  request: DiscoveryRequest,
): RankedPlace[] {
  const wanted = intent(request.query),
    quiet =
      request.taste.quiet ||
      ['work', 'business'].includes(request.taste.context) ||
      /quiet|work/i.test(request.query);
  return places
    .filter((p) => distance(request.location, p.location) <= 35)
    .map((p) => {
      const km = distance(request.location, p.location),
        reasons: string[] = [];
      let score = 45 + Math.max(0, 20 - km * 2);
      if (
        wanted === 'places to visit' ||
        p.category.includes(wanted) ||
        p.tags.includes(wanted)
      ) {
        score += 16;
        reasons.push(`A ${p.category} option for this request.`);
      }
      if (quiet && p.tags.includes('quiet')) {
        score += 9;
        reasons.push('Quiet ambience is tagged in this sample.');
      }
      if (request.taste.locallyOwned && p.tags.includes('locally owned')) {
        score += 5;
        reasons.push('Locally owned, according to the supplied place data.');
      }
      if (p.price !== undefined && p.price > request.taste.maxPrice) {
        score -= 18;
        reasons.push('Above your preferred price range.');
      }
      if (p.open === false) {
        score -= 25;
        reasons.push('Listed as closed.');
      }
      if (request.taste.context === 'date' && p.tags.includes('date')) {
        score += 5;
        reasons.push('Tagged for a date setting in the supplied data.');
      }
      if (
        request.taste.crowd !== 'either' &&
        p.tags.includes(request.taste.crowd)
      ) {
        score += 4;
        reasons.push('Matches your stated crowd preference.');
      }
      if (request.taste.categories.includes(p.category)) {
        score += 4;
        reasons.push('Matches a category you selected.');
      }
      if (!reasons.length) reasons.push('A nearby alternative to explore.');
      reasons.push(
        `${km.toFixed(1)} km straight-line distance; travel time is not calculated.`,
      );
      if (p.source === 'mapbox')
        reasons.push(
          'Ambience, crowd levels and independent ownership are unverified.',
        );
      return {
        ...p,
        match: Math.max(0, Math.min(99, Math.round(score))),
        rationale: reasons,
        distanceKm: km,
        scoring: 'heuristic-v1' as const,
      };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);
}
export const navigation = (
  provider: 'apple' | 'google',
): NavigationProvider => ({
  destination(place) {
    if (place.source === 'demo') return null;
    const point = `${place.location.latitude},${place.location.longitude}`;
    return provider === 'apple'
      ? `https://maps.apple.com/?daddr=${encodeURIComponent(point)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point)}`;
  },
});
export function demoPlaces(location: Coordinates): Place[] {
  return [
    [
      'The Stillroom',
      'coffee',
      ['quiet', 'locally owned', 'work'],
      0.003,
      -0.004,
      2,
    ],
    ['Maison No. 8', 'restaurant', ['date', 'locally owned'], -0.004, 0.003, 3],
    ['Form & Field', 'gym', ['gym', 'wellness'], 0.005, 0.006, 2],
    [
      'The Night Archive',
      'cocktail bar',
      ['after-hours', 'date'],
      -0.002,
      -0.006,
      3,
    ],
    ['The Ritual House', 'spa', ['quiet', 'wellness'], 0.006, -0.001, 3],
    [
      'The Brass Chair',
      'barber',
      ['barber', 'locally owned'],
      -0.006,
      0.004,
      2,
    ],
  ].map(([name, category, tags, lat, lng, price], i) => ({
    id: `demo-${i}`,
    name: String(name),
    category: String(category),
    tags: tags as string[],
    location: {
      latitude: Math.max(-90, Math.min(90, location.latitude + Number(lat))),
      longitude: ((location.longitude + Number(lng) + 540) % 360) - 180,
    },
    price: Number(price),
    source: 'demo',
  }));
}
