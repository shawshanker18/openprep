import { expect,it,vi } from "vitest";
vi.mock("@/server/auth",()=>({requireUser:async()=>({userId:"verified-user",profile:{}})}));
vi.mock("@/server/ratelimit",()=>({limitPractice:vi.fn(async()=>null)}));
vi.mock("@/server/practice-sessions",()=>({answerPracticeSession:vi.fn(),loadPracticeSession:vi.fn(),savePracticeDraft:vi.fn()}));
import { saveSavedPractice,loadSavedPractice,answerSavedPractice } from "@/app/(app)/practice/session-actions";
import { savePracticeDraft,loadPracticeSession,answerPracticeSession } from "./practice-sessions";
const sessionId="00000000-0000-4000-8000-000000000001";
it("rejects malformed session references, positions, NUL text and caller-supplied ownership before database access",async()=>{
 for(const input of [{sessionId:"not-uuid",position:0,response:"A",timeMs:0},
   {sessionId,position:-1,response:"A",timeMs:0}, {sessionId,position:100,response:"A",timeMs:0},
   {sessionId,position:0,response:"\0",timeMs:0},{sessionId,position:0,response:"A",timeMs:NaN},
   {sessionId,position:0,response:"A",timeMs:0,userId:"victim"}])
   expect(await saveSavedPractice(input)).toMatchObject({ok:false});
 expect(await loadSavedPractice({sessionId,kind:"jump",position:1000})).toMatchObject({ok:false});
 expect(await answerSavedPractice({sessionId,position:0,response:"A",timeMs:0,confidence:99 as 1})).toMatchObject({ok:false});
 expect(savePracticeDraft).not.toHaveBeenCalled();expect(loadPracticeSession).not.toHaveBeenCalled();expect(answerPracticeSession).not.toHaveBeenCalled();
});
it("gets the owner from verified authentication, never from the request",async()=>{
 expect(await saveSavedPractice({sessionId,position:0,response:"A",timeMs:1234})).toMatchObject({ok:true});
 expect(savePracticeDraft).toHaveBeenCalledWith("verified-user",sessionId,0,"A",1234);
});
