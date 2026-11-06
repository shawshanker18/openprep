"use server";

import { cookies } from "next/headers";

export async function dismissNotificationsAction(ids: string[]) {
  const cookieStore = await cookies();
  const existing = cookieStore.get("openprep_dismissed_notifications")?.value;
  const set = new Set(existing ? existing.split(",").filter(Boolean) : []);
  for (const id of ids) {
    if (id) set.add(id);
  }
  cookieStore.set("openprep_dismissed_notifications", Array.from(set).join(","), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
}
