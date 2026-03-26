# Zmadora

Zmadora is a full-stack social media web application built with Next.js App Router, TypeScript, Prisma, PostgreSQL, and Clerk authentication.

It includes real-time feed updates, user profiles, follow relationships, likes, comments, replies, notifications, media upload, and direct messaging with WebSocket-based chat delivery.

## Highlights

- Full-stack social app using Next.js App Router and TypeScript
- Clerk-based authentication and protected user flows
- Create posts with optional image upload
- Like posts, comment, reply to comments, and like comments
- User profiles with editable profile details and avatar upload
- Mutual-follow friend system with friend count and friend list
- Search users by name or username with fuzzy matching
- Real-time feed updates using SSE
- Real-time chat using WebSocket
- Notification center for follows, likes, comments, replies, and messages
- Responsive glassmorphism-inspired UI

## Tech Stack

- Framework: Next.js 15, React 18, TypeScript
- Styling: Tailwind CSS, Radix UI primitives, custom glassmorphism theme
- Auth: Clerk
- Database: PostgreSQL
- ORM: Prisma
- Realtime:
  - Feed and notification updates: SSE
  - Chat delivery: WebSocket via custom Next server
- Uploads: local filesystem upload route to `public/uploads`

## Architecture Summary

This project uses a hybrid architecture:

- Server Actions handle most application mutations and database workflows
- Route Handlers are used for streaming and upload endpoints
- Prisma manages relational data for users, posts, follows, comments, notifications, and direct messages
- A custom server (`server.mjs`) enables WebSocket upgrades for chat

The project is full-stack, but it is not a traditional REST API backend. Most business logic lives in protected server-side actions and route handlers.

## Features

### Social Features

- Create, view, and delete posts
- Attach images to posts
- Like and unlike posts
- Add comments and threaded replies
- Like and unlike comments
- Follow and unfollow users
- Mutual follow detection for friend count and friend list

### Profile Features

- View public profiles
- Edit name, bio, location, website, and avatar
- View posts by profile owner
- See followers, following, and friends count
- Open chat directly from a profile

### Realtime Features

- Real-time home feed updates via SSE
- Real-time notification refresh via SSE
- Real-time chat delivery via WebSocket
- Optimistic client-first interactions for chat, likes, comments, follow, and profile editing

## Project Structure

```text
src/
  actions/              Server-side application logic
  app/                  App Router pages, layout, route handlers, icons
  components/           UI and feature components
  lib/                  Prisma, realtime state, event helpers, utilities
prisma/
  schema.prisma         Database schema
server.mjs              Custom Next server for WebSocket chat
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create a `.env` file with the values your app needs. At minimum:

```bash
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Depending on your Clerk configuration, you may also need your sign-in/sign-up URLs.

### 3. Prepare the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Start the app

```bash
npm run dev
```

Important: this project runs through `server.mjs`, not `next dev`, because chat uses a custom WebSocket server.

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev     # Start local development with custom WebSocket server
npm run build   # Build Next.js app
npm start       # Start production mode through custom server
npm run lint    # Run linter
```

## Data Model Overview

Main Prisma models:

- `User`
- `Post`
- `Comment`
- `Like`
- `CommentLike`
- `Follows`
- `Notification`
- `DirectMessage`

See [docs/architecture.md](./docs/architecture.md) for a deeper breakdown.

## Realtime Notes

- Feed updates use SSE
- Notifications use SSE
- Chat uses WebSocket
- Chat message sending now also goes through WebSocket

See [docs/realtime.md](./docs/realtime.md) for details.

## Deployment Notes

This project is ready for portfolio/demo deployment, but there are a few production tradeoffs:

- Chat WebSocket state is currently in-memory and suitable for a single-instance deployment
- SSE event hubs are also in-memory
- Image uploads currently write to `public/uploads`
- For production scale, replace local upload storage and move realtime fan-out to shared infrastructure such as Redis, Pusher, Ably, or a managed WebSocket layer

See [docs/deployment.md](./docs/deployment.md) for deployment notes.

## Current Limitations

- Uploads are stored locally, not in cloud object storage
- Realtime infrastructure is not yet multi-instance safe
- There is no automated test suite yet
- Mobile chat UX can still be improved further

## Resume / Portfolio Summary

Built a full-stack social media web application with real-time feed updates, user profiles, follow system, likes, comments, replies, notifications, media upload, and direct messaging using Next.js App Router, TypeScript, Prisma, PostgreSQL, Clerk, SSE, and WebSocket.
