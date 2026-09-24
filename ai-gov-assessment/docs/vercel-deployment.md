# Deploying the frontend on Vercel

Set the Vercel project's Root Directory to `ai-gov-assessment/frontend`
(relative to this Git repository), Framework Preset to Vite, Build Command
to `npm run build`, and Output Directory to `dist`.

The frontend's `vercel.json` serves React pages such as `/login` and
`/assessments/:id` through `index.html`. API requests are deliberately excluded
so a missing backend cannot return HTML as a successful authentication response.

## Connect the backend

This project's frontend proxies `/api/:path*` to
`https://backend-psi-topaz-20.vercel.app/api/:path*`. The backend health endpoint
has been verified to return 200, and signed-out `/api/auth/me` returns the
expected 401. Leave `VITE_API_BASE_URL` empty in the frontend Vercel Production
environment so requests use this same-origin proxy. Set backend `CORS_ORIGIN`
to `https://frontend-navy-seven-58.vercel.app` and `NODE_ENV=production`.
The default `COOKIE_SAME_SITE=lax` works with this same-origin proxy.
When Vercel sets `VERCEL=1`, the backend trusts one proxy hop for client IP
resolution, so rate limiting uses forwarded client addresses. Direct local
deployments keep proxy trust disabled. The rate-limit proxy validation message
is logged separately from database errors; resolving it does not establish
that the production database is reachable.

The Express backend must be deployed separately with PostgreSQL configured.
The development proxy in `vite.config.ts` does not run in production.

For a separately hosted backend, set `VITE_API_BASE_URL` in the Vercel project's
Production environment to its HTTPS origin, without `/api` or a trailing slash.
For example, `https://your-backend.example.com`. The frontend appends `/api`.
Environment values in local `.env` files are not uploaded by Git.
Redeploy the latest production deployment after changing Vite variables because
they are embedded at build time.

Configure the backend's `CORS_ORIGIN` to the exact frontend HTTPS origin,
`NODE_ENV=production`, and, for cross-site frontend/backend hosts,
`COOKIE_SAME_SITE=none`. Browsers may block third-party cookies; a same-origin
API proxy avoids that restriction. Once the actual backend URL is known,
an external `/api/:path*` rewrite can proxy to that backend's `/api/:path*`;
with that setup, leave `VITE_API_BASE_URL` empty.

Keep database credentials, `JWT_SECRET`, and provider API keys on the backend.

## Verify

- Backend `/api/health` returns JSON with `status: ok`.
- Frontend `/login` opens directly and survives refresh.
- Login requests reach the backend, rather than Vercel's static file server.
- `/api/auth/me` returns 401 while signed out and 200 after signing in.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
and [Vercel rewrites](https://vercel.com/docs/routing/rewrites).
