import {beforeEach,expect,it,vi} from 'vitest';
import {GUEST_KEY,GUEST_LIMIT,readGuestAnswers,submitGuestAnswer} from './state';
import {GUEST_QUESTIONS} from './questions';
const values=new Map<string,string>();
beforeEach(()=>{values.clear();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});vi.stubGlobal('window',{dispatchEvent:vi.fn()});values.set(GUEST_KEY,'{}');});
it('shares the ten-question allowance across subjects and rejects an eleventh answer',()=>{for(const q of GUEST_QUESTIONS.slice(0,GUEST_LIMIT))expect(submitGuestAnswer(q.id,'A')).toBe(true);expect(submitGuestAnswer(GUEST_QUESTIONS[10]!.id,'B')).toBe(false);expect(Object.keys(readGuestAnswers(values.get(GUEST_KEY)!))).toHaveLength(10);});
it('does not count duplicate submissions or accept unknown questions and choices',()=>{expect(submitGuestAnswer('g-m1','B')).toBe(true);expect(submitGuestAnswer('g-m1','A')).toBe(false);expect(submitGuestAnswer('fake','A')).toBe(false);expect(submitGuestAnswer('g-m2','Z')).toBe(false);expect(readGuestAnswers(values.get(GUEST_KEY)!)).toEqual({'g-m1':'B'});});
it('handles invalid stored data without crashing',()=>{expect(readGuestAnswers('null')).toEqual({});expect(readGuestAnswers('broken')).toEqual({});expect(readGuestAnswers('{"g-m1":"Z"}')).toEqual({});});
