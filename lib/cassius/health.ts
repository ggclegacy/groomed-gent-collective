import catalog from '../../knowledge/ggc/health/catalog.json' with { type: 'json' };
import type { KnowledgeAnswer } from './types.ts';
import type { ResearchClaim, ResearchSource } from './grooming.ts';

export const healthCurriculumVersion = catalog.version;

export const healthPolicy = 'The health curriculum is an editorial research architecture, not reviewed medical knowledge. Coverage, learning level, evidence certainty, clinical scope and regulatory or marketing approval are separate. No health claims are released in this foundation. Explain uncertainty; never infer diagnosis from symptoms or laboratory values, prescribe or adjust medication/hormones, clear interactions, supply injection/cycle protocols or source unapproved compounds. Do not invent optimal laboratory ranges. Build care-navigation questions without requiring unnecessary sensitive information. No health profile, lab upload or consultation persistence is enabled. Clinical review and exact applicability are required before health claims can be used; biological plausibility, advisory votes, research labels and ingredient studies do not establish product efficacy or approval. Preserve Groomed Gent’s practical, respectful voice and avoid supplement-first selling.';

export type HealthArea = 'general' | 'nutrition' | 'fitness' | 'sleep' | 'mental-wellbeing' | 'hormones' | 'sexual-fertility' | 'supplements' | 'biomarkers' | 'longevity-biohacking';
export interface HealthIntake {
  area: HealthArea;
  goal?: string;
  questionType?: 'education' | 'care-navigation' | 'personal-medical-decision';
  currentHabits?: string;
  timeBudgetAccess?: string;
  lifeStage?: string;
  careTeamContext?: string;
  // Optional; asking about sensitive details is not a prerequisite to education.
  reportedUrgency?: 'none' | 'medical-emergency' | 'immediate-self-harm-risk';
  medicationOrLabDecisionRequested?: boolean;
}
export interface HealthPlan {
  version:string;
  state:'clarify'|'research-needed'|'clinical-handoff'|'urgent-handoff';
  domainIds:string[];
  missingFields:string[];
  questions:string[];
  reason:string;
  recommendation:null;
  diagnosis:null;
  persistence:'none';
}
const domains:Record<HealthArea,string[]>={general:['H03','H32'],nutrition:['H04','H05','H32'],fitness:['H08','H09','H10','H32'],sleep:['H11','H32'],'mental-wellbeing':['H12','H31','H32'],hormones:['H14','H15','H32'],'sexual-fertility':['H16','H17','H32'],supplements:['H21','H22','H36'],biomarkers:['H23','H24','H32'],'longevity-biohacking':['H26','H27','H28','H32']};
const urgentMedical='If these symptoms are happening now, seek urgent medical assessment through your local emergency services. Do not wait for Cassius or continue a wellness experiment.';
const urgentMental='If you may act on thoughts of harming yourself now, contact local emergency services or a crisis service, and reach out to someone you trust who can stay with you. Cassius cannot provide emergency monitoring.';
export function buildHealthConsultationPlan(intake:HealthIntake):HealthPlan {
  const selected=Object.hasOwn(domains,intake.area)?domains[intake.area]:domains.general;
  const base={version:catalog.version,domainIds:selected,missingFields:[] as string[],questions:[] as string[],recommendation:null,diagnosis:null,persistence:'none' as const};
  if(intake.reportedUrgency && intake.reportedUrgency!=='none')return {...base,state:'urgent-handoff',reason:intake.reportedUrgency==='immediate-self-harm-risk'?urgentMental:urgentMedical};
  if(intake.questionType==='personal-medical-decision'||intake.medicationOrLabDecisionRequested)return {...base,state:'clinical-handoff',reason:'A qualified clinician or pharmacist needs to assess this decision. I can help prepare questions, but cannot diagnose, interpret your results as a diagnosis, prescribe, adjust a dose or confirm an interaction is safe.'};
  const slots=[['goal','What would you like to understand or improve?'],['questionType','Are you looking for general education or help preparing for a health appointment?'],['currentHabits','Which part of your current routine feels most relevant? Share only what you are comfortable sharing.'],['timeBudgetAccess','What time, budget or access constraints should the discussion respect?']] as const;
  const missing=slots.filter(([k])=>!intake[k]?.trim());
  return {...base,state:missing.length?'clarify':'research-needed',missingFields:missing.map(([k])=>k),questions:missing.slice(0,3).map(([,q])=>q),reason:missing.length?'Start with the goal and context, not a supplement or protocol.':'The context is ready, but no reviewed health claims have been released. Personalized guidance is withheld until appropriate evidence and clinical review are available.'};
}
const norm=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const phrase=(q:string,s:string)=>(` ${q} `).includes(` ${norm(s)} `);
export function findHealthTopics(question:string,limit=8){
  const q=norm(question),tokens=new Set(q.split(' ').filter(x=>x.length>3));
  return catalog.domains.flatMap(d=>d.topics.map(t=>({id:t.id,title:t.title,level:t.level,domainId:d.id,score:(phrase(q,t.title)?20:0)+norm(t.title).split(' ').filter(x=>tokens.has(x)).length+(d.aliases.some(a=>phrase(q,a))?2:0)})))
    .filter(t=>t.score>=2).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(limit,32)));
}
export interface HealthRoute {priority:'urgent'|'curriculum'|'boundary'|'normal';answer:KnowledgeAnswer}
/** Conservative routing hints, not a validated symptom classifier. No-match never means safe. */
export function routeHealthQuestion(question:string,corpusVersion:string):HealthRoute|null {
  const q=norm(question);
  const finish=(priority:HealthRoute['priority'],state:KnowledgeAnswer['state'],text:string):HealthRoute=>({priority,answer:{state,text,passages:[],citations:[],mode:'local-evidence',corpusVersion,productIds:[]}});
  if(/\b(kill myself|going to hurt myself|want to die|about to harm myself)\b/.test(q))return finish('urgent','safety-boundary',urgentMental);
  if(/\b((?:i have|im having|i am having|my) (?:severe )?chest pain|cant breathe|cannot breathe|trouble breathing|difficulty breathing|i think im having a stroke|sudden one sided weakness|i just overdosed)\b/.test(q))return finish('urgent','safety-boundary',urgentMedical);
  const planning=/\b(curriculum|mastery map|research roadmap|knowledge architecture|learning plan|foundation topics)\b/.test(q);
  const groomingContext=/\b(grooming|skin|skincare|beard|hair|shaving|soap|cosmetic|topical)\b/.test(q);
  const distinctHealth=/\b(health|wellness|hormones|testosterone|trt|steroid|sarms|biohacking|longevity|systemic|inject|injection|injectable|fertility|nutrition|supplements|sleep)\b/.test(q);
  if(groomingContext&&!distinctHealth)return null;
  // Brand descriptions continue to use the existing observed-brand corpus.
  if(!planning && /\b(brand|four pillars|groomed gent|sanctum|legacy reserve)\b/.test(q) && !/\b(my|dose|inject|diagnos|symptom|interact)\b/.test(q))return null;
  const matched=catalog.domains.filter(d=>d.aliases.some(a=>phrase(q,a))||phrase(q,d.title));
  const broad=/\b(mens health|men health|wellness|health curriculum|health consultation|health plan|wellness plan)\b/.test(q);
  if(!matched.length&&!broad&&!distinctHealth)return null;
  const medicalAction=/\b(dose|dosage|prescribe|diagnose|diagnosis for me|adjust my|increase my|stop my|interpret my|my lab results|reconstitute|inject|injection|injecting|dosing|steroid cycle|trt protocol|where (?:can i )?buy.*(?:bpc|peptide|sarm)|is it safe|safe with|safe for me|can i take|should i take|stack for me)\b/.test(q);
  if(medicalAction)return finish('boundary','safety-boundary','I can help organize the evidence and questions for a qualified clinician or pharmacist. I cannot diagnose from symptoms or labs, give personalized medication or hormone doses, clear interactions, provide injection or cycle protocols, or source unapproved compounds. No reviewed health evidence is released in this foundation.');
  if(planning){
    const ds=broad?catalog.domains:matched.length?matched:catalog.domains;
    return finish('curriculum','answered',`Cassius Men's Health, Wellness, Hormones & Biohacking Intelligence: ${catalog.counts.domains} domains, ${catalog.counts.modules} modules and ${catalog.counts.topics.toLocaleString('en-US')} research topics across Foundation → Mastery → Advanced → Frontier.\n\n${ds.map(d=>`${d.id} · ${d.title}\n${d.outcome}`).join('\n\n')}\n\nThis is an editorial research map. All topics are planned and unassessed; zero scientific health claims are released. Source acquisition, domain/evidence/clinical review and applicability checks come next.`);
  }
  if(/\b(consultation|build.*(?:routine|plan)|create.*(?:routine|plan)|help me (?:improve|plan|prepare)|wellness plan|health plan)\b/.test(q)){
    const area:HealthArea=/hormone|testosterone|trt/.test(q)?'hormones':/sleep|fatigue/.test(q)?'sleep':/nutrition|diet/.test(q)?'nutrition':/fitness|training|exercise/.test(q)?'fitness':/mental|stress/.test(q)?'mental-wellbeing':/fertil|sexual/.test(q)?'sexual-fertility':/supplement/.test(q)?'supplements':/lab|biomarker/.test(q)?'biomarkers':/longevity|biohack/.test(q)?'longevity-biohacking':'general';
    const p=buildHealthConsultationPlan({area});
    return finish('normal','clarify',`Let's start with what matters to you.\n\n${p.questions.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nCassius can structure this discussion, but its health research library still awaits source ingestion and clinical review. This submission does not create a stored health profile.`);
  }
  const ts=findHealthTopics(question,4);
  return finish('normal','unknown',`This is covered by Cassius's health research curriculum, but reviewed evidence is not yet available to answer it.\n\n${ts.map(t=>`${t.id} · ${t.level} · ${t.title}`).join('\n')}\n\nResearch coverage is not a diagnosis, treatment recommendation, proof of benefit or product approval.`);
}

