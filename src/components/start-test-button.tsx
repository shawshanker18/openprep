"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function StartTestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="mt-auto self-start" disabled={pending}>
      {pending && <LoaderCircle className="animate-spin" />}
      {pending ? "Preparing test…" : "Start"}
    </Button>
  );
}
