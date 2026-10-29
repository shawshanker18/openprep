import { getAuthUser, requireUser } from "@/server/auth";
import { getMembership } from "@/server/subscription";
import { reconcilePending } from "@/server/paypal";
import { planEnding, tierAt } from "@/lib/membership";
import { creditsLeft } from "@/server/remix";
import { PLANS } from "@/lib/tiers";
import { signOut } from "@/app/auth/actions";
import { safely } from "@/lib/safely";
import { AccountView } from "./account-view";

export const metadata = { title: "Your account" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const sp = await searchParams;
  const { userId } = await requireUser();
  const user = await safely(() => getAuthUser(), null);
  if (sp.plan === "processing") await reconcilePending(userId);
  const blocks = await getMembership(userId), now = new Date(), tier = tierAt(blocks, now);
  const left = await creditsLeft(userId, tier);
  const day = (d: Date) => d.toLocaleDateString("en-US", { dateStyle: "long" });
  const account = { name: user?.name ?? user?.email ?? "Account", email: user?.email ?? null, avatarUrl: user?.avatarUrl ?? null };
  const plan = {
    name: tier === "free" ? "Free" : PLANS[tier].name, paid: tier !== "free",
    blocks: blocks.map((b) => ({ key: b.startsAt.toISOString(), name: PLANS[b.tier].name, until: day(b.endsAt) })),
    ending: planEnding(blocks, now), remixesLeft: left,
  };
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return <AccountView account={account} plan={plan} signOut={signOut} error={one(sp.error)} planStatus={one(sp.plan)} />;
}
