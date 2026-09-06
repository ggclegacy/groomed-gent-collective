import 'server-only';
import { createDiscoveryHandler } from '@/lib/voyage/spatial/discovery';
import { authorizeDiscovery } from '@/lib/voyage/spatial/access';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createDiscoveryHandler({
  token: () => process.env.MAPBOX_SEARCH_TOKEN,
  authorize: authorizeDiscovery,
});
