"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** One of several start buttons in a form: submits its own `scope`, and while the form submits only the clicked one spins. */
export function ScopeButton({ value, variant = "outline", size, className, children }: {
  value: string; variant?: "default" | "outline" | "secondary"; size?: "default" | "sm" | "lg"; className?: string; children: React.ReactNode;
}) {
  const { pending, data } = useFormStatus();
  return (
    <Button type="submit" name="scope" value={value} variant={variant} size={size} className={className} disabled={pending}>
      {pending && data?.get("scope") === value && <LoaderCircle className="animate-spin" />}
      {children}
    </Button>
  );
}
