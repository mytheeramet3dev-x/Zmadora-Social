# Deployment Notes

## Current Readiness

Zmadora is ready for:

- portfolio deployment
- demo deployment
- single-instance hosting

It is not yet fully hardened for multi-instance production scale.

## Important Deployment Facts

### 1. Custom server is required

This project uses `server.mjs` for WebSocket chat.

That means the app is started with:

```bash
npm run dev
npm start
```

Both scripts route through the custom Node server instead of plain `next dev` / `next start`.

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

- WebSocket socket maps are kept in memory
- SSE listeners are kept in memory
- cross-instance fan-out is not implemented yet

Implication:

- one instance: fine
- multiple instances: not yet reliable without shared pub/sub

### Upload storage

Current upload route writes files into:

- `public/uploads`

Implication:

- local/dev: fine
- serverless or ephemeral filesystem: not ideal

Recommended upgrade:

- Cloudinary
- S3
- UploadThing
- Supabase Storage

## Good Next Steps Before Production

1. Move uploads to external object storage
2. Replace in-memory realtime fan-out with Redis/pub-sub or a managed service
3. Add automated tests
4. Add monitoring / logging / error tracking
5. Review security and rate limiting for upload and chat endpoints
