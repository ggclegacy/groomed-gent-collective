import test from 'node:test';
import assert from 'node:assert/strict';
import { commerceConfiguration } from '../lib/commerce/config.ts';

void test('configuration is disabled and incomplete without credentials', () => {
  const result = commerceConfiguration({});
  assert.equal(result.enabledRequested, false);
  assert.equal(result.configurationComplete, false);
  assert.equal(result.productionReady, false);
});
void test('configuration rejects untrusted destinations and never returns secret values', () => {
  const env = {
    SHOPIFY_SHOP_DOMAIN: 'https://attacker.test', SHOPIFY_CLIENT_ID: 'client',
    SHOPIFY_CLIENT_SECRET: 'private-value', DATABASE_URL: 'private-database',
    CLERK_SECRET_KEY: 'private-clerk', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'public',
    GGC_OWNER_ID: 'owner', COMMERCE_WORKER_SECRET: 'short',
    GGC_ACCOUNT_PROVIDER: 'clerk-neon', SHOPIFY_AUTH_MODE: 'client_credentials',
    SHOPIFY_SAME_ORGANIZATION_CONFIRMED: 'true', GGC_COMMERCE_ENVIRONMENT: 'staging',
    NEXT_PUBLIC_SHOPIFY_CLIENT_SECRET: 'leaked-value',
  };
  const result = commerceConfiguration(env);
  assert.ok(result.issues.includes('invalid:SHOPIFY_SHOP_DOMAIN'));
  assert.ok(result.issues.includes('unsafe:public-commerce-credential'));
  assert.ok(result.issues.includes('invalid:worker-secret-length'));
  for (const value of ['private-value', 'private-database', 'private-clerk', 'leaked-value'])
    assert.equal(JSON.stringify(result).includes(value), false);
  env.SHOPIFY_SHOP_DOMAIN = 'collective-test.myshopify.com';
  env.COMMERCE_WORKER_SECRET = 'a'.repeat(64);
  env.NEXT_PUBLIC_SHOPIFY_CLIENT_SECRET = '';
  assert.equal(commerceConfiguration(env).configurationComplete, true);
  assert.equal(commerceConfiguration(env).productionReady, false);
});
