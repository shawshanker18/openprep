// Creates the starting versions, covered-route lessons and draft rules for the five Class 11 chapter courses.
// Safe to run again: it only adds what is missing. Publish from /admin/assignments (open a covered version, Publish).
//   npx tsx --env-file=.env.migrate scripts/seed-chapter-courses.mts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { seedChapterCourses } from "../src/server/chapter-course-seed";

const url = process.env.MIGRATE_DATABASE_URL;
if (!url) { console.error("Set MIGRATE_DATABASE_URL (the owner connection string from Supabase) first."); process.exit(1); }
const client = postgres(url, { prepare: false, max: 1 });
try {
  const added = await seedChapterCourses(drizzle(client, { schema }));
  console.log(`Added ${added.courses} courses, ${added.versions} versions, ${added.lessons} lessons, ${added.rules} draft rules.`);
  if (added.missingLessons.length) console.warn(`No covered lesson file for: ${added.missingLessons.join(", ")}`);
} finally {
  await client.end();
}
