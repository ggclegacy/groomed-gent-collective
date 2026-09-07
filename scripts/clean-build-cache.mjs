import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Imported CSS must be rebuilt from the checked-out sources on production builds.
// Keep local development caching; discard only generated Next output on Vercel.
if (process.env.VERCEL === '1') {
  rmSync(fileURLToPath(new URL('../.next', import.meta.url)), { recursive: true, force: true });
}
