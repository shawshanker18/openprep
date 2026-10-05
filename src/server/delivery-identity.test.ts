import {expect,it,vi} from 'vitest';
import {issueDevice,verifyDevice,trustedIp} from './delivery-identity';
import {createAssetToken,readAssetToken} from './question-asset-token';

it('devices are random, signed, and cannot be changed to join another quota bucket',()=>{
 const token=issueDevice();expect(issueDevice()).not.toBe(token);
 expect(verifyDevice(token)).toMatch(/^[\w-]{43}$/);
 expect(verifyDevice(token.slice(0,-1)+(token.endsWith('A')?'B':'A'))).toBeNull();
 expect(verifyDevice('arbitrary-device')).toBeNull();
});
it('ignores untrusted forwarding headers and only hashes the configured edge header',()=>{
 vi.stubEnv('VERCEL','');vi.stubEnv('OPENPREP_TRUSTED_IP_HEADER','');
 const headers=new Headers({'x-forwarded-for':'1.2.3.4','x-vercel-forwarded-for':'5.6.7.8'});
 expect(trustedIp(headers)).toBeNull();
 vi.stubEnv('VERCEL','1');expect(trustedIp(headers)).not.toContain('5.6.7.8');expect(trustedIp(headers)).toBeTruthy();
 headers.set('x-vercel-forwarded-for','invalid');expect(trustedIp(headers)).toBeNull();
 vi.unstubAllEnvs();
});
it('image references are random, account-bound, tamper-proof and expire after ten minutes',()=>{
 const id='00000000-0000-0000-0000-000000000001';
 const token=createAssetToken('alice','question',id);
 expect(createAssetToken('alice','question',id)).not.toBe(token);
 expect(token).not.toContain(id);expect(readAssetToken('bob',token)).toBeNull();
 const bytes=Buffer.from(token,'base64url');bytes[20]=bytes[20]!^1;
 expect(readAssetToken('alice',bytes.toString('base64url'))).toBeNull();
 expect(readAssetToken('alice',token)).toEqual({questionId:'question',assetId:id});
 vi.spyOn(Date,'now').mockReturnValue(Date.now()+10*60_000+1);
 expect(readAssetToken('alice',token)).toBeNull();
 expect(readAssetToken('alice',token,true)).not.toBeNull();
 vi.restoreAllMocks();
});