/** Post-schema eligibility only. A future retriever must also match population, condition and exposure. */
export function healthClaimBlockers(claim:ResearchClaim,sources:ResearchSource[],today:string):string[]{
  const errors:string[]=[];
  const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  if(!date(today))return ['Invalid evaluation date'];
  if(claim.workflowState!=='RELEASED')errors.push('Not released');
  if(!['ESTABLISHED','SUPPORTED'].includes(claim.evidenceState))errors.push('Not eligible for health guidance');
  if(claim.provenanceStatus!=='VERIFIED')errors.push('Unverified provenance');
  if(claim.scope!=='HEALTH_EDUCATION')errors.push('Clinical or research scope; no personalized advice');
  if(claim.visibility!=='PUBLIC'||!claim.publicSummary?.trim())errors.push('No approved public summary');
  if(claim.conflictIds.length)errors.push('Unresolved conflict');
  if(!claim.citations.some(c=>c.relation==='SUPPORTS'))errors.push('Missing supporting evidence');
  for(const c of claim.citations){const s=sources.find(x=>x.id===c.sourceId);if(!c.locator.trim()||!c.excerpt.trim()||!s||s.state!=='REVIEWED'||s.visibility!=='PUBLIC'||!s.reviewerId?.trim()||!['PERMITTED','LINK_ONLY'].includes(s.rights.status)||!s.correctionOrRetractionCheckedAt||!date(s.correctionOrRetractionCheckedAt)||s.correctionOrRetractionCheckedAt>today)errors.push(`Unusable source ${c.sourceId}`);}
  const accepted=[];
  for(const role of ['domain-specialist','evidence-reviewer','clinical-reviewer']){
    const review=claim.reviews.find(r=>r.role===role&&r.decision==='ACCEPT'&&r.reviewerId.trim()&&date(r.reviewedAt)&&date(r.nextReviewAt)&&r.reviewedAt<=today&&r.nextReviewAt>today&&r.nextReviewAt>r.reviewedAt);
    if(!review)errors.push(`Missing or expired ${role}`);else accepted.push(review.reviewerId);
  }
  if(new Set(accepted).size<2)errors.push('Independent review required');
  if(claim.reviews.some(r=>r.decision!=='ACCEPT'))errors.push('Unresolved review decision');
  return errors;
}
