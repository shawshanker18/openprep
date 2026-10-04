"use client";
import Link from "next/link";
export default function PageError({error,retry}:{error:Error&{digest?:string};retry:()=>void}) {
  return <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12" role="alert">
    <h1 className="text-xl font-semibold">Something went wrong</h1>
    <p>Check your connection and try again. Previously saved progress is kept; unsaved changes may need to be entered again.</p>
    {error.digest && <p className="text-sm text-muted-foreground">Reference: {error.digest}</p>}
    <button onClick={retry} className="self-start rounded-md border px-4 py-2">Try again</button>
    <Link href="/dashboard" className="text-sm underline">Back to dashboard</Link>
  </main>;
}
