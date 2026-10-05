import { randomUUID } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { r2Files } from "@/db/storage-schema";
import { uploadObject, deleteObject, storageConfigured } from "@/server/r2";
import { boundedBody, validFile, MAX_FILE_BYTES, FILE_TYPES } from "@/server/file-policy";
import { limitPractice } from "@/server/ratelimit";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return reply({ error: "Sign in required" }, 401);
  const page = Math.max(1, Math.min(100, Number(new URL(request.url).searchParams.get("page")) || 1));
  const rows = await db.select({ id: r2Files.id, contentType: r2Files.contentType, byteSize: r2Files.byteSize, createdAt: r2Files.createdAt }).from(r2Files).where(and(eq(r2Files.ownerId, user.id), eq(r2Files.status, "ready"))).orderBy(desc(r2Files.createdAt), desc(r2Files.id)).limit(10).offset((Math.floor(page) - 1) * 10);
  return reply({ files: rows.map((row) => ({ ...row, url: `/api/files/${row.id}` })) });
}
export async function POST(request: Request) {
  // Exact same-origin writes protect cookie authentication against CSRF.
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid request" }, 403);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return reply({ error: "Sign in required" }, 401);
  if (await limitPractice(user.id, "request")) return reply({ error: "Please try again shortly" }, 429);
  if (!storageConfigured()) return reply({ error: "File storage is not available yet" }, 503);
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if(!(FILE_TYPES as readonly string[]).includes(type)) return reply({error:"Use PNG, JPEG, WebP, GIF, or PDF"},415);
  if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES) return reply({ error: "Maximum file size is 3 MB" }, 413);
  let bytes: Buffer;
  try { bytes = await boundedBody(request); } catch { return reply({ error: "Invalid file or file exceeds 3 MB" }, 413); }
  if (!validFile(bytes, type)) return reply({ error: "Use a valid PNG, JPEG, WebP, GIF, or PDF" }, 400);
  const id = randomUUID(), objectKey = randomUUID();
  // Reserve quota in Postgres before sending bytes. The database serializes reservations per owner.
  try { await db.insert(r2Files).values({ id, ownerId: user.id, objectKey, contentType: type, byteSize: bytes.length }); }
  catch { return reply({ error: "File limit reached or storage unavailable" }, 409); }
  try {
    await uploadObject(objectKey, bytes, type);
    await db.update(r2Files).set({ status: "ready" }).where(and(eq(r2Files.id, id), eq(r2Files.ownerId, user.id)));
    return reply({ id, url: `/api/files/${id}` }, 201);
  } catch {
    // Retain the pending record if cleanup fails, so the object can be recovered by an administrator.
    try { await deleteObject(objectKey); await db.delete(r2Files).where(and(eq(r2Files.id, id), eq(r2Files.ownerId, user.id))); } catch { /* Retry cleanup through the maintenance script. */ }
    return reply({ error: "Upload failed. Please try again later" }, 503);
  }
}
