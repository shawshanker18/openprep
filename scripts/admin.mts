// Grant or revoke admin from the backend. The website can't do this: its database role can only read the admins
// table (drizzle/0010). This script needs the owner connection (MIGRATE_DATABASE_URL), which the site never has.
//   npm run admin -- list
//   npm run admin -- grant someone@gmail.com "runs the inbox"
//   npm run admin -- revoke someone@gmail.com
// The account must have signed in to OpenPrep at least once (so it exists in auth.users).
import postgres from "postgres";

const [cmd, email, ...noteParts] = process.argv.slice(2);
const url = process.env.MIGRATE_DATABASE_URL;
if (!url) { console.error("Set MIGRATE_DATABASE_URL (the owner connection string from Supabase) first."); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });

try {
  if (cmd === "list") {
    const rows = await sql`select u.email, a.note, a.granted_at from public.admins a left join auth.users u on u.id = a.user_id order by a.granted_at`;
    if (!rows.length) console.log("No admins yet.");
    for (const r of rows) console.log(`${r.email ?? "(deleted account)"}  since ${r.granted_at.toISOString().slice(0, 10)}${r.note ? `  — ${r.note}` : ""}`);
  } else if ((cmd === "grant" || cmd === "revoke") && email) {
    const [user] = await sql`select id, email from auth.users where lower(email) = lower(${email})`;
    if (!user) { console.error(`No OpenPrep account with the email ${email}. They need to sign in once first.`); process.exit(1); }
    if (cmd === "grant") {
      await sql`insert into public.admins (user_id, note) values (${user.id}, ${noteParts.join(" ") || null}) on conflict (user_id) do update set note = excluded.note`;
      console.log(`${user.email} is now an admin. They'll see "Admin" in the app menu (sign out and back in if it's open).`);
    } else {
      const gone = await sql`delete from public.admins where user_id = ${user.id} returning user_id`;
      console.log(gone.length ? `${user.email} is no longer an admin.` : `${user.email} wasn't an admin.`);
    }
  } else {
    console.log("Usage: npm run admin -- list | grant <email> [note] | revoke <email>");
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
