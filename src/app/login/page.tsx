import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId } from "@/server/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getUserId()) redirect("/dashboard");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <Link href="/" className="text-sm text-muted-foreground">← OpenPrep</Link>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">No password needed. Free forever.</p>
      </div>
      <LoginForm />
    </main>
  );
}
