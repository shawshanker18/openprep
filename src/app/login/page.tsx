import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserId } from "@/server/auth";
import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/brand";

export const metadata = { title: "Continue to OpenPrep" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUserId()) redirect("/dashboard");
  const [{ error }, h] = await Promise.all([searchParams, headers()]);
  // Desktop/Android shells add "OpenPrepApp" to their user agent. Google blocks its sign-in inside embedded browsers,
  // so there it runs in the real browser and comes back to the app (see /auth/google).
  const inApp = (h.get("user-agent") ?? "").includes("OpenPrepApp");
  return (
    <main className="grid min-w-0 flex-1 lg:grid-cols-2 [@media(max-height:600px)]:grid-cols-1">
      <div className="flex min-w-0 flex-col items-center justify-start px-4 py-6 sm:px-6 lg:justify-center [@media(min-height:601px)_and_(max-height:800px)]:py-4 [@media(max-height:600px)]:py-2">
        <div className="flex w-full max-w-[400px] flex-col gap-5 [@media(min-height:601px)_and_(max-height:800px)]:gap-3 [@media(max-height:600px)]:gap-2">
          <div className="flex items-center justify-between gap-2"><Link href="/" className="flex min-h-11 min-w-0 items-center gap-2">
            <BrandLogo height={30} />
          </Link></div>
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-xl font-medium">Continue to OpenPrep</h1>
            <p className="text-sm text-muted-foreground">SAT questions, lessons, and practice. Free to use.</p>
          </div>
          {error && <p role="alert" className="rounded-xl border border-destructive p-3 text-sm text-destructive">{error === "google_signup" || error === "google" ? "Google could not finish. Try again or continue with email." : error === "email_browser" ? "Open your email link in the browser where you requested it. If you changed browsers, request a new link below." : "That sign-in link didn’t work or has expired. Request a new one below."}</p>}
          <LoginForm google={true} inApp={inApp} />
        </div>
      </div>
      <div className="hidden min-w-0 p-3 lg:block [@media(max-height:600px)]:hidden">
        <div className="relative sticky top-3 h-[calc(100dvh-4.25rem)] overflow-hidden rounded-3xl bg-neutral-950 bg-[url('/brand/stage-dark.webp')] bg-cover bg-center text-white">
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/80 to-transparent p-10">
            <BrandLogo height={34} invert className="self-start" />
            <p className="max-w-sm text-sm text-white/75">Free SAT questions, lessons, and practice that adapts to you.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
