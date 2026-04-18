# Zmadora

Zmadora is a full-stack social media web application built with Next.js App Router, TypeScript, Prisma, PostgreSQL, Clerk authentication, and Pusher Channels for real-time features.

It includes real-time feed updates, user profiles, follow relationships, likes, comments, replies, notifications, media upload via Cloudinary, and direct messaging.

## Highlights

- Full-stack social app using Next.js 15 App Router and TypeScript
- Clerk-based authentication with profile sync
- Create posts with optional image upload (Cloudinary)
- Like posts, comment, reply to comments, and like comments
- User profiles with editable profile details and avatar upload
- Mutual-follow friend system with friend count and friend list
- Search users by name or username with fuzzy matching (Levenshtein distance)
- Real-time feed, notification, and chat updates via Pusher Channels (WebSocket)
- Notification center for follows, likes, comments, replies, and messages
- Lazy-loaded comments with "View more" pagination
- Responsive Twitter-inspired high-contrast UI with dark mode

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React 18, TypeScript |
| Styling | Tailwind CSS, Radix UI primitives |
| Auth | Clerk |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 7 (with `@prisma/adapter-pg`) |
| Realtime | **Pusher Channels** (Feed, Notifications, Chat) |
| Uploads | **Cloudinary** (with local filesystem fallback) |
| Hosting | Custom Node.js HTTP server (`server.mjs`) |

## Architecture Summary

- **Server Actions** handle all application mutations and database workflows
- **Prisma** manages relational data for users, posts, follows, comments, notifications, and direct messages
- **Pusher Channels** delivers all real-time events — feed updates, notification refreshes, and chat messages — through a single unified WebSocket layer
- **Route Handlers** are used for the feed pagination API and image upload endpoint

All real-time event publishing happens server-side from Server Actions via the Pusher SDK. Clients subscribe to per-user Pusher channels using `pusher-js`.

## Features

### Social Features

- Create, view, and delete posts
- Attach images to posts via Cloudinary
- Like and unlike posts
- Add comments and threaded replies
- Like and unlike comments
- Follow and unfollow users
- Mutual follow detection for friend count and friend list
- "Who to Follow" suggestions that prioritise users who follow you back

### Profile Features

- View public profiles
- Edit name, bio, location, website, and avatar
- Profile image synced to Clerk on save
- View posts by profile owner
- See followers, following, and friends count
- Open chat directly from a profile

### Realtime Features (Pusher)

- Real-time home feed updates (new posts, likes, comment counts)
- Real-time notification refresh
- Real-time chat message delivery
- Optimistic UI for chat, likes, comments, follow, and profile editing

## Project Structure

```
src/
  actions/        Server-side application logic (post, user, chat, notification)
  app/            App Router pages, layout, API route handlers
  components/     UI and feature components
  lib/            Prisma client, Pusher server/client, Cloudinary, utilities
prisma/
  schema.prisma   Database schema
server.mjs        HTTP server (Next.js wrapper)
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create a `.env` file (see `.env.example`):

```bash
# Database
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Pusher Channels
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
PUSHER_APP_ID=
PUSHER_SECRET=

# Cloudinary (optional — falls back to local filesystem if not set)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 3. Prepare the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev     # Start local development server
npm run build   # Build Next.js app for production
npm start       # Start production server
npm run lint    # Run ESLint
```

## Data Model

Main Prisma models:

- `User`
- `Post`
- `Comment`
- `Like` / `CommentLike`
- `Follows`
- `Notification`
- `DirectMessage`

## Known Limitations

- No automated test suite yet
- Mobile chat UX can be improved further
- No rate limiting on Server Actions (planned)

## Resume / Portfolio Summary

Built a full-stack social media platform with Next.js 15 App Router, TypeScript, Prisma, PostgreSQL, and Clerk. Implemented real-time feed updates, notifications, and direct messaging via **Pusher Channels** (WebSocket), image uploads via **Cloudinary**, server-side fuzzy user search with Levenshtein distance scoring, optimistic UI, comment pagination, and a responsive Twitter-inspired dark-mode interface.
