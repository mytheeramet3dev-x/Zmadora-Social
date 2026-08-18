# Deployment Notes

## Current Readiness

Zmadora is ready for:

- portfolio deployment
- demo deployment
- single-instance hosting

It is not yet fully hardened for multi-instance production scale.

## Important Deployment Facts

### 1. Standard Next.js deployment

Realtime chat uses Pusher Channels, so the application does not require a
long-running custom WebSocket server. Vercel can run the Next.js application
with its standard deployment integration.

For local development and a traditional Node host, start the app with:

```bash
npm run dev
npm start
```

The scripts use the standard `next dev` and `next start` commands. The legacy
`server.mjs` wrapper remains available for local experiments but is not used by
Vercel.

### 2. Database

Requires a PostgreSQL database.

At minimum you need:

```bash
DATABASE_URL=
```

### 3. Clerk

Authentication requires Clerk environment variables.

At minimum:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## Current Production Limitations

### Realtime infrastructure

- Pusher Channels provides the WebSocket transport and event fan-out
- the application does not depend on an in-memory socket map

Implication:

- one instance: supported
- multiple instances: supported by the managed Pusher channel layer

### Upload storage

Current upload route writes files into:

- Vercel Blob public storage

Implication:

- local/dev: fine
- serverless or ephemeral filesystem: not ideal

Vercel Blob is already configured. Use a private object-storage strategy later
if the product requires access-controlled media instead of public URLs.

## Good Next Steps Before Production

1. Add automated tests
2. Add monitoring / logging / error tracking
3. Review security and rate limiting for upload and chat endpoints
