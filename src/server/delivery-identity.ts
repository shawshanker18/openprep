import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export const DEVICE_COOKIE = "openprep-device";
export function deliverySecret() {
  const secret = process.env.QUESTION_ID_SECRET || process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("Missing question delivery secret");
  return secret || "local-development-only";
}
export function digest(value: string) {
  return createHmac("sha256", deliverySecret()).update(value).digest("base64url");
}
export function issueDevice() {
  const id = randomBytes(24).toString("base64url");
  return `${id}.${digest(`device:${id}`)}`;
}
export function verifyDevice(value: string | undefined): string | null {
  if (!value || !/^[\w-]{32}\.[\w-]{43}$/.test(value)) return null;
  const [id, mac] = value.split(".");
  const expected = digest(`device:${id}`);
  return timingSafeEqual(Buffer.from(mac!), Buffer.from(expected)) ? digest(`device-scope:${id}`) : null;
}
export function trustedIp(h: Pick<Headers, "get">): string | null {
  // Vercel overwrites this header. Self-hosting must explicitly configure a proxy that strips/replaces it.
  const name = process.env.VERCEL ? "x-vercel-forwarded-for" : process.env.OPENPREP_TRUSTED_IP_HEADER;
  if (!name) return null;
  const value = h.get(name)?.split(",")[0]?.trim();
  return value && isIP(value) ? digest(`ip:${value}`) : null;
}
