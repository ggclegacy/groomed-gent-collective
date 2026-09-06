import { creatorBrief } from './model.ts';
import type { Dossier } from '../product-brain/schema.ts';
import { productBrain } from '../product-brain/runtime.ts';
import { blankDraft, type StudioDraft } from '../studio.ts';
// Carries only a product identifier across views. Creator Studio resolves current facts itself.
export function productHandoffUrl(id: string) {
  return `?productBrief=${encodeURIComponent(id)}#studio`;
}
export function resolveProductHandoff(
  search: string,
  id: string,
  now: string,
): StudioDraft | null {
  const productId = new URLSearchParams(search).get('productBrief');
  const d: Dossier | undefined = productBrain.products.find(
    (p) => p.dossier.productId === productId,
  )?.dossier;
  if (!d) return null;
  return {
    ...blankDraft(id, now),
    title:
      `Product brief · ${d.sections.identity.officialName.value ?? d.productId}`.slice(
        0,
        100,
      ),
    body: creatorBrief(
      d,
      'Select and verify your relationship disclosure before publishing.',
    ).slice(0, 8000),
  };
}
