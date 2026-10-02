// Session cookies are only ever written by the server: page scripts can't read them (HttpOnly), so even an XSS bug
// couldn't steal a login. Secure in production; plain http stays usable for local development.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
