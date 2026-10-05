import { expect,it } from "vitest";
import { readJsonBody } from "./request-body";
const request=(body:string,type="application/json")=>new Request("https://example.com",{method:"POST",headers:{"content-type":type},body});
it("rejects oversized streamed JSON without trusting Content-Length",async()=>{
 await expect(readJsonBody(request('"'+"x".repeat(100)+'"'),32)).rejects.toMatchObject({status:413});
 await expect(readJsonBody(new Request("https://example.com",{method:"POST",headers:{"content-type":"application/json","content-length":"1"},body:'"'+"x".repeat(100)+'"'}),32)).rejects.toMatchObject({status:413});
});
it("handles malformed JSON, invalid encodings and unsupported types without running application logic",async()=>{
 await expect(readJsonBody(request("{"),32)).rejects.toMatchObject({status:400});
 await expect(readJsonBody(request("{}","text/html"),32)).rejects.toMatchObject({status:415});
 await expect(readJsonBody(new Request("https://example.com",{method:"POST",headers:{"content-type":"application/json"},body:new Uint8Array([255])}),32)).rejects.toMatchObject({status:400});
 expect(await readJsonBody(request('{"ok":true}'),32)).toEqual({ok:true});
});
