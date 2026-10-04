// Only unsaved input, never question text or answers. Keys include the current user and session.
export type DraftAnswer={id:string;position:number;response:string|null;flagged:boolean;timeMs:number};
export function readDraft(key:string):DraftAnswer[] {
  try {
    const data=JSON.parse(localStorage.getItem(key)||'null');
    if(!data || !Number.isFinite(data.at) || Date.now()-data.at>24*3600_000 || !Array.isArray(data.answers)) return [];
    return data.answers.slice(0,200).filter((a:DraftAnswer)=>a && /^[\w-]{22}$/.test(a.id) && Number.isInteger(a.position) && a.position>=0 && a.position<200 &&
      (a.response===null || typeof a.response==='string' && a.response.length<=8) && typeof a.flagged==='boolean' && Number.isFinite(a.timeMs) && a.timeMs>=0 && a.timeMs<=86400_000);
  } catch { return []; }
}
export function writeDraft(key:string,answers:DraftAnswer[]) {
  try {
    if(answers.length) localStorage.setItem(key,JSON.stringify({at:Date.now(),answers}));
    else localStorage.removeItem(key);
    return true;
  } catch { return false; }
}

export type PracticeProgress = { seen:string[]; answered:number; correct:number; ms:number };
export function readPracticeProgress(key:string):PracticeProgress {
  const empty={seen:[],answered:0,correct:0,ms:0};
  try {
    const data=JSON.parse(localStorage.getItem(`${key}:progress`) || 'null');
    const p=data?.progress;
    if(!Number.isFinite(data?.at) || Date.now()-data.at>24*3600_000 || !p || !Array.isArray(p.seen) ||
      !Number.isInteger(p.answered) || p.answered<0 || !Number.isInteger(p.correct) || p.correct<0 || p.correct>p.answered ||
      !Number.isFinite(p.ms) || p.ms<0) return empty;
    return {seen:p.seen.filter((id:unknown)=>typeof id==='string' && /^[\w-]{22}$/.test(id)).slice(-200),answered:p.answered,correct:p.correct,ms:p.ms};
  } catch { return empty; }
}
export function writePracticeProgress(key:string,progress:PracticeProgress|null) {
  try {
    if(progress) localStorage.setItem(`${key}:progress`,JSON.stringify({at:Date.now(),progress:{...progress,seen:progress.seen.slice(-200)}}));
    else localStorage.removeItem(`${key}:progress`);
  } catch { /* Practice remains usable when browser storage is blocked. */ }
}
