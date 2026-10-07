import {NextRequest} from "next/server";
import {beforeEach,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({exchange:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{exchangeCodeForSession:mocks.exchange}})}));
const {GET}=await import('./route');
const request=(query:string,cookie?:string)=>new NextRequest('https://openprep.site/auth/callback?'+query,{headers:cookie?{cookie}:{}});
beforeEach(()=>{vi.clearAllMocks();mocks.exchange.mockResolvedValue({error:null});});
it("does not send web Google codes into the native-app handoff without a verifier",async()=>{const r=await GET(request('code=test&flow=google'));expect(r.headers.get('location')).toBe('https://openprep.site/login?error=google');expect(mocks.exchange).not.toHaveBeenCalled();});
it("keeps the existing email native-app handoff",async()=>{const r=await GET(request('code=test'));expect(r.headers.get('location')).toBe('https://openprep.site/auth/open-app?code=test');});
it("exchanges a Google code server-side with the existing PKCE verifier",async()=>{const r=await GET(request('code=test&flow=google','sb-project-auth-token-code-verifier=verifier'));expect(mocks.exchange).toHaveBeenCalledWith('test');expect(r.headers.get('location')).toBe('https://openprep.site/dashboard');});
it("returns a generic sign-in error on provider denial",async()=>{const r=await GET(request('flow=google&error=access_denied&error_description=secret'));expect(r.headers.get('location')).toBe('https://openprep.site/login?error=google');expect(mocks.exchange).not.toHaveBeenCalled();});
it("offers account creation when Google's new-account signup needs a reservation",async()=>{const query=new URLSearchParams({flow:'google',error:'access_denied',error_description:'Please create your account on the OpenPrep website or app'});const r=await GET(request(query.toString()));expect(r.headers.get('location')).toBe('https://openprep.site/login?error=google');expect(mocks.exchange).not.toHaveBeenCalled();});

it("does not mislabel an email provider error as Google", async () => {
  const r = await GET(request("error=access_denied"));
  expect(r.headers.get("location")).toBe("https://openprep.site/login?error=auth");
});
