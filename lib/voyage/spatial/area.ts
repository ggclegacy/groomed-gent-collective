import { createLimiter } from '../../cassius/server.ts';
import { DiscoveryError, readDiscoveryRequest } from './discovery.ts';
import { distance, territories, validCoordinates } from './model.ts';
export function createAreaHandler(options: {
  token: () => string | undefined;
  authorize: (request: Request) => Promise<string>;
  fetcher?: typeof fetch;
}) {
  const limiter = createLimiter();
  const reply = (data: unknown, status = 200) =>
    Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        ...(status === 429 ? { 'Retry-After': '60' } : {}),
      },
    });
  return async (request: Request) => {
    let release: (() => void) | undefined;
    try {
      const { location, query } = await readDiscoveryRequest(request),
        token = options.token();
      const reverse = query === 'area';
      if (!token)
        return reply(
          reverse
            ? { name: null }
            : {
                areas: territories
                  .filter((t) =>
                    t.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((t) => ({
                    name: t.name,
                    location: { latitude: t.latitude, longitude: t.longitude },
                    timeZone: t.timeZone,
                  })),
                message:
                  'Offline area directory. Connect live discovery for other cities.',
              },
        );
      release = limiter(await options.authorize(request));
      const url = new URL(
        `https://api.mapbox.com/search/searchbox/v1/${reverse ? 'reverse' : 'forward'}`,
      );
      url.search = new URLSearchParams({
        ...(reverse
          ? {
              longitude: String(location.longitude),
              latitude: String(location.latitude),
            }
          : { q: query, limit: '5' }),
        types: 'place',
        access_token: token,
        language: 'en',
      }).toString();
      const response = await (options.fetcher ?? fetch)(url, {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(7000)]),
        cache: 'no-store',
      });
      if (!response.ok)
        throw new DiscoveryError(
          502,
          'Area search is temporarily unavailable.',
        );
      const data = (await response.json()) as {
        features?: {
          geometry?: { coordinates?: number[] };
          properties?: {
            name?: string;
            full_address?: string;
            feature_type?: string;
          };
        }[];
      };
      if (!Array.isArray(data.features))
        throw new DiscoveryError(
          502,
          'Area search is temporarily unavailable.',
        );
      if (reverse) {
        const place = data.features.find(
          (f) => f.properties?.feature_type === 'place',
        )?.properties;
        return reply({
          name:
            typeof place?.name === 'string' ? place.name.slice(0, 120) : null,
        });
      }
      const areas = data.features.slice(0, 5).flatMap((f) => {
        const p = f.properties,
          xy = f.geometry?.coordinates,
          point = { longitude: xy?.[0] as number, latitude: xy?.[1] as number };
        if (
          p?.feature_type !== 'place' ||
          typeof p.name !== 'string' ||
          !validCoordinates(point)
        )
          return [];
        return [
          {
            name: (p.full_address || p.name).slice(0, 120),
            location: point,
            timeZone:
              territories.find((t) => distance(t, point) < 12)?.timeZone ??
              null,
          },
        ];
      });
      return reply({
        areas,
        message: areas.length
          ? 'Choose your area. Local time follows your device unless the area time zone is known.'
          : 'No matching cities. Try a city and country.',
      });
    } catch (e) {
      if (e instanceof DiscoveryError)
        return reply({ error: e.message }, e.status);
      if (e instanceof Error && 'status' in e && e.status === 429)
        return reply(
          { error: 'Please wait a minute before searching again.' },
          429,
        );
      return reply({ error: 'Area search is temporarily unavailable.' }, 503);
    } finally {
      release?.();
    }
  };
}
