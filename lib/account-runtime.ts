import { accountApi } from './account-service.ts';

// Next.js/Vercel has no Sites dispatcher or D1 binding. Keep account services
// unavailable until a verified identity provider and durable database are wired.
// Never trust the Sites identity headers on a directly accessible Node server.
export function handleAccount(request: Request) {
  return accountApi(request, undefined, {});
}
