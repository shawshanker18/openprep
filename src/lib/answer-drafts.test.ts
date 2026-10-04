import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readDraft, writeDraft, readPracticeProgress, writePracticeProgress } from './answer-drafts';

describe('browser answer recovery',()=>{
  let storage:Map<string,string>;
  beforeEach(()=>{
    storage=new Map();
    vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
  });
  afterEach(()=>vi.unstubAllGlobals());
  it('restores inputs only under the same user/session key',()=>{
    const answer={id:'a'.repeat(22),position:0,response:'B',flagged:false,timeMs:500};
    writeDraft('user-one:test',[answer]);
    expect(readDraft('user-one:test')).toEqual([answer]);
    expect(readDraft('user-two:test')).toEqual([]);
  });
  it('restores bounded set totals without storing question content',()=>{
    const progress={seen:Array(205).fill('a'.repeat(22)),answered:3,correct:2,ms:1500};
    writePracticeProgress('user:practice',progress);
    expect(readPracticeProgress('user:practice')).toEqual({...progress,seen:progress.seen.slice(-200)});
    writePracticeProgress('user:practice',null);
    expect(readPracticeProgress('user:practice').answered).toBe(0);
  });
  it('ignores expired or malformed recovery data',()=>{
    storage.set('x:progress',JSON.stringify({at:Date.now()-25*3600_000,progress:{seen:[],answered:2,correct:1,ms:100}}));
    expect(readPracticeProgress('x').answered).toBe(0);
    storage.set('x:progress','broken JSON');
    expect(readPracticeProgress('x').seen).toEqual([]);
    storage.set('x:progress',JSON.stringify({at:Date.now(),progress:{seen:[],answered:1,correct:2,ms:100}}));
    expect(readPracticeProgress('x').answered).toBe(0);
  });
  it('keeps practice usable when browser storage throws',()=>{
    vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');},removeItem:()=>{throw new Error('blocked');}});
    expect(writeDraft('x',[])).toBe(false);
    expect(readDraft('x')).toEqual([]);
    expect(()=>writePracticeProgress('x',null)).not.toThrow();
    expect(readPracticeProgress('x').answered).toBe(0);
  });
});
