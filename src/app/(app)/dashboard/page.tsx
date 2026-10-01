import { requireUser } from "@/server/auth";

// Phase G replaces this with the full dashboard (spec 04 §6).
export default async function DashboardPage() {
  const { profile } = await requireUser();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Signed in. Target: {profile.targetScore ?? "not set"}.</p>
    </div>
  );
}
