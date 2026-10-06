<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# OpenPrep canonical workflow

The canonical repository for all changes and pushes is Shashanksaraswat123939/openprep. The user requests deployment to the existing live site after each update. mxnviir/openprep-test was a one-time source of fixes; do not make further changes there. Verify checks and deployment status; do not report a push as a verified live deployment. Preserve existing Auth configuration and student data. Production builds validate content without reseeding the database; content imports are explicit operations.
