import { redirect } from "next/navigation";

/** The daily plan is gone (the dashboard shows your stats and where you left off); old links land there. */
export default function PlanPage() {
  redirect("/dashboard");
}
