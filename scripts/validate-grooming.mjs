import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { groomingArtifacts } from './build-grooming-catalog.mjs';
export function validateGrooming(root) {
  const errors=[]; const base=path.join(root,'knowledge/ggc/grooming');
  const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
  const ajv=new Ajv({allErrors:true,strict:false});
  for(const f of fs.readdirSync(path.join(base,'schemas')).filter(f=>f.endsWith('.json')))ajv.addSchema(read('schemas/'+f));
  const check=(schema,value,label)=>{if(!ajv.validate('ggc:grooming:'+schema,value))errors.push(`${label}: ${ajv.errorsText()}`);};
  const unique=(xs,label)=>{if(new Set(xs).size!==xs.length)errors.push(`Duplicate ${label}`);};
  const tax=read('taxonomy.json'); check('taxonomy',tax,'taxonomy');
  const packs=fs.readdirSync(path.join(base,'domains')).filter(f=>f.endsWith('.json')).sort().map(f=>read('domains/'+f));
  for(const p of packs)check('domain',p,p.domain.id);
  const ds=packs.map(p=>p.domain),ms=packs.flatMap(p=>p.modules),ts=packs.flatMap(p=>p.topics);
  const dids=new Set(ds.map(d=>d.id)), mids=new Set(ms.map(m=>m.id)),tids=new Set(ts.map(t=>t.id));
  const seeds=read('source-seeds.json'),sids=new Set(seeds.map(s=>s.id));
  const claims=read('claims.json'), sources=read('research-sources.json');
  const cids=new Set(claims.map(c=>c.id)),rsids=new Set(sources.map(s=>s.id));
  for(const [xs,label] of [[ds.map(d=>d.id),'domain'],[ms.map(m=>m.id),'module'],[ts.map(t=>t.id),'topic'],[seeds.map(s=>s.id),'seed'],[claims.map(c=>c.id),'claim'],[sources.map(s=>s.id),'research source']])unique(xs,label);
  if(JSON.stringify(ds)!==JSON.stringify(tax.domains))errors.push('Taxonomy/domain metadata drift');
  for(const d of ds) {
    if(d.moduleIds.some(id=>!mids.has(id)||!ms.some(m=>m.id===id&&m.domainId===d.id)))errors.push(`${d.id}: invalid module reference`);
    if(d.sourceSeedIds.some(id=>!sids.has(id)))errors.push(`${d.id}: invalid source seed`);
    const levels=ms.filter(m=>m.domainId===d.id).map(m=>m.level);
    if(new Set(levels).size!==4)errors.push(`${d.id}: incomplete levels`);
  }
  for(const m of ms) {
    if(!dids.has(m.domainId)||m.prerequisiteModuleIds.some(id=>!mids.has(id)))errors.push(`${m.id}: broken prerequisite/domain`);
    if(m.topicIds.some(id=>!tids.has(id)||!ts.some(t=>t.id===id&&t.moduleId===m.id)))errors.push(`${m.id}: broken topic references`);
    if(JSON.stringify(m.topicIds)!==JSON.stringify(ts.filter(t=>t.moduleId===m.id).map(t=>t.id)))errors.push(`${m.id}: topic membership drift`);
  }
  const visiting=new Set(),visited=new Set();
  function visit(id){if(visiting.has(id)){errors.push(`Prerequisite cycle: ${id}`);return;}if(visited.has(id))return;visiting.add(id);for(const x of ms.find(m=>m.id===id)?.prerequisiteModuleIds??[])visit(x);visiting.delete(id);visited.add(id);}
  for(const m of ms)visit(m.id);
  for(const t of ts) {
    const m=ms.find(m=>m.id===t.moduleId);
    if(!m||m.domainId!==t.domainId||m.level!==t.level)errors.push(`${t.id}: invalid parent`);
    if(m&&JSON.stringify(m.prerequisiteModuleIds)!==JSON.stringify(t.prerequisiteModuleIds))errors.push(`${t.id}: prerequisite drift`);
    if(t.relatedDomainIds.some(id=>!dids.has(id))||t.sourceSeedIds.some(id=>!sids.has(id))||t.claimIds.some(id=>!cids.has(id)))errors.push(`${t.id}: dangling reference`);
    if(t.workflowState==='PLANNED'&&(t.evidenceState!=='UNASSESSED'||t.reviewedAt!==null||t.reviewer!==null||t.claimIds.length))errors.push(`${t.id}: planned topic presented as researched`);
  }
  for(const s of sources)check('source',s,s.id);
  for(const c of claims){check('claim',c,c.id);if(c.topicIds.some(id=>!tids.has(id))||c.citations.some(e=>!rsids.has(e.sourceId)))errors.push(`${c.id}: dangling evidence/topic`);for(const tid of c.topicIds)if(!ts.find(t=>t.id===tid)?.claimIds.includes(c.id))errors.push(`${c.id}: missing reverse topic reference`);}
  for(const f of fs.readdirSync(path.join(base,'templates')).filter(f=>f.endsWith('.json'))){const t=read('templates/'+f);check(f==='claim.json'?'claim':'asset',t,f);if(t.workflowState!=='PLANNED')errors.push(`${f}: template cannot be released`);}
  const computed=groomingArtifacts(root);
  if(JSON.stringify(read('catalog.json'))!==JSON.stringify(computed.catalog))errors.push('Generated catalog drift');
  if(JSON.stringify(tax.counts)!==JSON.stringify(computed.catalog.counts))errors.push('Coverage counts drift');
  if(fs.readFileSync(path.join(root,'docs/cassius/grooming/curriculum.md'),'utf8')!==computed.curriculum)errors.push('Generated curriculum drift');
  return errors;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const errors=validateGrooming(fileURLToPath(new URL('../',import.meta.url)));
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Grooming schemas, 19 domains, 76 modules, 608 topics, prerequisite graph and generated assets verified.');
}
