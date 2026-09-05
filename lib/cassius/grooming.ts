import catalog from '../../knowledge/ggc/grooming/catalog.json' with { type: 'json' };
import type { KnowledgeAnswer } from './types.ts';

export const groomingPolicy = 'The grooming curriculum is an editorial research plan, never scientific evidence. All 608 topics start unassessed. Do not infer expertise, a credential, treatment advice or product efficacy from coverage. Evidence strength, source observation, professional scope and commercial approval are separate. Ask at most three relevant questions at a time. Explain options only from eligible reviewed claims; otherwise acknowledge the gap. Respect texture, skin tone, culture, budget and fragrance preferences. Do not retain consultation health details in browser storage. Preserve the existing brand voice, exact product identities and Product Studio approvals.';

export type ConsultationArea = 'hair' | 'beard' | 'shaving' | 'skin' | 'body' | 'general';
export interface ConsultationIntake {
  area: ConsultationArea;
  goal?: string;
  texture?: string;
  density?: string;
  length?: string;
  skinOrScalp?: string;
  currentRoutine?: string;
  allergyOrReactionHistory?: string;
  fragranceTolerance?: string;
  desiredFinish?: string;
  climate?: string;
  budget?: string;
  routineComplexity?: string;
  bodySite?: string;
  // User-reported signals, not a diagnosis inferred from a photograph or an LLM.
  redFlags?: ('urgent-symptoms' | 'persistent-or-worsening' | 'possible-infection' | 'sudden-hair-loss' | 'changing-lesion')[];
  requestsMedicalDecision?: boolean;
}
export interface ConsultationPlan {
  version: string;
  state: 'urgent-handoff' | 'professional-handoff' | 'clarify' | 'research-needed';
  domainIds: string[];
  missingFields: string[];
  questions: string[];
  constraints: string[];
  recommendation: null;
  reason: string;
  persistence: 'none';
}
const areaDomains: Record<ConsultationArea, string[]> = {
  hair: ['D01','D02','D03','D09','D16','D19'],
  beard: ['D04','D06','D09','D19'],
  shaving: ['D05','D06','D16','D19'],
  skin: ['D06','D07','D09','D19'],
  body: ['D14','D09','D16','D19'],
  general: ['D19'],
};
const slotQuestions: Partial<Record<keyof ConsultationIntake,string>> = {
  goal: 'What would you like to improve?',
  texture: 'How would you describe the hair texture or curl pattern?',
  density: 'How dense or sparse does the hair feel?',
  length: 'What length are you maintaining?',
  skinOrScalp: 'How does the underlying skin or scalp feel, including any irritation?',
  currentRoutine: 'Which products and tools do you currently use, and how often?',
  allergyOrReactionHistory: 'Have you had allergies or reactions to grooming products?',
  fragranceTolerance: 'Do you prefer fragrance-free products, or is scent comfortable for you?',
  desiredFinish: 'What hold, finish or feel do you want?',
  climate: 'What climate and daily activities does the routine need to suit?',
  budget: 'What budget feels comfortable?',
  routineComplexity: 'How many steps and how much time would you prefer?',
  bodySite: 'Which body area are you grooming?',
};
const areaSlots: Record<ConsultationArea,(keyof ConsultationIntake)[]> = {
  hair:['goal','skinOrScalp','allergyOrReactionHistory','texture','density','length','currentRoutine','desiredFinish','climate','fragranceTolerance','budget','routineComplexity'],
  beard:['goal','skinOrScalp','allergyOrReactionHistory','length','density','texture','currentRoutine','fragranceTolerance','desiredFinish','climate','budget','routineComplexity'],
  shaving:['goal','skinOrScalp','allergyOrReactionHistory','texture','currentRoutine','fragranceTolerance','budget','routineComplexity'],
  skin:['goal','skinOrScalp','allergyOrReactionHistory','currentRoutine','fragranceTolerance','climate','budget','routineComplexity'],
  body:['goal','bodySite','skinOrScalp','allergyOrReactionHistory','currentRoutine','fragranceTolerance','budget','routineComplexity'],
  general:['goal','currentRoutine','routineComplexity'],
};
export function buildConsultationPlan(intake: ConsultationIntake): ConsultationPlan {
  const base = { version:catalog.version, domainIds:areaDomains[intake.area] ?? areaDomains.general,
    missingFields:[] as string[], questions:[] as string[], constraints:['Category before brand','No product match without current identity-specific evidence','No diagnosis, prescribing, medication clearance or invasive procedure instructions'],
    recommendation:null, persistence:'none' as const };
  if (intake.redFlags?.includes('urgent-symptoms')) return {...base,state:'urgent-handoff',reason:'Pause the grooming consultation and seek urgent medical assessment for the reported urgent symptoms.'};
  if (intake.requestsMedicalDecision || intake.redFlags?.length) return {...base,state:'professional-handoff',reason:'A qualified clinician should assess this concern before a personalized grooming recommendation.'};
  const slots=areaSlots[intake.area] ?? areaSlots.general;
  const missing=slots.filter(key => typeof intake[key] !== 'string' || !(intake[key] as string).trim());
  return {...base,state:missing.length?'clarify':'research-needed',missingFields:missing,
    questions:missing.slice(0,3).map(key => slotQuestions[key]!),
    reason:missing.length?'Understand the person and routine before selecting products.':'Intake is complete. No reviewed grooming claims have been released; a personalized recommendation is withheld pending source ingestion.'};
}

