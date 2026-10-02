import { z } from "zod";

/** A string Postgres can store: no NUL bytes (Postgres rejects them, which would surface as a server error). */
export const text = () => z.string().regex(/^[^\0]*$/, "Invalid characters.");
