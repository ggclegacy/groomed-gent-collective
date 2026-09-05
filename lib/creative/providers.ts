import {
  CreativeError,
  ratios,
  type CreativeProvider,
  type ProviderRequest,
} from './types.ts';
const unavailable =
  'The creative engine is temporarily unavailable. Your brief is preserved.';
export function openAIProvider(
  key: string | undefined,
  model = 'gpt-image-2',
  fetcher: typeof fetch = fetch,
): CreativeProvider {
  return {
    id: 'openai',
    capabilities: ['generate', 'edit', 'background', 'inpaint'],
    ready: () => !!key,
    async generate(input) {
      const [w, h] = ratios[input.ratio];
      const fields = {
        model,
        prompt: input.prompt,
        size: `${w}x${h}`,
        quality: 'medium',
        n: '1',
        output_format: 'jpeg',
        output_compression: '85',
      };
      let body: string | FormData = JSON.stringify({
        ...fields,
        n: 1,
        output_compression: 85,
      });
      if (input.reference) {
        const form = new FormData();
        for (const [k, v] of Object.entries(fields)) form.set(k, v);
        for (const [k, data] of [
          ['image', input.reference],
          ['mask', input.mask],
        ] as const)
          if (data) {
            const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(
              data,
            )!;
            form.set(
              k,
              new Blob([Buffer.from(match[2], 'base64')], { type: match[1] }),
              `${k}.${match[1].split('/')[1]}`,
            );
          }
        body = form;
      }
      const response = await fetcher(
        `https://api.openai.com/v1/images/${input.reference ? 'edits' : 'generations'}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            ...(typeof body === 'string'
              ? { 'Content-Type': 'application/json' }
              : {}),
          },
          body,
          signal: input.signal,
          cache: 'no-store',
        },
      );
      if (!response.ok) {
        if (response.status === 429)
          throw new CreativeError(
            429,
            'Cassius is at capacity. Wait a minute before trying again.',
          );
        if (response.status === 400 || response.status === 422)
          throw new CreativeError(
            422,
            'This brief or image could not be processed. Adjust the request or reference image.',
          );
        // Only definite pre-execution configuration failures permit another adapter.
        throw new CreativeError(502, unavailable, response.status === 404);
      }
      const data = (await response.json()) as {
        data?: { b64_json?: unknown }[];
        usage?: unknown;
      };
      const image = data?.data?.[0]?.b64_json;
      if (
        typeof image !== 'string' ||
        image.length > 4000000 ||
        !/^[A-Za-z0-9+/]+=*$/.test(image)
      )
        throw new CreativeError(502, unavailable);
      return {
        image: `data:image/jpeg;base64,${image}`,
        usage: data.usage ?? null,
      };
    },
  };
}
/** Register a tested adapter here. Unconfigured providers cannot silently receive user images. */
export function futureProvider(
  id: 'imagen' | 'flux' | 'ideogram' | 'video',
): CreativeProvider {
  return {
    id,
    capabilities: id === 'video' ? ['video'] : ['generate'],
    ready: () => false,
    async generate() {
      throw new CreativeError(
        503,
        'This creative capability is not connected.',
      );
    },
  };
}
export async function routeGeneration(
  providers: CreativeProvider[],
  request: ProviderRequest,
) {
  const candidates = providers.filter(
    (p) => p.ready() && p.capabilities.includes(request.operation),
  );
  for (const provider of candidates) {
    try {
      return await provider.generate(request);
    } catch (error) {
      if (!(error instanceof CreativeError) || !error.retryable) throw error;
    }
  }
  throw new CreativeError(503, unavailable);
}
