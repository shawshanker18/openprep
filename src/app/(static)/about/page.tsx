import { SKILLS } from "@/content/taxonomy";
export const metadata = { title: "About" };

export default function About() {
  return (<>
    <h1>About OpenPrep</h1>
    <p>OpenPrep is a free, open-source SAT practice platform. It includes lessons, a question bank, timed tests, and a daily plan based on your answers.</p>
    <h2>How the score estimate works</h2>
    <p>
      For each of the {SKILLS.length} SAT skills we keep one number for how well you&apos;re doing. It rises when you answer correctly (more for hard questions) and falls
      when you miss (more for easy ones). Early answers move it a lot, later ones less. Your estimated section scores combine these numbers, weighted by how
      often each skill appears on the test.
    </p>
    <p>
      We always show a <b>range</b>, never a single number. The range is wide when we have little evidence and narrows as you practice. Practice-test scores
      use an approximate scoring model. The College Board&apos;s real scoring is different and not public.
    </p>
    <p><b>Estimates are based on our own questions and a simple model. They are not official scores.</b></p>
    <h2>Questions</h2>
    <p>The question bank includes imported questions. Answers have not all been independently reviewed, and some questions have no written explanation. Use the report button to flag a mistake.</p>
  </>);
}
