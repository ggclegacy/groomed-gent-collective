import { createLimiter } from '../../cassius/server.ts';
import {
  demoPlaces,
  intent,
  parseTaste,
  rankPlaces,
  validCoordinates,
  type DiscoveryRequest,
  type Place,
  type PlacesProvider,
} from './model.ts';
export class DiscoveryError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 429 ? { 'Retry-After': '60' } : {}),
    },
  });
export function mapboxPlaces(
  token: string,
  fetcher: typeof fetch = fetch,
): PlacesProvider {
  return {
    async discover(request, signal) {
      const url = new URL('https://api.mapbox.com/search/searchbox/v1/forward');
      url.search = new URLSearchParams({
        q: intent(request.query),
        proximity: `${request.location.longitude},${request.location.latitude}`,
        limit: '10',
        types: 'poi',
        access_token: token,
        language: 'en',
      }).toString();
      const response = await fetcher(url, { signal, cache: 'no-store' });
      if (!response.ok)
        throw new DiscoveryError(
          502,
          'Place search is temporarily unavailable.',
        );
      const data = (await response.json()) as {
        features?: {
          geometry?: { coordinates?: number[] };
          properties?: {
            mapbox_id?: string;
            name?: string;
            poi_category?: string[];
            full_address?: string;
            context?: { place?: { name?: string } };
          };
        }[];
      };
      if (!Array.isArray(data.features))
        throw new DiscoveryError(
          502,
          'Place search returned an invalid response.',
        );
      return data.features.slice(0, 10).flatMap((f): Place[] => {
        const p = f.properties,
          xy = f.geometry?.coordinates,
          location = {
            longitude: xy?.[0] as number,
            latitude: xy?.[1] as number,
          };
        if (
          !p ||
          typeof p.mapbox_id !== 'string' ||
          typeof p.name !== 'string' ||
          !validCoordinates(location)
        )
          return [];
        return [
          {
            id: p.mapbox_id.slice(0, 256),
            name: p.name.slice(0, 180),
            category: Array.isArray(p.poi_category)
              ? p.poi_category
                  .filter((x) => typeof x === 'string')
                  .join(', ')
                  .slice(0, 200)
              : 'place',
            location,
            address:
              typeof p.full_address === 'string'
                ? p.full_address.slice(0, 400)
                : undefined,
            city: p.context?.place?.name,
            source: 'mapbox',
            tags: [],
          },
        ];
      });
    },
  };
}
export async function readDiscoveryRequest(
  request: Request,
): Promise<DiscoveryRequest> {
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new DiscoveryError(403, 'Start discovery from Voyage.');
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
    throw new DiscoveryError(415, 'Use a JSON request.');
  const reader = request.body?.getReader();
  if (!reader) throw new DiscoveryError(400, 'Enter an intention.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  const timer = setTimeout(() => void reader.cancel().catch(() => {}), 5000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 6000) {
        await reader.cancel();
        throw new DiscoveryError(413, 'Discovery request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new DiscoveryError(400, 'Invalid discovery request.');
  }
  const r = raw as Partial<DiscoveryRequest> | null;
  if (
    !r ||
    Array.isArray(r) ||
    typeof r.query !== 'string' ||
    !r.query.trim() ||
    r.query.length > 256 ||
    !validCoordinates(r.location)
  )
    throw new DiscoveryError(
      400,
      'Choose an area and an intention of up to 256 characters.',
    );
  return {
    query: r.query.trim(),
    location: {
      latitude: r.location.latitude,
      longitude: r.location.longitude,
    },
    taste: parseTaste(r.taste),
  };
}
export function createDiscoveryHandler(options: {
  token: () => string | undefined;
  authorize: (request: Request) => Promise<string>;
  provider?: (token: string) => PlacesProvider;
  limit?: ReturnType<typeof createLimiter>;
}) {
  const limiter = options.limit ?? createLimiter();
  return async (request: Request) => {
    let release: (() => void) | undefined;
    try {
      const input = await readDiscoveryRequest(request),
        token = options.token()?.trim();
      if (!token)
        return reply({
          source: 'demo',
          places: rankPlaces(demoPlaces(input.location), input),
          message:
            'Fictional examples. Connect live discovery to find real destinations.',
          attribution: 'Fictional sample data',
        });
      const identity = await options.authorize(request);
      release = limiter(identity);
      // Preferences, home coordinates and natural-language private context stay in this server.
      // Only the normalized category and current search coordinates go to Mapbox.
      const places = await (options.provider ?? mapboxPlaces)(token).discover(
        input,
        AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
      );
      const thematic = /new near|hidden|tonight|weekend|after.hours/i.test(
        input.query,
      );
      return reply({
        source: 'mapbox',
        places: rankPlaces(places, input),
        message: thematic
          ? 'Nearby candidates. Newness, hidden-gem status, opening hours and event availability are unverified.'
          : 'Nearby places, ranked by category and distance. Verify details before you go.',
        attribution: '© Mapbox',
      });
    } catch (e) {
      if (e instanceof DiscoveryError)
        return reply({ error: e.message }, e.status);
      if (e instanceof Error && 'status' in e && e.status === 429)
        return reply(
          { error: 'Please wait a minute before searching again.' },
          429,
        );
      return reply({ error: 'Discovery is temporarily unavailable.' }, 503);
    } finally {
      release?.();
    }
  };
}
