import { SKILLS } from "@/content/taxonomy";
export const metadata = { title: "About" };

export default function About() {
  return (<>
    <h1>About OpenPrep</h1>
    <p>OpenPrep is a free, open-source SAT practice platform. It works out what you already know, then keeps choosing the next most useful thing to study.</p>
    <h2>How the score estimate works</h2>
    <p>
      For each of the {SKILLS.length} SAT skills we keep one number for how well you&apos;re doing. It rises when you answer correctly (more for hard questions) and falls
      when you miss (more for easy ones). Early answers move it a lot, later ones less. Your estimated section scores combine these numbers, weighted by how
      often each skill appears on the test.
    </p>
    <p>
      We always show a <b>range</b>, never a single number. The range is wide when we have little evidence and narrows as you practice. Practice-test scores
      use a simple, transparent approximation. The College Board&apos;s real scoring is different and not public.
    </p>
    <p><b>Estimates are based on our own questions and a simple model. They are not official scores.</b></p>
    <h2>Questions</h2>
    <p>Every question is original and reviewed by a person. If you find a mistake, use the flag button on the question. Thank you!</p>
  </>);
}
