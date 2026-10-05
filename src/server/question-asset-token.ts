import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deliverySecret } from "./delivery-identity";

const key = () => createHash("sha256").update(`asset:${deliverySecret()}`).digest();
export function createAssetToken(userId: string, questionId: string, assetId: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = JSON.stringify({ userId, questionId, assetId, expires: Date.now() + 10 * 60_000 });
  return Buffer.concat([iv, cipher.update(data), cipher.final(), cipher.getAuthTag()]).toString("base64url");
}
export function readAssetToken(userId: string, token: string, renew = false): { questionId: string; assetId: string } | null {
  try {
    if (!/^[\w-]{40,2000}$/.test(token)) return null;
    const b = Buffer.from(token, "base64url"), cipher = createDecipheriv("aes-256-gcm", key(), b.subarray(0,12));
    cipher.setAuthTag(b.subarray(-16));
    const p = JSON.parse(Buffer.concat([cipher.update(b.subarray(12,-16)), cipher.final()]).toString());
    if (p.userId !== userId || !Number.isFinite(p.expires) || p.expires < Date.now()-(renew?86_400_000:0) || typeof p.questionId !== "string" || !/^[\da-f-]{36}$/.test(p.assetId)) return null;
    return { questionId: p.questionId, assetId: p.assetId };
  } catch { return null; }
}
