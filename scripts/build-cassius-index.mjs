import fs from 'node:fs';
import path from 'node:path';
const root = new URL('../', import.meta.url);
const base = new URL('knowledge/ggc/', root);
let imports = "// Generated import index. Edit knowledge/ggc records, not this file.\nimport type { Corpus } from './types.ts';\n";
const groups = {};
for (const group of ['products','topics']) {
  const files = fs.readdirSync(new URL(group+'/',base)).filter(f=>f.endsWith('.json')).sort();
  groups[group]=files.map((file,i)=>{const name=group+i;imports+=`import ${name} from '../../knowledge/ggc/${group}/${file}' with { type: 'json' };\n`;return name;});
}
imports+="import sources from '../../knowledge/ggc/sources/registry.json' with { type: 'json' };\nimport issues from '../../knowledge/ggc/issues/open.json' with { type: 'json' };\n";
imports+=`export const corpus = { version: '2026-09-05.1', reviewedAt: '2026-09-05', products: [${groups.products.join(',')}], topics: [${groups.topics.join(',')}], sources, issues } as Corpus;\n`;
// lib/cassius is two directories deep; JSON records live at repository root.
imports=imports.replaceAll("'../../knowledge/", "'../../knowledge/");
fs.writeFileSync(new URL('lib/cassius/corpus.ts',root),imports);
console.log(`Indexed ${groups.products.length} products and ${groups.topics.length} topics.`);
