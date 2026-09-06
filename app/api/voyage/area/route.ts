import 'server-only';
import { authorizeDiscovery } from '@/lib/voyage/spatial/access';
import { createAreaHandler } from '@/lib/voyage/spatial/area';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createAreaHandler({
  token: () => process.env.MAPBOX_SEARCH_TOKEN,
  authorize: authorizeDiscovery,
});
