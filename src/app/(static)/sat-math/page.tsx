import type { Metadata } from "next";
import { SkillHub } from "../_skill-hub";

export const metadata: Metadata = {
  title: "Free SAT Math prep: lessons and practice for every skill",
  description: "Free SAT Math prep from OpenPrep (Open Prep): a free lesson for every SAT Math skill in algebra, advanced math, problem-solving and data analysis, and geometry and trigonometry, plus adaptive practice.",
  alternates: { canonical: "/sat-math" },
};

export default function SatMath() {
  return (<>
    <h1>Free SAT Math prep</h1>
    <SkillHub section="math" label="SAT Math" />
  </>);
}
