import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandSymbol } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-start justify-center gap-3 px-4 py-16">
      <BrandSymbol height={36} />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist or has moved.</p>
      <Button render={<Link href="/dashboard" />}>Go to your dashboard</Button>
    </div>
  );
}
