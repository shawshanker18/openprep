"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border p-5">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        Previously saved progress is kept. Unsaved changes may need to be entered again. Try again, or head back to your dashboard.{error.digest && ` (Reference: ${error.digest})`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>Dashboard</Button>
        <Button variant="ghost" render={<Link href={`/feedback?kind=error${error.digest ? `&ref=${encodeURIComponent(error.digest)}` : ""}&from=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname)}`} />}>
          Report this problem
        </Button>
      </div>
    </section>
  );
}
