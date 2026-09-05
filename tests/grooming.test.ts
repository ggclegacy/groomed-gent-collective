import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { validateGrooming } from '../scripts/validate-grooming.mjs';
import { answerKnowledge, buildKnowledgeContext } from '../lib/cassius/retrieval.ts';
import { buildConsultationPlan, findGroomingTopics, claimAnswerBlockers, type ResearchClaim, type ResearchSource } from '../lib/cassius/grooming.ts';
import { corpus } from '../lib/cassius/corpus.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=(p:string)=>JSON.parse(fs.readFileSync(path.join(root,'knowledge/ggc/grooming',p),'utf8'));
void test('complete curriculum validates with all 19 domains, four levels and zero released claims',()=>{
  assert.deepEqual(validateGrooming(root),[]);
  assert.deepEqual(read('catalog.json').counts,{domains:19,modules:76,topics:608,releasedClaims:0});
});
void test('knowledge surfaces curriculum while preserving product and brand retrieval',()=>{
  const response=answerKnowledge('Show the Cassius grooming curriculum');
  assert.equal(response.state,'answered');
  assert.match(response.text,/608 research topics/);assert.match(response.text,/D19/);assert.deepEqual(response.citations,[]);
  assert.match(answerKnowledge('Restoria ingredients').text,/275 mg/);
  assert.match(answerKnowledge('Introduce the brand').text,/Groomed Gent/);
  assert.ok(corpus.products.every(p=>p.approvedClaims.length===0));
});
void test('planned curriculum cannot become scientific evidence or a product recommendation',()=>{
  const answer=answerKnowledge('Explain hair porosity');
  assert.equal(answer.state,'unknown');assert.deepEqual(answer.passages,[]);assert.deepEqual(answer.citations,[]);
  assert.match(answer.text,/do not yet have reviewed/);
  assert.ok(findGroomingTopics('hair porosity').some(t=>/Porosity/.test(t.title)));
  const context=buildKnowledgeContext('grooming curriculum');
  assert.match(context.policy,/never scientific evidence/);assert.deepEqual(context.passages,[]);
  assert.equal(buildKnowledgeContext('grooming curriculum',200).state,'clarify');
});
void test('consultation prioritizes missing details, limits questions, and never fabricates suitability',()=>{
  const plan=buildConsultationPlan({area:'beard'});
  assert.equal(plan.state,'clarify');assert.equal(plan.questions.length,3);assert.equal(plan.recommendation,null);assert.equal(plan.persistence,'none');
  assert.equal(answerKnowledge('What should I use on my beard?').state,'clarify');
  const filled=buildConsultationPlan({area:'beard',goal:'softness',skinOrScalp:'comfortable',allergyOrReactionHistory:'none reported',texture:'coily',density:'dense',length:'short',currentRoutine:'wash',fragranceTolerance:'none',desiredFinish:'matte',climate:'humid',budget:'limited',routineComplexity:'two steps'});
  assert.equal(filled.state,'research-needed');assert.equal(filled.recommendation,null);
});
void test('red flags interrupt consultation including when a product is named',()=>{
  assert.equal(buildConsultationPlan({area:'skin',redFlags:['urgent-symptoms']}).state,'urgent-handoff');
  assert.equal(buildConsultationPlan({area:'hair',redFlags:['sudden-hair-loss']}).state,'professional-handoff');
  assert.equal(buildConsultationPlan({area:'skin',requestsMedicalDecision:true}).state,'professional-handoff');
  assert.match(answerKnowledge('Trouble breathing after Barber’s Blend').text,/urgent medical assessment/);
  assert.equal(answerKnowledge('Can Reneuva regrow hair?').state,'safety-boundary');
});
void test('claim gate rejects expired reviews, private sources, marketing assertions and unresolved evidence',()=>{
  // Synthetic gate fixtures only; no grooming fact is certified by this test.
  const sources:ResearchSource[]=[{id:'fixture',state:'REVIEWED',rights:{status:'PERMITTED'},visibility:'PUBLIC',reviewerId:'test-source-reviewer',correctionOrRetractionCheckedAt:'2026-09-01'}];
  const claim:ResearchClaim={workflowState:'RELEASED',evidenceState:'SUPPORTED',provenanceStatus:'VERIFIED',scope:'GROOMING_EDUCATION',visibility:'PUBLIC',publicSummary:'Synthetic test statement',conflictIds:[],citations:[{sourceId:'fixture',locator:'test section',excerpt:'Synthetic evidence',relation:'SUPPORTS'}],reviews:['domain-specialist','evidence-reviewer'].map(role=>({reviewerId:'test-'+role,role,reviewedAt:'2026-09-01',nextReviewAt:'2026-10-01',decision:'ACCEPT'}))};
  assert.deepEqual(claimAnswerBlockers(claim,sources,'2026-09-05'),[]);
  for(const [field,value] of [['workflowState','PLANNED'],['evidenceState','MARKETING_CLAIM'],['evidenceState','EMERGING'],['provenanceStatus','DISPUTED'],['scope','MEDICAL_REFERRAL'],['visibility','CONFIDENTIAL']] as const)assert.ok(claimAnswerBlockers({...claim,[field]:value},sources,'2026-09-05').length);
  assert.ok(claimAnswerBlockers(claim,sources,'2026-10-01').length);
  assert.ok(claimAnswerBlockers({...claim,conflictIds:['unresolved']},sources,'2026-09-05').length);
  assert.ok(claimAnswerBlockers(claim,[],'2026-09-05').length);
  assert.ok(claimAnswerBlockers(claim,[{...sources[0],visibility:'CONFIDENTIAL'}],'2026-09-05').length);
  assert.ok(claimAnswerBlockers(claim,sources,'2026-02-31').length);
});
void test('strict schemas reject invented metadata and releasing an unfilled claim',()=>{
  const ajv=new Ajv({strict:false});
  for(const f of fs.readdirSync(path.join(root,'knowledge/ggc/grooming/schemas')))ajv.addSchema(read('schemas/'+f));
  const claim=read('templates/claim.json');
  assert.equal(ajv.validate('ggc:grooming:claim',claim),true);
  assert.equal(ajv.validate('ggc:grooming:claim',{...claim,workflowState:'RELEASED'}),false);
  assert.equal(ajv.validate('ggc:grooming:claim',{...claim,inventedApproval:true}),false);
  assert.equal(ajv.validate('ggc:grooming:consultation-plan',buildConsultationPlan({area:'beard'})),true);
});
void test('validator catches dangling prerequisites, cycles and generated-index drift',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cassius-grooming-test-'));
  try {
    fs.cpSync(path.join(root,'knowledge/ggc/grooming'),path.join(tmp,'knowledge/ggc/grooming'),{recursive:true});
    fs.cpSync(path.join(root,'docs/cassius/grooming'),path.join(tmp,'docs/cassius/grooming'),{recursive:true});
    const p=path.join(tmp,'knowledge/ggc/grooming/domains/D01.json');
    const pack=JSON.parse(fs.readFileSync(p,'utf8'));pack.modules[0].prerequisiteModuleIds=['D01-F','MISSING'];fs.writeFileSync(p,JSON.stringify(pack));
    const errors=validateGrooming(tmp);
    assert.ok(errors.some(e=>e.includes('broken prerequisite')));assert.ok(errors.some(e=>e.includes('Prerequisite cycle')));assert.ok(errors.some(e=>e.includes('curriculum drift')));
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
