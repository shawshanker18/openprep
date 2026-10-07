import {GUEST_QUESTIONS} from './questions';
export const GUEST_LIMIT=10;
export const GUEST_KEY='openprep:guest:v1';
let fallback='{}';
export function guestSnapshot(){try{return localStorage.getItem(GUEST_KEY)??fallback}catch{return fallback}}
export function subscribeGuest(fn:()=>void){window.addEventListener('storage',fn);window.addEventListener('guest-answers',fn);return()=>{window.removeEventListener('storage',fn);window.removeEventListener('guest-answers',fn)}}
export function readGuestAnswers(raw:string):Record<string,string>{try{const value=JSON.parse(raw);if(!value||typeof value!=='object')return {};return Object.fromEntries(GUEST_QUESTIONS.filter(q=>q.choices?.some(c=>c.id===value[q.id])).slice(0,GUEST_LIMIT).map(q=>[q.id,value[q.id]]))}catch{return {}}}
export function submitGuestAnswer(id:string,value:string){const answers=readGuestAnswers(guestSnapshot());if(answers[id]||Object.keys(answers).length>=GUEST_LIMIT)return false;if(!GUEST_QUESTIONS.find(q=>q.id===id)?.choices?.some(c=>c.id===value))return false;fallback=JSON.stringify({...answers,[id]:value});try{localStorage.setItem(GUEST_KEY,fallback)}catch{}window.dispatchEvent(new Event('guest-answers'));return true}
