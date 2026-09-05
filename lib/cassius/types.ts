export type EvidenceStatus = 'CANONICAL' | 'VERIFIED' | 'DISPUTED' | 'UNKNOWN' | 'EDITORIAL';
export interface Evidence { sourceId: string; locator: string }
export interface Fact<T = unknown> { value: T | null; status: EvidenceStatus; evidence: Evidence[]; note: string | null }
export interface Source { id: string; title: string; url: string; kind: string; authority: string; retrievedAt?: string; reviewedAt: string; status: string; snapshot?: string; sha256?: string }
export interface LabelRow { name: string; amountText: string; sourceId: string; locator: string }
export interface Product {
  id: string; handle: string; shopifyProductId: string; name: string; catalogTitle: string; aliases: string[];
  familyId: string; flavor: string | null; line: string; kind: 'supplement' | 'cosmetic'; version: string; lifecycle: string;
  identity: Fact; purpose: Fact<string>; ingredients: Fact<string>; supplementFacts: Fact<LabelRow[]>;
  serving: Fact<string>; otherIngredients: Fact<string>; proprietaryBlend: Fact<string>;
  directions: Fact<string>; protocol: Fact<string>; safety: Fact<string>; price: Fact;
  approvedClaims: string[]; manufacturerFormula: Fact; research: Fact; issueIds: string[];
  pairings: Fact<{productId: string; relationship: string}>[];
}
export interface Topic { id: string; title: string; tags: string[]; version: string; facts: (Fact<string> & {id: string})[] }
export interface Issue { id: string; status: 'OPEN' | 'RESOLVED'; productIds: string[]; fields: string[]; summary: string; evidence: Evidence[]; resolutionNeeded: string }
export interface Corpus { version: string; reviewedAt: string; products: Product[]; topics: Topic[]; sources: Source[]; issues: Issue[] }
export interface Citation { title: string; url: string; sourceId: string; locator: string; retrievedAt: string; factId: string; status: EvidenceStatus; authority: string }
export interface Passage { id: string; title: string; text: string; status: EvidenceStatus; citations: Citation[] }
export interface KnowledgeAnswer { text: string; citations: Citation[]; passages: Passage[]; mode: 'local-evidence'; state: 'answered' | 'unknown' | 'clarify' | 'safety-boundary'; corpusVersion: string; productIds: string[] }
