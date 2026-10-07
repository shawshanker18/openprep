import { afterEach, expect, it, vi } from "vitest";
import { sendModuleSubmission } from "./submit-module";
afterEach(()=>vi.unstubAllGlobals());
it("uses an independent abortable request and keeps final answers in the submission",async()=>{const fetch=vi.fn<typeof globalThis.fetch>(async()=>Response.json({ok:true,finished:true}));vi.stubGlobal("fetch",fetch);const drafts=[{position:0,response:"B",flagged:false,timeMsDelta:5000}];expect(await sendModuleSubmission("module",drafts)).toEqual({ok:true,finished:true});expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({moduleId:"module",drafts});expect(fetch.mock.calls[0]![1]!.signal).toBeInstanceOf(AbortSignal);});
it("does not navigate to results when the server rejects submission",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>Response.json({ok:false,error:"Retry"},{status:503})));expect(await sendModuleSubmission("module",[])).toEqual({ok:false,error:"Retry"});});