const normalize=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const phrase=(q:string,s:string)=>(` ${q} `).includes(` ${normalize(s)} `);
export function findGroomingTopics(question:string,limit=8) {
  const q=normalize(question); const tokens=new Set(q.split(' ').filter(x=>x.length>3));
  return catalog.domains.flatMap(d=>d.topics.map(t=>({id:t.id,title:t.title,level:t.level,domainId:d.id,
    score:(phrase(q,t.title)?20:0)+t.title.toLowerCase().split(/[^a-z0-9]+/).filter(x=>tokens.has(x)).length+(d.aliases.some(a=>phrase(q,a))?2:0)})))
    .filter(t=>t.score>=2).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(limit,32)));
}
/** Reuses the existing answer contract. Planning passages are never added as clinical evidence. */
export function answerGroomingQuestion(question:string,corpusVersion:string):KnowledgeAnswer|null {
  const q=normalize(question);
  const explicit=/\b(curriculum|mastery map|research roadmap|knowledge architecture|learning plan|foundation topics)\b/.test(q);
  const matched=catalog.domains.filter(d=>d.aliases.some(a=>phrase(q,a)) || phrase(q,d.title));
  const consultation=/\b(what should i use|build.*routine|create.*routine|help.*(?:beard|hair|skin|shav|body)|consultation)\b/.test(q);
  const urgent=/\b(cannot breathe|cant breathe|trouble breathing|difficulty breathing|severe allergic reaction|chemical burn|eye injury)\b/.test(q);
  const referral=/\b(sudden hair loss|changing mole|nonhealing|non healing|spreading rash|pus|infected)\b/.test(q);
  if (!explicit && !matched.length && !consultation && !urgent && !referral) return null;
  const finish=(state:KnowledgeAnswer['state'],text:string):KnowledgeAnswer=>({state,text,passages:[],citations:[],mode:'local-evidence',corpusVersion,productIds:[]});
  if (urgent || referral) return finish('safety-boundary',buildConsultationPlan({area:'general',redFlags:[urgent?'urgent-symptoms':'persistent-or-worsening']}).reason);
  if (consultation && !explicit) {
    const area:ConsultationArea=/beard|mustache/.test(q)?'beard':/shav|razor/.test(q)?'shaving':/scalp|hair/.test(q)?'hair':/body|groin|underarm/.test(q)?'body':/skin|face/.test(q)?'skin':'general';
    const plan=buildConsultationPlan({area});
    return finish('clarify',`Let's shape this around your routine.\n\n${plan.questions.map((v,i)=>`${i+1}. ${v}`).join('\n')}\n\nCassius's grooming research curriculum is installed, but its scientific source library has not yet been reviewed. I can structure the consultation; a personalized product recommendation needs that evidence.`);
  }
  const ds=matched.length?matched:catalog.domains;
  if (explicit) return finish('answered',`Cassius Men's Grooming Intelligence: ${catalog.counts.domains} domains, ${catalog.counts.modules} modules and ${catalog.counts.topics} research topics across Foundation → Mastery → Advanced → Frontier.\n\n${ds.map(d=>`${d.id} · ${d.title}\n${d.outcome}`).join('\n\n')}\n\nThis is an editorial curriculum. All topics are planned and unassessed; zero scientific claims are released. Source acquisition, expert appraisal and review are still required.`);
  const ts=findGroomingTopics(question,4);
  return finish('unknown',`This subject is included in Cassius's research curriculum, but I do not yet have reviewed grooming evidence to answer it.\n\n${ts.map(t=>`${t.id} · ${t.level} · ${t.title}`).join('\n')}\n\nThese are research topics, not proof of a benefit or product recommendation.`);
}

