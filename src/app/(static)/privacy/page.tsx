export const metadata = { title: "Privacy" };

// Plain-English draft (spec 05 §6). The project owner should review before public launch.
export default function Privacy() {
  return (<>
    <h1>Privacy</h1>
    <h2>What we store</h2>
    <ul>
      <li>Your email address, from Google or the sign-in link.</li>
      <li>Your answers to the short onboarding survey (grade, curriculum, goals, study time).</li>
      <li>Your answers to practice and test questions, and how long they took.</li>
      <li>Messages you send to the AI tutor.</li>
    </ul>
    <p>We don&apos;t ask for your name, school, phone number, or address. We don&apos;t take payments.</p>
    <h2>What we don&apos;t do</h2>
    <ul>
      <li>No advertising and no third-party ad trackers.</li>
      <li>We never sell your data.</li>
    </ul>
    <h2>The AI tutor</h2>
    <p>Tutor messages are sent to an AI provider to generate a reply. Please don&apos;t type personal information into the tutor.</p>
    <h2>Deleting your data</h2>
    <p>Settings → Delete account permanently removes your account and everything linked to it.</p>
    <h2>Age</h2>
    <p>OpenPrep is for people aged 13 and over.</p>
  </>);
}
