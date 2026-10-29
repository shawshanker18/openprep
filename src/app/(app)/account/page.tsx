import { getAuthUser, requireUser } from "@/server/auth";
import { getMembership } from "@/server/subscription";
import { tierAt } from "@/lib/membership";
import { PLANS } from "@/lib/tiers";
import { signOut } from "@/app/auth/actions";
import { safely } from "@/lib/safely";
import { AccountView } from "./account-view";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const { userId } = await requireUser();
  const user = await safely(() => getAuthUser(), null);
  const tier = await safely(async () => tierAt(await getMembership(userId), new Date()), "free" as const);
  const account = { name: user?.name ?? user?.email ?? "Account", email: user?.email ?? null, avatarUrl: user?.avatarUrl ?? null };
  return <AccountView account={account} planName={tier === "free" ? "Free" : PLANS[tier].name} signOut={signOut} />;
}
