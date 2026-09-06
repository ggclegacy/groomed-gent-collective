import { corpus } from '../cassius/corpus.ts';
import { productBrain, getDossier } from './runtime.ts';
import { flatten, type Field } from './schema.ts';
import type {
  KnowledgeBase,
  Product,
  Fact,
  Revision,
  RoomSection,
  Ingredient,
  Category,
} from '../product-knowledge.ts';
/** Product Studio is a projection of the shared registry; never edit these objects as source data. */
export function studioKnowledge(
  concepts: KnowledgeBase,
  categoryOptions: readonly Category[] = [],
): KnowledgeBase {
  const draft: Revision = {
    version: productBrain.version,
    status: 'draft',
    lastVerifiedAt: null,
    verifiedBy: null,
    sourceIds: [],
  };
  const fact = (id: string, f: Field): Fact => ({
    ...draft,
    id,
    text: f.value ?? '',
    status: f.status === 'verified' ? 'approved' : 'draft',
    verifiedBy: f.verifiedBy,
    lastVerifiedAt: f.verifiedAt,
    sourceIds: f.evidence.map((e) => e.sourceId),
  });
  const mapping: Record<string, RoomSection> = {
    identity: 'What It Is',
    formula: 'How It Works',
    use: 'How To Use It',
    safety: "Who It's For",
    education: 'How To Talk About It',
    claims: 'Science & Sources',
  };
  const ingredients: Ingredient[] = [];
  const products: Product[] = corpus.products.map((p) => {
    const d = getDossier(p.id);
    const identity = d?.sections.identity.officialName;
    const facts: Product['facts'] = {};
    if (d)
      for (const [path, f] of flatten(d))
        if (f.status === 'verified' && f.layer === 'ggc' && f.value) {
          const section = mapping[path.split('.')[0]];
          if (section)
            (facts[section] ??= []).push(
              fact(`${p.id}.r${d.revision}.${path}`, f),
            );
        }
    const verifiedRows =
      d?.ingredients.filter((row) => row.fields.name.status === 'verified') ??
      [];
    for (const row of verifiedRows) {
      const name = row.fields.name;
      ingredients.push({
        ...fact(`${p.id}:${row.id}`, name),
        name: name.value!,
        whatItIs: null,
        purpose:
          row.fields.role.status === 'verified'
            ? fact(`${p.id}:${row.id}:role`, row.fields.role)
            : null,
        evidence: [],
        synergies: [],
        takeaways: [],
        simpleExplanation: null,
        deepDive: null,
      });
    }
    return {
      ...draft,
      id: p.id,
      name: p.name,
      descriptor: d
        ? 'Product dossier · ' + (identity?.status ?? 'unknown')
        : 'Website record · awaiting founder intake',
      categories:
        d?.sections.identity.category.status === 'verified'
          ? categoryOptions.filter((c) =>
              d.sections.identity.category.value
                ?.toLowerCase()
                .split(/[^a-z]+/)
                .includes(c.toLowerCase()),
            )
          : [],
      concept: false,
      facts,
      formula:
        d?.sections.formula.completeDeclaration.status === 'verified' &&
        verifiedRows.length
          ? {
              version:
                d.sections.formula.version.value ?? `revision-${d.revision}`,
              ingredients: verifiedRows.map((row) => ({
                ingredientId: `${p.id}:${row.id}`,
                amount:
                  row.fields.concentration.status === 'verified'
                    ? fact(`${p.id}:${row.id}:amount`, row.fields.concentration)
                    : null,
              })),
            }
          : null,
      claims: [],
      pricing: null,
      faq: [],
      objections: [],
      competitorNotes: [],
      talkingPoints: [],
      ...(identity
        ? {
            status:
              identity.status === 'verified'
                ? ('approved' as const)
                : ('draft' as const),
            verifiedBy: identity.verifiedBy,
            lastVerifiedAt: identity.verifiedAt,
            sourceIds: identity.evidence.map((e) => e.sourceId),
          }
        : {}),
    };
  });
  const sources = productBrain.products.flatMap(({ dossier: d, sources }) =>
    sources.map((s) => {
      const reviewed = flatten(d)
        .map(([, f]) => f)
        .find(
          (f) =>
            f.status === 'verified' &&
            f.evidence.some((e) => e.sourceId === s.id),
        );
      return {
        ...draft,
        id: s.id,
        title: s.kind + ' product source',
        kind:
          s.kind === 'website'
            ? ('policy' as const)
            : s.kind === 'competitor'
              ? ('research' as const)
              : s.kind,
        locator: s.locator,
        status: reviewed ? ('approved' as const) : ('draft' as const),
        verifiedBy: reviewed?.verifiedBy ?? null,
        lastVerifiedAt: reviewed?.verifiedAt ?? null,
      };
    }),
  );
  return {
    ...concepts,
    version: corpus.version,
    products: [...concepts.products, ...products],
    ingredients,
    sources: [
      ...new Map(
        [...concepts.sources, ...sources].map((s) => [s.id, s]),
      ).values(),
    ],
  };
}
