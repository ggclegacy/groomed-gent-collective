import { env } from 'cloudflare:workers';
import { accountApi } from './account-service';
interface Bindings {
  DB?: D1Database;
  GGC_IDENTITY_MODE?: string;
  GGC_OWNER_ID?: string;
}
export function handleAccount(request: Request) {
  const bindings = env as unknown as Bindings;
  return accountApi(request, bindings.DB, {
    mode: bindings.GGC_IDENTITY_MODE,
    ownerId: bindings.GGC_OWNER_ID,
  });
}
