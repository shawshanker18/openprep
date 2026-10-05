import "server-only";
import { cookies, headers } from "next/headers";
import { DEVICE_COOKIE, trustedIp, verifyDevice } from "./delivery-identity";
import { DeliveryBlocked } from "./delivery-policy";

export type DeliveryContext = { ip: string | null; device: string | null };
export async function deliveryContext(): Promise<DeliveryContext> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const context = { ip: trustedIp(h), device: verifyDevice(c.get(DEVICE_COOKIE)?.value) };
  if (process.env.NODE_ENV === "production" && (!context.ip || !context.device))
    throw new DeliveryBlocked("Question access is unavailable. Refresh the page and try again.");
  return context;
}
