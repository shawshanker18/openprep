import {expect,it,vi} from 'vitest';
import {memo} from './memo';
it('shares one in-flight read across a burst of requests',async()=>{
 const load=vi.fn(async()=>42);const read=memo(1000,load);
 expect(await Promise.all(Array.from({length:100},()=>read()))).toEqual(Array(100).fill(42));
 expect(load).toHaveBeenCalledTimes(1);
});
it('a rejected older refresh cannot clear a newer successful value',async()=>{
 let reject!:(e:Error)=>void;
 const load=vi.fn().mockImplementationOnce(()=>new Promise<number>((_,r)=>{reject=r;})).mockResolvedValue(42);
 const read=memo(1000,load);const older=read();const caught=older.catch(()=>null);
 await expect(read.refresh()).resolves.toBe(42);
 reject(new Error('old request failed'));await caught;
 await expect(read()).resolves.toBe(42);expect(load).toHaveBeenCalledTimes(2);
});
