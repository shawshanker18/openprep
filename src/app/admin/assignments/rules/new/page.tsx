import Link from "next/link";
import { requireAdmin } from "@/server/admin";
import { loadCatalogData } from "@/server/course-assignment";
import { RuleForm } from "../../rule-form";

export const metadata = { title: "New rule" };

export default async function NewRulePage({ searchParams }: PageProps<"/admin/assignments/rules/new">) {
  await requireAdmin();
  const sp = await searchParams;
  const data = await loadCatalogData();
  const versions = data.versionRows.map((v) => ({ id: v.id, name: v.name, published: v.status === "published" }));
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/assignments" className="text-sm text-muted-foreground underline">← Course assignment</Link>
      <h1 className="text-xl font-semibold">New rule</h1>
      <p className="text-sm text-muted-foreground">New rules start as drafts. Save it, test it against a sample profile, then publish it.</p>
      <RuleForm values={{ name: "", description: "", status: "draft", priority: 0, targetVersionId: "", op: "all", chapters: [] }}
        versions={versions} error={typeof sp.error === "string" ? sp.error : undefined} />
    </div>
  );
}
