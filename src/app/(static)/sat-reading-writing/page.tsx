import type { Metadata } from "next";
import { SkillHub } from "../_skill-hub";

export const metadata: Metadata = {
  title: "Free SAT Reading and Writing prep: lessons and practice",
  description: "Free SAT Reading and Writing prep from OpenPrep (Open Prep): a free lesson for every skill, from central ideas and evidence to transitions and standard English conventions, plus adaptive practice.",
  alternates: { canonical: "/sat-reading-writing" },
};

export default function SatReadingWriting() {
  return (<>
    <h1>Free SAT Reading and Writing prep</h1>
    <SkillHub section="rw" label="SAT Reading and Writing" />
  </>);
}
