export const metadata = { title: "OpenPrep terms" };

// Plain-English draft (spec 05 §6). The project owner should review before public launch.
export default function Terms() {
  return (<>
    <h1>Terms</h1>
    <ul>
      <li>OpenPrep is free and provided as-is, without guarantees about scores or results.</li>
      <li>You must be 13 or older to use it.</li>
      <li>Score estimates are approximations, not official SAT scores.</li>
      <li>Use it for your own practice; don&apos;t try to break, overload, or scrape the service.</li>
      <li>The code is open source (AGPL-3.0). Questions and lessons are licensed CC BY-NC-SA 4.0.</li>
    </ul>
    <p>SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, OpenPrep.</p>
  </>);
}
