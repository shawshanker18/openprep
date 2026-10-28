import { BankFilters as BankFilterForm } from "@/components/bank-filters";
import { parseBankFilters } from "@/lib/bank-filters";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Question bank" };

export default async function QuestionBankPage({ searchParams }: PageProps<"/question-bank">) {
  const f = parseBankFilters(await searchParams);
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Question bank</h1>
        <p className="text-muted-foreground">Choose subject, topic, skill and difficulty, then press Practice. You go straight to your first question.</p>
      </header>
      <BankFilterForm subject={f.subject} domains={f.domains} skills={f.skills} difficulties={f.difficulties} status={f.status} saved={f.saved} q={f.q} count={f.count} />
    </div>
  );
}
