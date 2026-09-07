import { API_VERSION, shopDomain } from './model.ts';

/** Configuration inspection only: no network, secret values, or activation side effects. */
export function commerceConfiguration(env: Record<string, string | undefined>) {
  const issues: string[] = [];
  for (const key of ['SHOPIFY_SHOP_DOMAIN', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET',
    'DATABASE_URL', 'CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'GGC_OWNER_ID', 'COMMERCE_WORKER_SECRET']) {
    if (!env[key]?.trim()) issues.push(`missing:${key}`);
  }
  if (env.SHOPIFY_SHOP_DOMAIN) {
    try { shopDomain(env.SHOPIFY_SHOP_DOMAIN); }
    catch { issues.push('invalid:SHOPIFY_SHOP_DOMAIN'); }
  }
  if (env.GGC_ACCOUNT_PROVIDER !== 'clerk-neon') issues.push('unsupported:account-provider');
  if (env.SHOPIFY_AUTH_MODE !== 'client_credentials') issues.push('unsupported:auth-mode');
  if (env.SHOPIFY_SAME_ORGANIZATION_CONFIRMED !== 'true') issues.push('unverified:shop-organization');
  if (!['local', 'staging', 'production'].includes(env.GGC_COMMERCE_ENVIRONMENT ?? ''))
    issues.push('invalid:commerce-environment');
  if (env.COMMERCE_WORKER_SECRET && env.COMMERCE_WORKER_SECRET.length < 32)
    issues.push('invalid:worker-secret-length');
  if (env.COMMERCE_WORKER_SECRET && env.COMMERCE_WORKER_SECRET === env.SHOPIFY_CLIENT_SECRET)
    issues.push('invalid:worker-secret-reuse');
  for (const key of Object.keys(env)) {
    if (key.startsWith('NEXT_PUBLIC_') && /SHOPIFY|COMMERCE_WORKER/.test(key) && env[key])
      issues.push('unsafe:public-commerce-credential');
  }
  return {
    apiVersion: API_VERSION,
    enabledRequested: env.GGC_COMMERCE_ENABLED === 'true',
    configurationComplete: issues.length === 0,
    // This checkpoint has no live route bindings, scheduler, or approved store policy.
    productionReady: false as const,
    issues: [...new Set(issues)],
  };
}
