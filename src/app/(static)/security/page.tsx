import { Button } from "@/components/ui/button";
import { sendSecurityReport } from "./actions";

export const metadata = { title: "Report a security issue" };

const ERRORS: Record<string, string> = {
  invalid: "Please describe the issue in at least 20 characters (5,000 at most).",
  rate: "You've sent several reports today. Thank you! Please send more tomorrow.",
};

// The contact in /.well-known/security.txt.
export default async function SecurityPage({ searchParams }: PageProps<"/security">) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  return (<>
    <h1>Report a security issue</h1>
    <p>
      Found a way to see data you shouldn&apos;t, get answers early, or break something? Thank you for telling us.
      Describe what you found and how to reproduce it. Please don&apos;t access other people&apos;s data or disrupt the
      service while testing.
    </p>
    {sp.sent ? (
      <p role="status" className="rounded-lg border p-4">Thanks, your report was received. We&apos;ll look into it.</p>
    ) : (
      <form action={sendSecurityReport} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          What did you find?
          <textarea name="message" required minLength={20} maxLength={5000} rows={8}
            className="rounded-md border bg-background p-3 text-sm font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          How can we reach you? (optional)
          <input name="contact" maxLength={200} placeholder="Email or another way to contact you"
            className="h-10 rounded-md border bg-background px-3 text-sm font-normal" />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="self-start">Send report</Button>
      </form>
    )}
  </>);
}
