import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { SKILLS } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Question bank" };
export default async function QuestionBankPage() {
  await requireUser();
  return <div className="flex flex-col gap-6">
    <div><h1 className="text-2xl font-semibold">Question bank</h1>
      <p className="mt-2 text-muted-foreground">Choose what to practise. Questions are picked for you as you work through your set.</p></div>
    <form action="/practice" className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
      <input type="hidden" name="mode" value="set" /><input type="hidden" name="from" value="/question-bank" />
      <label className="flex flex-col gap-2 text-sm">Skill<Choice name="skills" defaultValue="" options={[{value:"",label:"My focus skills"},...SKILLS.map(s=>({value:s.id,label:s.name}))]} /></label>
      <label className="flex flex-col gap-2 text-sm">Difficulty<Choice name="difficulty" defaultValue="mixed" options={[{value:"mixed",label:"Mixed"},{value:"1",label:"Easy"},{value:"2",label:"Medium"},{value:"3",label:"Hard"}]} /></label>
      <label className="flex flex-col gap-2 text-sm">Questions<Choice name="count" defaultValue="10" options={[5,10,20,30].map(n=>({value:String(n),label:String(n)}))} /></label>
      <label className="flex flex-col gap-2 text-sm">Timer<Choice name="timing" defaultValue="off" options={[{value:"off",label:"No timer"},{value:"on",label:"SAT pace"}]} /></label>
      <Button type="submit">Start practice set</Button>
    </form>
    <div className="flex flex-wrap gap-3"><Button variant="outline" render={<Link href="/bookmarks" />}>Saved questions</Button><Button variant="outline" render={<Link href="/mistakes" />}>Review mistakes</Button></div>
  </div>;
}
