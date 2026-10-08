import Link from "next/link";

export default function StaticLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12 text-[15px] leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      <Link href="/dashboard" className="-my-2 inline-flex min-h-11 items-center text-sm text-muted-foreground">← OpenPrep</Link>
      {children}
    </main>
  );
}
