import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { randomUUID } from "node:crypto";
const state = vi.hoisted(() => ({ user: null as null | { id: string }, db: undefined as unknown }));
vi.mock("@/db", () => ({ get db() { return state.db; } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }) }));
vi.mock("@/server/ratelimit", () => ({ limitPractice: async () => null }));
vi.mock("@/server/r2", () => ({ storageConfigured: () => true, uploadObject: vi.fn(), deleteObject: vi.fn(), readObject: vi.fn(async () => ({ Body: { transformToWebStream: () => new Blob(["test"]).stream() } })) }));
import { GET, DELETE } from "@/app/api/files/[id]/route";
import { GET as list, POST } from "@/app/api/files/route";
import { r2Files } from "@/db/storage-schema";
import { readObject, uploadObject, deleteObject } from "@/server/r2";
const pg = new PGlite();
const database = drizzle(pg);
const owner = randomUUID(), other = randomUUID(), fileId = randomUUID();
const context = { params: Promise.resolve({ id: fileId }) };
const request = () => new Request(`https://example.com/api/files/${fileId}`);
beforeAll(async () => {
  state.db = database;
  await pg.exec("create table r2_files(id uuid primary key, owner_id uuid not null, object_key text not null unique, content_type text not null, byte_size integer not null, status text not null default 'pending', created_at timestamptz not null default now())");
});
beforeEach(async () => {
  await pg.exec("delete from r2_files");
  vi.clearAllMocks();
  state.user = { id: owner };
  await database.insert(r2Files).values({ id: fileId, ownerId: owner, objectKey: randomUUID(), contentType: "image/png", byteSize: 4, status: "ready" });
});
describe("private file routes", () => {
  it("blocks signed-out reads and listing", async () => {
    state.user = null;
    expect((await GET(request(), context)).status).toBe(401);
    expect((await list(request())).status).toBe(401);
    expect(readObject).not.toHaveBeenCalled();
  });
  it("blocks another owner's files even with a privileged database connection", async () => {
    state.user = { id: other };
    expect((await GET(request(), context)).status).toBe(404);
    expect(await (await list(request())).json()).toEqual({ files: [] });
    expect(readObject).not.toHaveBeenCalled();
    expect((await DELETE(new Request(request().url, { method: "DELETE", headers: { Origin: "https://example.com" } }), context)).status).toBe(404);
    expect(deleteObject).not.toHaveBeenCalled();
  });
  it("proxies owned files without revealing the R2 URL or key", async () => {
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).toBe("test");
    const data = await (await list(request())).json();
    expect(JSON.stringify(data)).not.toContain("objectKey");
    expect(data.files[0].url).toBe(`/api/files/${fileId}`);
  });
  it("rejects cross-origin writes", async () => {
    const malicious = new Request(request().url, { method: "DELETE", headers: { Origin: "https://attacker.example" } });
    expect((await DELETE(malicious, context)).status).toBe(403);
    expect((await POST(new Request("https://example.com/api/files", { method: "POST" }))).status).toBe(403);
    expect(deleteObject).not.toHaveBeenCalled();
  });
  it("uploads verified bytes using opaque keys and retains only metadata in Supabase", async () => {
    const response = await POST(new Request("https://example.com/api/files", { method: "POST", headers: { Origin: "https://example.com", "Content-Type": "image/png" }, body: new Uint8Array([137,80,78,71,13,10,26,10]) }));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(Object.keys(data).sort()).toEqual(["id", "url"]);
    expect(uploadObject).toHaveBeenCalledOnce();
    const files = await database.select().from(r2Files);
    expect(files.find((file) => file.id === data.id)?.status).toBe("ready");
    expect(files.find((file) => file.id === data.id)?.objectKey).not.toBe(data.id);
  });
  it("rejects a disguised executable file", async () => {
    const response = await POST(new Request("https://example.com/api/files", { method: "POST", headers: { Origin: "https://example.com", "Content-Type": "image/png" }, body: "<html>" }));
    expect(response.status).toBe(400);
    expect(uploadObject).not.toHaveBeenCalled();
  });
});
it("rejects unsupported file types and oversized streams before sending bytes to storage",async()=>{
 const input=(body:BodyInit,type:string)=>new Request("https://example.com/api/files",{method:"POST",headers:{Origin:"https://example.com","Content-Type":type},body});
 expect((await POST(input("<svg/>","image/svg+xml"))).status).toBe(415);
 expect((await POST(input("MZ executable","application/octet-stream"))).status).toBe(415);
 expect((await POST(input(new Uint8Array(3*1024*1024+1),"image/png"))).status).toBe(413);
 expect(uploadObject).not.toHaveBeenCalled();
});
it("rejects anonymous Supabase accounts as file owners",async()=>{
 state.user={id:owner,is_anonymous:true} as typeof state.user;
 expect((await list(request())).status).toBe(401);
 expect((await GET(request(),context)).status).toBe(401);
 expect((await POST(new Request("https://example.com/api/files",{method:"POST",headers:{Origin:"https://example.com"}}))).status).toBe(401);
 expect(uploadObject).not.toHaveBeenCalled();
});
