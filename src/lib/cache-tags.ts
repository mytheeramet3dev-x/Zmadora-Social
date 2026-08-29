export const CACHE_TAGS = {
  feed: "feed-posts",
  posts: "posts",
  post: (id: string) => `post:${id}`,
  profile: (username: string) => `profile:${username}`,
  userStats: (userId: string) => `user-stats:${userId}`,
  whoToFollow: "who-to-follow",
} as const;
