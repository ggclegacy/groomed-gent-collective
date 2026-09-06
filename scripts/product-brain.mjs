import { readFile, writeFile, rename, mkdir, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyDossier, coverage } from '../lib/product-brain/schema.ts';
import { ingest, release, validateStore } from '../lib/product-brain/store.ts';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const dir=resolve(root,'knowledge/ggc/product-brain');
const storePath=resolve(dir,'store.json');
const indexPath=resolve(dir,'release.json');
const [command,inputPath]=process.argv.slice(2);
const encode=x=>JSON.stringify(x,null,2)+'\n';
async function atomic(path,data) { const tmp=path+'.tmp'; await writeFile(tmp,data,{mode:0o600}); await rename(tmp,path); }
await mkdir(dir,{recursive:true});
if (command==='template') {
  if (!inputPath || !/^[a-z0-9][a-z0-9-]{0,100}$/.test(inputPath)) throw new Error('Provide a stable product ID');
  console.log(encode({idempotencyKey:inputPath+'-intake-1',expectedRevision:null,intelligence:[],sources:[],dossier:emptyDossier(inputPath)}));
} else {
  const lock=await open(resolve(dir,'.ingest.lock'),'wx');
  try {
    const store=JSON.parse(await readFile(storePath,'utf8')); validateStore(store);
    if (command==='check') {
      if (await readFile(indexPath,'utf8')!==encode(release(store))) throw new Error('Product index is stale; run product-brain reindex');
      console.log('Product history, provenance and generated index verified');
    } else if (command==='reindex') { await atomic(indexPath,encode(release(store))); console.log('Index rebuilt from immutable history'); }
    else if (command==='preview' || command==='apply') {
      if (!inputPath) throw new Error('Provide a submission JSON file');
      const input=JSON.parse(await readFile(resolve(inputPath),'utf8'));
      const next=ingest(store,input);
      console.log(encode({productId:input.dossier.productId,revision:input.dossier.revision,unchanged:next===store,coverage:coverage(input.dossier)}));
      if (command==='apply') {
        // A crash between writes fails the mandatory prebuild check; reindex repairs it.
        await atomic(storePath,encode(next)); await atomic(indexPath,encode(release(next)));
        console.log('Saved source, immutable revision and refreshed shared index');
      }
    } else throw new Error('Use template, preview, apply, check or reindex');
  } finally { await lock.close(); await unlink(resolve(dir,'.ingest.lock')); }
}
