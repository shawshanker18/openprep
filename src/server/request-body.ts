import "server-only";
export class InvalidBody extends Error {
  constructor(public status: 400|413|415, message: string) {super(message);}
}
/** Bound actual streamed bytes, not just the client-controlled Content-Length header. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if(request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase()!=="application/json")
    throw new InvalidBody(415,"Use application/json.");
  const declared=request.headers.get("content-length");
  if(declared && (!/^\d+$/.test(declared) || Number(declared)>maxBytes)) throw new InvalidBody(413,"Request too large.");
  const reader=request.body?.getReader();
  if(!reader) throw new InvalidBody(400,"Invalid JSON.");
  const chunks:Uint8Array[]=[];let size=0;
  try {
    for(;;) {
      const {done,value}=await reader.read();if(done) break;
      size+=value.length;
      if(size>maxBytes) {await reader.cancel();throw new InvalidBody(413,"Request too large.");}
      chunks.push(value);
    }
    try {return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks,size)));}
    catch {throw new InvalidBody(400,"Invalid JSON.");}
  } finally {reader.releaseLock();}
}
