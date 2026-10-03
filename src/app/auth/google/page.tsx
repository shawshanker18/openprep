import { BrowserGoogle } from "./browser-google";

export const metadata = { title: "Continue with Google" };

/** Opened in the real browser by the desktop/Android app (Google won't sign in inside an app). `n`: the nonce hash. */
export default async function GoogleForAppPage({ searchParams }: PageProps<"/auth/google">) {
  const { n } = await searchParams;
  const ok = typeof n === "string" && /^[0-9a-f]{64}$/.test(n);
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{ok ? "Continue with Google" : "That link didn't work"}</h1>
      {ok ? <BrowserGoogle nonceHash={n} /> : <p className="text-muted-foreground">Start again from the OpenPrep app: tap Continue with Google on its sign-in screen.</p>}
    </main>
  );
}
