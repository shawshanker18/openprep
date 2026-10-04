import { expect,it,vi } from 'vitest';
import { createPaper,readPaper } from './papers';
it('papers hide selection, vary on every issuance, and are bound to the user',()=>{
  const config={mode:'skill' as const,skillId:'m-alg-lin1',difficulty:3 as const};
  const token=createPaper('alice',config);
  expect(readPaper('alice',token)).toEqual(config);
  expect(readPaper('bob',token)).toBeNull();
  expect(token).not.toContain('m-alg');
  expect(createPaper('alice',config)).not.toBe(token);
});
it('rejects tampering, invalid lengths and expired papers',()=>{
  const token=createPaper('alice',{mode:'smart'});
  const tampered=Buffer.from(token,'base64url');tampered[15]=tampered[15]!^1;
  expect(readPaper('alice',tampered.toString('base64url'))).toBeNull();
  expect(readPaper('alice','x')).toBeNull();
  vi.spyOn(Date,'now').mockReturnValue(Date.now()+24*3600_000+1);
  expect(readPaper('alice',token)).toBeNull();vi.restoreAllMocks();
});
