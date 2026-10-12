import { redirect } from "next/navigation";

// The Mistakes list now lives in Analysis. Old links keep working and keep their filters.
export default async function MistakesRedirect({ searchParams }: PageProps<"/mistakes">) {
  const sp = await searchParams;
  const q = new URLSearchParams({ tab: "mistakes" });
  for (const [k, v] of Object.entries(sp)) for (const x of [v ?? []].flat()) if (typeof x === "string" && k !== "tab") q.append(k, x);
  redirect(`/analysis?${q}`);
}