export interface ResearchSource {
  id:string; state:string; rights:{status:string}; visibility:string;
  correctionOrRetractionCheckedAt:string|null; reviewerId:string|null;
}
export interface ResearchClaim {
  workflowState:string; evidenceState:string; provenanceStatus:string; scope:string; visibility:string;
  publicSummary:string|null; conflictIds:string[];
  citations:{sourceId:string;locator:string;excerpt:string;relation:string}[];
  reviews:{reviewerId:string;role:string;reviewedAt:string;nextReviewAt:string;decision:string}[];
}
/** Defense in depth after JSON-schema and referential validation; never enables commercial claims. */
export function claimAnswerBlockers(claim:ResearchClaim,sources:ResearchSource[],today:string):string[] {
  const errors:string[]=[];
  const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
  if(!validDate(today))return ['Invalid evaluation date'];
  if(claim.workflowState!=='RELEASED')errors.push('Claim not released');
  if(!['ESTABLISHED','SUPPORTED','TRADITIONAL','FORMULATION_RATIONALE'].includes(claim.evidenceState))errors.push('Evidence not eligible for routine guidance');
  if(claim.provenanceStatus!=='VERIFIED')errors.push('Source observation not verified');
  if(claim.scope!=='GROOMING_EDUCATION')errors.push('Professional or medical scope requires handoff');
  if(claim.visibility!=='PUBLIC'||!claim.publicSummary?.trim())errors.push('No approved public summary');
  if(claim.conflictIds.length)errors.push('Unresolved conflicts');
  if(!claim.citations.some(c=>c.relation==='SUPPORTS'))errors.push('No supporting citation');
  for(const c of claim.citations) {
    const s=sources.find(x=>x.id===c.sourceId);
    if(!c.locator.trim()||!c.excerpt.trim()||!s||s.state!=='REVIEWED'||!s.reviewerId?.trim()||s.visibility!=='PUBLIC'||!['PERMITTED','LINK_ONLY'].includes(s.rights.status)||!s.correctionOrRetractionCheckedAt||!validDate(s.correctionOrRetractionCheckedAt)||s.correctionOrRetractionCheckedAt>today)errors.push(`Unusable source ${c.sourceId}`);
  }
  for(const role of ['domain-specialist','evidence-reviewer'])if(!claim.reviews.some(r=>r.role===role && r.decision==='ACCEPT' && r.reviewerId.trim() && validDate(r.reviewedAt) && validDate(r.nextReviewAt) && r.reviewedAt<=today && r.nextReviewAt>today && r.nextReviewAt>r.reviewedAt))errors.push(`Missing or expired ${role} review`);
  if(claim.reviews.some(r=>r.decision!=='ACCEPT'))errors.push('Unresolved review decision');
  return errors;
}
