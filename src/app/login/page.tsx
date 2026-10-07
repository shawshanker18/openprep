import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserId } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

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

/** Original OpenPrep mark: a rising path to a flag (climb to your target score). */
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" className="fill-foreground" />
      <path d="M9 29 L17 20 L22 24 L30 13" fill="none" className="stroke-background" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 13 V7 L35 9 L30 11" className="fill-background" />
    </svg>
  );
}

/** Original illustration: night sky, a winding trail of checkpoints up to a summit flag. */
function Scene() {
  const stars = [[60, 70], [140, 40], [230, 110], [310, 55], [400, 95], [470, 35], [520, 140], [90, 160], [360, 170], [180, 200]];
  return (
    <svg viewBox="0 0 560 720" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e1b4b" /><stop offset="1" stopColor="#4338ca" /></linearGradient>
        <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f766e" /><stop offset="1" stopColor="#134e4a" /></linearGradient>
      </defs>
      <rect width="560" height="720" fill="url(#sky)" />
      {stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1.6 : 2.4} fill="#e0e7ff" opacity={0.85} />)}
      <circle cx="455" cy="120" r="34" fill="#fde68a" opacity="0.9" />
      <path d="M0 470 L120 330 L210 410 L330 250 L430 360 L560 220 V720 H0 Z" fill="#3730a3" />
      <path d="M0 560 L150 420 L260 500 L380 380 L560 480 V720 H0 Z" fill="url(#hill)" />
      <path d="M0 650 C120 600 220 640 330 600 S500 560 560 590 V720 H0 Z" fill="#115e59" />
      {/* trail */}
      <path d="M70 700 C150 640 120 600 210 560 S320 520 300 460 S360 380 330 250" fill="none" stroke="#f8fafc" strokeWidth="5" strokeDasharray="2 14" strokeLinecap="round" opacity="0.9" />
      {[[210, 560], [300, 460]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="9" fill="#fbbf24" stroke="#fff" strokeWidth="3" />)}
      <path d="M330 250 V200" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
      <path d="M330 200 L368 213 L330 226 Z" fill="#f43f5e" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUserId()) redirect("/dashboard");
  const [{ error }, p, h] = await Promise.all([searchParams, providers(), headers()]);
  // Desktop/Android shells add "OpenPrepApp" to their user agent. Google blocks its sign-in inside embedded browsers,
  // so there it runs in the real browser and comes back to the app (see /auth/google).
  const inApp = (h.get("user-agent") ?? "").includes("OpenPrepApp");
  return (
    <main className="grid min-w-0 flex-1 lg:grid-cols-2 [@media(max-height:600px)]:grid-cols-1">
      <div className="flex min-w-0 flex-col items-center justify-start px-4 py-6 sm:px-6 lg:justify-center [@media(max-height:800px)]:py-4 [@media(max-height:600px)]:py-2">
        <div className="flex w-full max-w-[400px] flex-col gap-5 [@media(max-height:800px)]:gap-3 [@media(max-height:600px)]:gap-2">
          <Link href="/" className="flex items-center justify-center gap-2.5">
            <Mark className="size-9 [@media(max-height:800px)]:size-8" />
            <span className="text-2xl font-semibold tracking-tight">OpenPrep</span>
          </Link>
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-xl font-medium">Sign in or create your free account</h1>
            <p className="text-sm text-muted-foreground">SAT questions, lessons, and practice. Free to use.</p>
          </div>
          {error && <p role="alert" className="rounded-xl border border-destructive p-3 text-sm text-destructive">That sign-in link didn&apos;t work or has expired. Request a new one below.</p>}
          <LoginForm google={p.google} inApp={inApp} />
        </div>
      </div>
      <div className="hidden min-w-0 p-3 lg:block [@media(max-height:600px)]:hidden">
        <div className="sticky top-3 h-[calc(100dvh-1.5rem)] overflow-hidden rounded-3xl">
          <Scene />
        </div>
      </div>
    </main>
  );
}
