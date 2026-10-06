import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({ticket:vi.fn(),client:vi.fn(),ip:vi.fn(async()=> 'test-ip')}));
vi.mock('@/lib/supabase/server',()=>({createClient:mocks.client}));
vi.mock('@/server/signup',()=>({issueSignupTicket:mocks.ticket,clientIp:mocks.ip,SIGNUP_REFUSALS:[]}));
const {prepareEmailSignIn,signInWithGoogle}=await import('./actions');
beforeEach(()=>vi.clearAllMocks());
it('rejects email requests without explicit privacy acceptance before issuing a signup ticket',async()=>{
 expect(await prepareEmailSignIn('student@example.com',false)).toMatchObject({ok:false});
 expect(mocks.ticket).not.toHaveBeenCalled();expect(mocks.ip).not.toHaveBeenCalled();
});
it('issues a ticket only after acceptance and valid email',async()=>{
 expect(await prepareEmailSignIn('not an email',true)).toMatchObject({ok:false});
 expect(mocks.ticket).not.toHaveBeenCalled();
 expect(await prepareEmailSignIn('student@example.com',true)).toEqual({ok:true});
 expect(mocks.ticket).toHaveBeenCalledWith('student@example.com','test-ip');
});
it('rejects Google sign-in without acceptance before contacting the provider',async()=>{
 const input={credential:'a.b.c',nonce:'00000000-0000-4000-8000-000000000001'};
 expect(await signInWithGoogle(input as Parameters<typeof signInWithGoogle>[0])).toEqual({ok:false});
 expect(await signInWithGoogle({...input,privacyAccepted:false} as unknown as Parameters<typeof signInWithGoogle>[0])).toEqual({ok:false});
 expect(mocks.client).not.toHaveBeenCalled();expect(mocks.ticket).not.toHaveBeenCalled();
});
