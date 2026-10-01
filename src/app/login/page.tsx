import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId } from "@/server/auth";
import { LoginForm } from "./login-form";

/** Which sign-in methods are switched on in Supabase (cached for 5 minutes). */
async function providers(): Promise<{ google: boolean; email: boolean }> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, next: { revalidate: 300 },
    });
    const j = (await r.json()) as { external?: { google?: boolean; email?: boolean } };
    return { google: !!j.external?.google, email: j.external?.email !== false };
  } catch { return { google: false, email: true }; }
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUserId()) redirect("/dashboard");
  const [{ error }, p] = await Promise.all([searchParams, providers()]);
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <Link href="/" className="text-sm text-muted-foreground">← OpenPrep</Link>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">No password needed. Free forever.</p>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">That sign-in link didn&apos;t work or has expired. Request a new one below.</p>}
      <LoginForm google={p.google} />
    </main>
  );
}
