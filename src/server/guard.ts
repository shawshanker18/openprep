import "server-only";
import { recycleDatabase } from "@/db";
import { withDeadline } from "@/lib/deadline";

/** Page data deadline: normal loads take well under a second, so nine seconds means a connection has stalled. */
export const PAGE_DEADLINE_MS = 9000;
export const guarded = <T>(work: PromiseLike<T>, ms = PAGE_DEADLINE_MS) => withDeadline(work, ms, recycleDatabase);
