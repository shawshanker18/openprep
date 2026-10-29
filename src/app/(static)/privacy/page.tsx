import Link from 'next/link';
export const metadata={title:'Privacy Policy'};
export default function Privacy(){
 return <>
  <h1>Privacy Policy</h1>
  <p className="text-sm text-muted-foreground">Updated 7 October 2026</p>
  <p>OpenPrep uses the information below to provide SAT practice, save your progress, and keep the service safe.</p>
  <h2>What we collect and why</h2>
  <ul>
   <li>Your email for sign-in. Google sign-in also provides account information such as your name, used to greet you.</li>
   <li>Your grade, curriculum, subjects, goals, schedule, and survey answers to recommend lessons and practice.</li>
   <li>Your answers, scores, time spent, saved sessions, and lesson progress to track learning. Tests also count when you leave the test window.</li>
   <li>Tutor messages to provide replies, and feedback or reports you choose to send, including any contact details you enter.</li>
   <li>If you enable reminders, your reminder time and device push subscription to deliver notifications.</li>
   <li>Network and device information, including IP addresses or derived identifiers, for sign-up limits, abuse prevention, and security.</li>
  </ul>
  <p>We do not require a phone number or postal address. Avoid including sensitive personal information in tutor messages or reports.</p>
  <h2>Storage and service providers</h2>
  <p>Account and learning records are stored in Supabase. Vercel hosts the website and processes requests. Access to student records requires authentication and ownership checks; authorized administrators can access records needed to operate the service and handle reports.</p>
  <p>When you use the tutor, your submitted messages and relevant question context are sent to the configured AI provider to generate a reply. Google sign-in and the Desmos calculator use those providers&apos; services and privacy policies.</p>
  <h2>Cookies and local storage</h2>
  <p>OpenPrep uses sign-in cookies, a security device cookie, and local storage for preferences, sign-in handoff, and unsent answers. These support account access, safety, and saved progress. We do not currently use Google Analytics, Meta Pixel, or advertising trackers, and we do not sell your personal data.</p>
  <h2>Guest practice</h2>
  <p>Guest practice does not create an account. Sample-question answers are stored in your browser and are not added to student learning records. Clear this site’s browser data to remove them. Network and security information may still be processed when you visit the site.</p>
  <h2>Delete your data</h2>
  <p>Go to <Link href="/account" className="underline">Your account</Link> → Delete my account, type DELETE, and confirm. This removes your sign-in account and linked learning records from the active database. Turning reminders off on a device removes its push subscription. You can clear site data in your browser to remove local drafts and preferences.</p>
  <p>Feedback and security reports may remain after account deletion, with the account link removed where applicable. Limited security records and provider backups may remain under their retention schedules. To request removal of a report or ask a privacy question, use the Feedback link at the bottom of the website and identify the relevant report.</p>
  <h2>Age</h2>
  <p>OpenPrep is for people aged 13 and over.</p>
 </>;
}
