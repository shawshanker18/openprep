/** Pages render on the server (UTC on Vercel): format dates in the student's own timezone, not the server's. */
export const formatDate = (d: Date | number, timeZone: string, time = false) =>
  new Date(d).toLocaleString("en-US", {
    timeZone, month: "short", day: "numeric", year: "numeric", ...(time && { hour: "numeric", minute: "2-digit" }),
  });
