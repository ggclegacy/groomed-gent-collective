import { handleAccount } from '@/lib/account-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handleAccount;
export const POST = handleAccount;
export const PUT = handleAccount;
