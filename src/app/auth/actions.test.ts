import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({ticket:vi.fn(),client:vi.fn(),ip:vi.fn(async()=> 'test-ip')}));
vi.mock('@/lib/supabase/server',()=>({createClient:mocks.client}));
vi.mock('@/server/signup',()=>({issueSignupTicket:mocks.ticket,clientIp:mocks.ip,SIGNUP_REFUSALS:[]}));
vi.mock("next/headers",()=>({headers:async()=>new Headers({origin:"https://openprep.site"})}));
const {prepareEmailSignIn,signInWithGoogle,beginGoogleOAuth}=await import('./actions');
beforeEach(()=>{vi.clearAllMocks();mocks.ticket.mockResolvedValue(true);});
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

it('refuses a blocked signup ticket before beginning OAuth',async()=>{
 mocks.ticket.mockResolvedValue(false);
 expect(await beginGoogleOAuth('student@example.com',true)).toMatchObject({ok:false});
 expect(mocks.client).not.toHaveBeenCalled();
});
it('starts Google OAuth with server PKCE callback and a login hint',async()=>{
 const oauth=vi.fn(async()=>({data:{url:'https://gurqomysadtmlofuaxef.supabase.co/auth/v1/authorize?provider=google'},error:null}));
 mocks.client.mockResolvedValue({auth:{signInWithOAuth:oauth}});
 expect(await beginGoogleOAuth('student@example.com',true)).toMatchObject({ok:true});
 expect(oauth).toHaveBeenCalledWith({provider:'google',options:{redirectTo:'https://openprep.site/auth/callback?flow=google',skipBrowserRedirect:true,queryParams:{login_hint:'student@example.com',prompt:'select_account'}}});
});
it('opens Google directly without asking existing users to type their email',async()=>{
 const oauth=vi.fn(async()=>({data:{url:'https://example.com/authorize'},error:null}));mocks.client.mockResolvedValue({auth:{signInWithOAuth:oauth}});
 expect(await beginGoogleOAuth(null,true)).toMatchObject({ok:true});expect(mocks.ticket).not.toHaveBeenCalled();expect(oauth).toHaveBeenCalledWith({provider:'google',options:{redirectTo:'https://openprep.site/auth/callback?flow=google',skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
});
