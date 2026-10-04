import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { r2Files } from "@/db/storage-schema";
import { readObject, deleteObject, storageConfigured } from "@/server/r2";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });
async function ownedFile(context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: reply("Sign in required", 401) };
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return { response: reply("File not found", 404) };
  const [file] = await db.select().from(r2Files).where(and(eq(r2Files.id, id), eq(r2Files.ownerId, user.id), eq(r2Files.status, "ready")));
  if (!file) return { response: reply("File not found", 404) };
  return { file };
}
export async function GET(_request: Request, context: Context) {
  const owned = await ownedFile(context);
  if (owned.response) return owned.response;
  if (!storageConfigured()) return reply("File storage is not available yet", 503);
  try {
    const object = await readObject(owned.file.objectKey);
    if (!object.Body) return reply("File not found", 404);
    return new Response(object.Body.transformToWebStream(), { headers: { ...headers, "Content-Type": owned.file.contentType, "Content-Length": String(owned.file.byteSize), "Content-Disposition": owned.file.contentType === "application/pdf" ? "attachment" : "inline", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch { return reply("File is temporarily unavailable", 503); }
}
export async function DELETE(request: Request, context: Context) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply("Invalid request", 403);
  const owned = await ownedFile(context);
  if (owned.response) return owned.response;
  if (!storageConfigured()) return reply("File storage is not available yet", 503);
  try {
    await deleteObject(owned.file.objectKey);
    await db.delete(r2Files).where(and(eq(r2Files.id, owned.file.id), eq(r2Files.ownerId, owned.file.ownerId)));
    return new Response(null, { status: 204, headers });
  } catch { return reply("Delete failed. Please try again later", 503); }
}
