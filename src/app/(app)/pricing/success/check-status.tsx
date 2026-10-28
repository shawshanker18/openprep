"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CheckPaymentStatus() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button size="lg" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw className={`size-4 ${pending ? "motion-safe:animate-spin" : ""}`} />{pending ? "Checking payment…" : "Check payment status"}</Button>;
}
