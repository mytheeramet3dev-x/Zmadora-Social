export type FeedPost = {
  id: string;
  content: string | null;
  contentType?: "TEXT" | "MARKDOWN" | string;
  image: string | null;
  createdAt: Date;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
    stats?: {
      followers: number;
      posts: number;
    };
    isFollowing?: boolean;
  };
  likes: {
    userId: string;
  }[];
  bookmarks?: {
    userId: string;
  }[];
  reposts?: {
    userId: string;
  }[];
  repostedBy?: {
    id: string;
    name: string | null;
    username: string;
  } | null;
  comments: {
    id: string;
    content: string;
    createdAt: Date;
    author: {
      id: string;
      name: string | null;
      username: string;
      image: string | null;
    };
    likes: {
      userId: string;
    }[];
    replies?: {
      id: string;
      content: string;
      createdAt: Date;
      author: {
        id: string;
        name: string | null;
        username: string;
        image: string | null;
      };
      likes: {
        userId: string;
      }[];
    }[];
  }[];
  _count: {
    likes: number;
    comments: number;
    bookmarks?: number;
    reposts?: number;
  };
};

type FeedStoreState = {
  posts: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
  scrollPosition: number;
  updatedAt: number;
};

// Singleton in-memory client feed state
let feedStore: FeedStoreState | null = null;

// Cache lifetime: 15 minutes in RAM during SPA session
const STORE_TTL_MS = 15 * 60 * 1000;

export function getClientFeedStore(): FeedStoreState | null {
  if (!feedStore) return null;
  if (Date.now() - feedStore.updatedAt > STORE_TTL_MS) {
    feedStore = null;
    return null;
  }
  return feedStore;
}

export function saveClientFeedStore(
  posts: FeedPost[],
  nextCursor: string | null,
  hasMore: boolean,
  scrollPosition?: number
) {
  feedStore = {
    posts,
    nextCursor,
    hasMore,
    scrollPosition: scrollPosition ?? feedStore?.scrollPosition ?? 0,
    updatedAt: Date.now(),
  };
}

export function updateClientFeedScroll(scrollY: number) {
  if (feedStore) {
    feedStore.scrollPosition = scrollY;
  }
}

export function updateClientFeedPost(updatedPost: FeedPost) {
  if (!feedStore) return;
  feedStore.posts = feedStore.posts.map((post) =>
    post.id === updatedPost.id ? updatedPost : post
  );
}

export function prependClientFeedPost(newPost: FeedPost) {
  if (!feedStore) return;
  const filtered = feedStore.posts.filter((p) => p.id !== newPost.id);
  feedStore.posts = [newPost, ...filtered];
}

export function removeClientFeedPost(postId: string) {
  if (!feedStore) return;
  feedStore.posts = feedStore.posts.filter((p) => p.id !== postId);
}

export function clearClientFeedStore() {
  feedStore = null;
}
