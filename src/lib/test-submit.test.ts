import {afterEach,expect,it,vi} from 'vitest';
import {withinSubmissionTimeout} from './test-submit';
afterEach(()=>vi.useRealTimers());
it('releases a stalled submission so it can be retried',async()=>{
  vi.useFakeTimers();
  const pending=withinSubmissionTimeout(new Promise(()=>{}),100);
  const rejected=expect(pending).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(100);
  await rejected;
  expect(await withinSubmissionTimeout(Promise.resolve({ok:true}))).toEqual({ok:true});
});
it('preserves server failures instead of treating them as submission success',async()=>{
  expect(await withinSubmissionTimeout(Promise.resolve({ok:false,error:'Retry'}))).toEqual({ok:false,error:'Retry'});
});
