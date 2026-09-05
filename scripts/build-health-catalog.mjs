import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function healthArtifacts(root) {
  const base=path.join(root,'knowledge/ggc/health');
  const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
  const taxonomy=read('taxonomy.json');
  const packs=fs.readdirSync(path.join(base,'domains')).filter(f=>f.endsWith('.json')).sort().map(f=>read('domains/'+f));
  const topics=packs.flatMap(p=>p.topics);
  const catalog={version:taxonomy.version,counts:{domains:packs.length,modules:packs.flatMap(p=>p.modules).length,topics:topics.length,releasedClaims:read('claims.json').filter(c=>c.workflowState==='RELEASED').length},domains:packs.map(({domain:d,topics})=>({id:d.id,title:d.title,aliases:d.aliases,outcome:d.outcome,topics:topics.map(t=>({id:t.id,title:t.title,level:t.level}))}))};
  const md=['# Cassius foundational Men’s Health, Wellness, Hormones & Biohacking Intelligence curriculum',`\nVersion ${taxonomy.version} · ${taxonomy.createdAt} · ${catalog.counts.domains} domains · ${catalog.counts.modules} modules · ${topics.length} topics.\n`,'Every entry below is a research assignment, not an established claim. Each JSON topic carries its current workflow and evidence state; research topics themselves are never answer-eligible. Source ingestion and expert assessment must precede claim release.\n','The four levels describe learning complexity, not evidence strength. Frontier material may remain unproven indefinitely. The six layers connect biology and evidence, daily practice, clinical literacy, interventions, measurement/frontier research and consultation/governance.\n'];
  for(const {domain:d,modules,topics} of packs) {
    md.push(`## ${d.id}. ${d.title}\n`,`Layer: ${taxonomy.layers.find(l=>l.id===d.primaryLayer).title}. ${d.outcome}\n`);
    for(const m of modules) {
      md.push(`### ${m.level} — ${m.id}\n`,`Prerequisites: ${m.prerequisiteModuleIds.join(', ')||'None'}. Assessment: ${m.assessment}\n`);
      md.push(...topics.filter(t=>t.moduleId===m.id).map(t=>`- **${t.id}** — ${t.title}`),'');
    }
  }
  return {catalog,curriculum:md.join('\n')+'\n'};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=fileURLToPath(new URL('../',import.meta.url));
  const {catalog,curriculum}=healthArtifacts(root);
  fs.writeFileSync(path.join(root,'knowledge/ggc/health/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
  fs.writeFileSync(path.join(root,'docs/cassius/health/curriculum.md'),curriculum);
  console.log(`Generated health index: ${catalog.counts.domains} domains, ${catalog.counts.topics} topics.`);
}
