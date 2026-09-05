import 'server-only';
import { loadDashboard } from '@/lib/dashboard/service';
import { periods, type Period } from '@/lib/dashboard/model';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get('period') ?? 'Month';
  if (!periods.includes(period as Period))
    return Response.json(
      { error: 'Choose a supported period.' },
      { status: 400 },
    );
  try {
    return Response.json(await loadDashboard(period as Period), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return Response.json(
      { error: 'Your command center could not refresh. Please try again.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
