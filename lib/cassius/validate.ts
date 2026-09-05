import type { Corpus, Fact } from './types.ts';
export function validateCorpus(db: Corpus): string[] {
 const errors: string[]=[];
 const unique=(values:string[],label:string)=>{if(new Set(values).size!==values.length)errors.push(`Duplicate ${label}`);};
 unique(db.products.map(p=>p.id),'product ID');unique(db.products.map(p=>p.shopifyProductId),'Shopify identity');unique(db.sources.map(s=>s.id),'source ID');unique(db.issues.map(i=>i.id),'issue ID');unique(db.topics.map(t=>t.id),'topic ID');
 const sources=new Set(db.sources.map(s=>s.id));const products=new Set(db.products.map(p=>p.id));
 const check=(f:Fact,label:string)=>{
  if(!['CANONICAL','VERIFIED','DISPUTED','UNKNOWN','EDITORIAL'].includes(f.status))errors.push(`${label}: invalid status`);
  if(f.status==='UNKNOWN' && (f.value!==null || !f.note))errors.push(`${label}: unknown must be null with a reason`);
  if(f.status!=='UNKNOWN' && (f.value===null || !f.evidence.length))errors.push(`${label}: missing evidence/value`);
  for(const e of f.evidence)if(!sources.has(e.sourceId)||!e.locator)errors.push(`${label}: invalid evidence`);
 };
 for(const p of db.products){
  if(!p.version || !p.aliases.length || !p.shopifyProductId)errors.push(`${p.id}: identity/version missing`);
  for(const key of ['identity','purpose','ingredients','supplementFacts','serving','otherIngredients','proprietaryBlend','directions','protocol','safety','price','manufacturerFormula','research'] as const)check(p[key],p.id+'.'+key);
  for(const row of p.supplementFacts.value??[]) if(!row.name||!row.amountText||!sources.has(row.sourceId)||!row.locator)errors.push(`${p.id}: malformed label row`);
  if(p.approvedClaims.length)errors.push(`${p.id}: this release has no approved claim dossier`);
  for(const f of p.pairings){check(f,p.id+'.pairing');if(!f.value||!products.has(f.value.productId))errors.push(`${p.id}: missing pairing target`);}
  for(const id of p.issueIds)if(!db.issues.some(i=>i.id===id&&i.productIds.includes(p.id)))errors.push(`${p.id}: dangling issue`);
 }
 for(const t of db.topics)for(const f of t.facts)check(f,f.id);
 for(const i of db.issues){for(const id of i.productIds)if(!products.has(id))errors.push(`${i.id}: unknown product`);for(const e of i.evidence)if(!sources.has(e.sourceId)||!e.locator)errors.push(`${i.id}: invalid evidence`);}
 return errors;
}
