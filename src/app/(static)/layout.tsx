import Link from "next/link";

export default function StaticLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12 text-[15px] leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      <Link href="/dashboard" className="-my-2 inline-flex min-h-11 items-center text-sm text-muted-foreground">← OpenPrep</Link>
      {children}
      <nav aria-label="OpenPrep pages" className="mt-8 flex flex-wrap gap-x-5 border-t pt-3 text-sm text-muted-foreground"><Link className="inline-flex min-h-11 items-center underline" href="/sat-math">SAT Math</Link><Link className="inline-flex min-h-11 items-center underline" href="/sat-reading-writing">SAT Reading and Writing</Link><Link className="inline-flex min-h-11 items-center underline" href="/sat-practice-tests">SAT practice tests</Link><Link className="inline-flex min-h-11 items-center underline" href="/cbse-sat-prep">CBSE SAT prep</Link><Link className="inline-flex min-h-11 items-center underline" href="/learn">Free SAT lessons</Link></nav>
    </main>
  );
}
