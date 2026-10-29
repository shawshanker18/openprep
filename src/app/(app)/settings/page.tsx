import { eq } from "drizzle-orm";
import { db } from "@/db";
import { satAttempts } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { SettingsView } from "./settings-view";

export const metadata = { title: "Study settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  const scores = await db.select().from(satAttempts).where(eq(satAttempts.userId, userId)).orderBy(satAttempts.takenOn);
  return <SettingsView profile={profile} scores={scores} error={typeof sp.error === "string" ? sp.error : undefined} saved={!!sp.saved} />;
}
