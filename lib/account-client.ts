export async function accountRequest<T>(
  path: string,
  method = 'GET',
  value?: unknown,
): Promise<T> {
  const response = await fetch(`/api/account${path}`, {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers:
      value === undefined ? undefined : { 'Content-Type': 'application/json' },
    ...(method === 'GET' ? {} : { body: JSON.stringify(value) }),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error ?? 'Member services are unavailable.');
  return data;
}
