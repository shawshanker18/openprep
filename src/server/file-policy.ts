export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const FILE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"] as const;
export function validFile(bytes: Buffer, type: string) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) return false;
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
  if (type === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return type === "application/pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}
export async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty file");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_FILE_BYTES) { await reader.cancel(); throw new Error("File too large"); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts, size);
}
