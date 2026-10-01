import { OpenApp } from "./open-app";

/** Browser landing for a sign-in that started in the OpenPrep app: bounce the one-time code to openprep://. */
export default async function OpenAppPage({ searchParams }: PageProps<"/auth/open-app">) {
  const { code } = await searchParams;
  // The code is useless without the app's PKCE verifier; still, only pass through a plain token.
  const ok = typeof code === "string" && /^[A-Za-z0-9_-]{8,200}$/.test(code);
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{ok ? "Finish signing in" : "That link didn't work"}</h1>
      {ok ? <OpenApp href={`openprep://auth?code=${code}`} /> : <p className="text-muted-foreground">Request a new sign-in link from the OpenPrep app.</p>}
    </main>
  );
}
