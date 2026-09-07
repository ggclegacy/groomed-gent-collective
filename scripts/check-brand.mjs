import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const brand=JSON.parse(readFileSync(new URL('../lib/brand.json',import.meta.url)));
function luminance(hex){const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const pairs=[];
function check(fg,bg,min){const ratio=contrast(brand[fg],brand[bg]);pairs.push({foreground:fg,background:bg,ratio,minimum:min});assert.ok(ratio>=min,`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);}
for(const bg of ['obsidian','surfaceInset','surface','surfaceRaised','green','greenRaised'])for(const fg of ['text','textMuted','textDim','goldLight','success','warning','danger','info'])check(fg,bg,4.5);
for(const bg of ['obsidian','surfaceInset','surface','surfaceRaised','green']){check('gold',bg,4.5);check('borderControl',bg,3);check('greenEdge',bg,3);}
for(const bg of ['gold','goldLight','goldPressed'])check('obsidian',bg,4.5);
for(const bg of ['surface','surfaceRaised','green'])for(const fg of ['gold','chartComparison','chartThird','chartFourth'])check(fg,bg,3);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(`${dir}/${d.name}`):[`${dir}/${d.name}`]);}
const root=new URL('../',import.meta.url).pathname;
for(const file of [...files(root+'app'),...files(root+'components'),...files(root+'lib/creative')].filter(f=>/\.(css|tsx|ts)$/.test(f))){
 const source=readFileSync(file,'utf8');
 assert.ok(!/aubergine|amethyst|purple|violet/i.test(source),`Legacy palette in ${file}`);
 if(file.endsWith('.css')&&!file.endsWith('brand-tokens.css'))assert.ok(!/#[\da-f]{3,8}\b|\brgba?\(|\boklch\(/i.test(source),`Unmanaged literal color in ${file}`);
}
const comparisons=['#B8892E','#C4912F'].map(hex=>({hex,onObsidian:contrast(hex,brand.obsidian),onGreen:contrast(hex,brand.green),onGreenRaised:contrast(hex,brand.greenRaised)}));
writeFileSync(new URL('../docs/rebrand/green/contrast.json',import.meta.url),JSON.stringify({pairs,comparisons},null,2)+'\n');
console.log(`${pairs.length} semantic contrast pairs pass; no legacy palette or unmanaged stylesheet colors.`);
