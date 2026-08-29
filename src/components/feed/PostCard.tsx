"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  createComment,
  deletePost,
  getMoreComments,
  replyToComment,
  toggleBookmark,
  toggleCommentLike,
  toggleLike,
  toggleRepost,
} from "@/actions/post.action";
import UserQuickActions from "@/components/feed/UserQuickActions";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BookmarkIcon,
  HeartIcon,
  Loader2Icon,
  MessageCircleIcon,
  MessageSquareReplyIcon,
  Repeat2Icon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";

type CommentAuthor = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
};

type PostAuthor = CommentAuthor & {
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  stats?: {
    followers: number;
    posts: number;
  };
  isFollowing?: boolean;
};

type CommentNode = {
  id: string;
  content: string;
  createdAt: Date;
  author: CommentAuthor;
  likes: {
    userId: string;
  }[];
  replies?: CommentNode[];
};

type PostCardProps = {
  post: {
    id: string;
    content: string | null;
    image: string | null;
    createdAt: Date;
    authorId: string;
    author: PostAuthor;
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
    comments: CommentNode[];
    _count: {
      likes: number;
      comments: number;
      bookmarks?: number;
      reposts?: number;
    };
  };
  viewerUserId?: string | null;
};

function formatPostDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function appendReply(
  comments: CommentNode[],
  parentId: string,
  reply: CommentNode
): CommentNode[] {
  return comments.map((comment) =>
    comment.id === parentId
      ? { ...comment, replies: [...(comment.replies || []), reply] }
      : comment
  );
}

function toggleCommentLikeState(
  comments: CommentNode[],
  commentId: string,
  viewerUserId: string
): CommentNode[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      const exists = comment.likes.some((like) => like.userId === viewerUserId);
      return {
        ...comment,
        likes: exists
          ? comment.likes.filter((like) => like.userId !== viewerUserId)
          : [...comment.likes, { userId: viewerUserId }],
      };
    }

    if (comment.replies?.length) {
      return {
        ...comment,
        replies: toggleCommentLikeState(comment.replies, commentId, viewerUserId),
      };
    }

    return comment;
  });
}

type CommentItemProps = {
  comment: CommentNode;
  viewerUserId?: string | null;
  onToggleLike: (commentId: string, currentlyLiked: boolean) => void;
  onReply: (parentId: string, content: string) => Promise<void>;
};

function CommentItem({
  comment,
  viewerUserId,
  onToggleLike,
  onReply,
}: CommentItemProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplyPending, startReplyTransition] = useTransition();

  const isLiked = viewerUserId
    ? comment.likes.some((like) => like.userId === viewerUserId)
    : false;

  const submitReply = () => {
    const normalized = replyText.trim();
    if (!normalized) return;

    startReplyTransition(async () => {
      await onReply(comment.id, normalized);
      setReplyText("");
      setShowReplyBox(false);
    });
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-start gap-2.5">
        <Avatar className="h-8 w-8 border border-border shrink-0 mt-0.5">
          <AvatarImage src={comment.author.image || "/avatar.png"} />
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="rounded-md border border-border/50 bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-foreground">
                {comment.author.name || comment.author.username}
              </span>
              <span className="text-[11px] text-muted-foreground">
                @{comment.author.username} · {formatPostDate(comment.createdAt)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {comment.content}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-3 px-1">
            <button
              type="button"
              className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                isLiked ? "text-rose-500 font-semibold" : "text-muted-foreground hover:text-rose-500"
              }`}
              onClick={() => onToggleLike(comment.id, isLiked)}
              aria-label={isLiked ? "Unlike comment" : "Like comment"}
            >
              <HeartIcon className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
              <span>{comment.likes.length || ""}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setShowReplyBox((current) => !current)}
              aria-label="Reply to comment"
            >
              <MessageSquareReplyIcon className="h-3.5 w-3.5" />
              <span>Reply</span>
            </button>
          </div>

          {showReplyBox ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write a reply..."
                className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary transition-colors"
                disabled={isReplyPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitReply();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-md px-3 text-xs"
                onClick={submitReply}
                disabled={isReplyPending || !replyText.trim()}
              >
                {isReplyPending ? <Loader2Icon className="h-3 w-3 animate-spin" /> : "Reply"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {comment.replies?.length ? (
        <div className="ml-9 space-y-2 border-l border-border pl-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              viewerUserId={viewerUserId}
              onToggleLike={onToggleLike}
              onReply={onReply}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PostCard({ post, viewerUserId }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(
    viewerUserId ? post.likes.some((like) => like.userId === viewerUserId) : false
  );
  const [likeCount, setLikeCount] = useState(post._count.likes);

  const [isReposted, setIsReposted] = useState(
    viewerUserId ? (post.reposts?.some((r) => r.userId === viewerUserId) ?? false) : false
  );
  const [repostCount, setRepostCount] = useState(post._count.reposts ?? post.reposts?.length ?? 0);

  const [isBookmarked, setIsBookmarked] = useState(
    viewerUserId ? (post.bookmarks?.some((b) => b.userId === viewerUserId) ?? false) : false
  );
  const [bookmarkCount, setBookmarkCount] = useState(post._count.bookmarks ?? post.bookmarks?.length ?? 0);

  const [comments, setComments] = useState(post.comments);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(post.comments.length >= 2);
  const [isLoadingMoreComments, startLoadMoreTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isDeleted, setIsDeleted] = useState(false);

  const isOwner = viewerUserId === post.authorId;
  const commentCount = useMemo(() => {
    const repliesCount = comments.reduce(
      (total, comment) => total + (comment.replies?.length || 0),
      0
    );
    return comments.length + repliesCount;
  }, [comments]);

  const handleToggleLike = () => {
    if (!viewerUserId) {
      toast.error("Sign in to like posts");
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

    startActionTransition(async () => {
      const result = await toggleLike(post.id);
      if (!result?.success) {
        setIsLiked(!nextLiked);
        setLikeCount((count) => Math.max(0, count + (!nextLiked ? 1 : -1)));
        toast.error("Could not update like");
      }
    });
  };

  const handleToggleRepost = () => {
    if (!viewerUserId) {
      toast.error("Sign in to repost");
      return;
    }

    const nextReposted = !isReposted;
    setIsReposted(nextReposted);
    setRepostCount((count) => Math.max(0, count + (nextReposted ? 1 : -1)));

    startActionTransition(async () => {
      const result = await toggleRepost(post.id);
      if (!result?.success) {
        setIsReposted(!nextReposted);
        setRepostCount((count) => Math.max(0, count + (!nextReposted ? 1 : -1)));
        toast.error(result?.error || "Could not repost");
      } else {
        toast.success(nextReposted ? "Reposted to your feed" : "Repost removed");
      }
    });
  };

  const handleToggleBookmark = () => {
    if (!viewerUserId) {
      toast.error("Sign in to save posts");
      return;
    }

    const nextBookmarked = !isBookmarked;
    setIsBookmarked(nextBookmarked);
    setBookmarkCount((count) => Math.max(0, count + (nextBookmarked ? 1 : -1)));

    startActionTransition(async () => {
      const result = await toggleBookmark(post.id);
      if (!result?.success) {
        setIsBookmarked(!nextBookmarked);
        setBookmarkCount((count) => Math.max(0, count + (!nextBookmarked ? 1 : -1)));
        toast.error(result?.error || "Could not save post");
      } else {
        toast.success(nextBookmarked ? "Saved to favorites" : "Removed from favorites");
      }
    });
  };

  const handleCreateComment = () => {
    const normalized = commentText.trim();
    if (!normalized) return;
    if (!viewerUserId) {
      toast.error("Sign in to comment");
      return;
    }

    const optimisticId = `temp-comment-${crypto.randomUUID()}`;
    const optimisticComment: CommentNode = {
      id: optimisticId,
      content: normalized,
      createdAt: new Date(),
      author: {
        id: viewerUserId,
        name: "You",
        username: "you",
        image: null,
      },
      likes: [],
      replies: [],
    };

    setComments((prev) => [...prev, optimisticComment]);
    setCommentText("");
    setShowComments(true);

    startActionTransition(async () => {
      const result = await createComment(post.id, normalized);
      if (!result?.success || !result.comment) {
        setComments((prev) => prev.filter((c) => c.id !== optimisticId));
        toast.error(result?.error || "Could not post comment");
        return;
      }

      setComments((prev) =>
        prev.map((c) =>
          c.id === optimisticId
            ? {
                ...result.comment,
                createdAt: new Date(result.comment.createdAt),
                author: result.comment.author,
                likes: [],
                replies: [],
              }
            : c
        )
      );
    });
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!viewerUserId) {
      toast.error("Sign in to reply");
      return;
    }

    const result = await replyToComment(post.id, parentId, content);
    if (!result?.success || !result.comment) {
      toast.error(result?.error || "Could not post reply");
      return;
    }

    setComments((prev) =>
      appendReply(prev, parentId, {
        ...result.comment,
        createdAt: new Date(result.comment.createdAt),
        author: result.comment.author,
        likes: [],
        replies: [],
      })
    );
  };

  const handleToggleCommentLike = (commentId: string, currentlyLiked: boolean) => {
    if (!viewerUserId) {
      toast.error("Sign in to like comments");
      return;
    }

    setComments((prev) => toggleCommentLikeState(prev, commentId, viewerUserId));

    startActionTransition(async () => {
      const result = await toggleCommentLike(commentId);
      if (!result?.success) {
        setComments((prev) => toggleCommentLikeState(prev, commentId, viewerUserId));
        toast.error(result?.error || "Could not like comment");
      }
    });
  };

  const handleDeletePost = () => {
    startDeleteTransition(async () => {
      const result = await deletePost(post.id);
      if (result?.success) {
        setIsDeleted(true);
        toast.success("Post deleted");
      } else {
        toast.error(result?.error || "Failed to delete post");
      }
    });
  };

  const handleLoadMoreComments = () => {
    startLoadMoreTransition(async () => {
      const result = await getMoreComments(post.id, comments.length);
      
      if (!result?.success || !result.comments) {
        toast.error(result?.error || "Failed to load more comments");
        return;
      }

      const parsedComments = result.comments.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        replies: c.replies?.map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) }))
      }));

      setComments((prev) => [...prev, ...parsedComments]);
      
      if (result.comments.length < 20) {
        setHasMoreComments(false);
      }
    });
  };

  if (isDeleted) {
    return null;
  }

  return (
    <article className="p-4 sm:p-5 transition-colors hover:bg-muted/10 border-b border-border last:border-b-0">
      {post.repostedBy ? (
        <div className="flex items-center gap-2 mb-2.5 pl-3 text-xs font-medium text-muted-foreground">
          <Repeat2Icon className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" />
          <span>
            {post.repostedBy.id === viewerUserId
              ? "You reposted"
              : `${post.repostedBy.name || `@${post.repostedBy.username}`} reposted`}
          </span>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <UserQuickActions user={post.author} viewerUserId={viewerUserId}>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left group"
          >
            <Avatar className="h-10 w-10 border border-border shrink-0">
              <AvatarImage src={post.author.image || "/avatar.png"} />
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[15px] font-semibold text-foreground group-hover:underline">
                  {post.author.name || post.author.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  @{post.author.username}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatPostDate(post.createdAt)}
                </span>
              </div>
            </div>
          </button>
        </UserQuickActions>

        {isOwner ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeletePost}
            disabled={isDeletePending}
            className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-md"
            aria-label="Delete post"
          >
            {isDeletePending ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2Icon className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>

      {post.content ? (
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
          {post.content}
        </p>
      ) : null}

      {post.image ? (
        <div className="relative mt-3 max-h-[480px] w-full overflow-hidden rounded-md border border-border bg-muted/20">
          <Image
            src={post.image}
            alt="Post media"
            width={800}
            height={500}
            className="w-full h-auto object-cover max-h-[480px]"
            sizes="(max-width: 768px) 100vw, 680px"
          />
        </div>
      ) : null}

      {/* 4-Action Toolbar: 1. Like, 2. Comment, 3. Repost, 4. Favorite/Bookmark */}
      <div className="mt-3 flex items-center justify-between max-w-md pt-1">
        {/* 1. Like */}
        <button
          type="button"
          onClick={handleToggleLike}
          className={`group flex items-center gap-1.5 py-1 px-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            isLiked ? "text-rose-500 font-semibold" : "text-muted-foreground hover:text-rose-500"
          }`}
          aria-label={isLiked ? "Unlike post" : "Like post"}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md transition-colors group-hover:bg-rose-500/10">
            <HeartIcon className={`h-4 w-4 transition-transform group-hover:scale-105 ${isLiked ? "fill-current" : ""}`} />
          </div>
          <span>{likeCount || ""}</span>
        </button>

        {/* 2. Comment */}
        <button
          type="button"
          onClick={() => setShowComments((current) => !current)}
          className="group flex items-center gap-1.5 py-1 px-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          aria-label="Toggle comments"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md transition-colors group-hover:bg-primary/10">
            <MessageCircleIcon className="h-4 w-4 transition-transform group-hover:scale-105" />
          </div>
          <span>{commentCount || ""}</span>
        </button>

        {/* 3. Repost */}
        <button
          type="button"
          onClick={handleToggleRepost}
          className={`group flex items-center gap-1.5 py-1 px-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            isReposted ? "text-emerald-500 font-semibold" : "text-muted-foreground hover:text-emerald-500"
          }`}
          aria-label={isReposted ? "Undo repost" : "Repost"}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md transition-colors group-hover:bg-emerald-500/10">
            <Repeat2Icon className={`h-4 w-4 transition-transform group-hover:scale-105 ${isReposted ? "stroke-[2.5]" : ""}`} />
          </div>
          <span>{repostCount || ""}</span>
        </button>

        {/* 4. Bookmark / Favorite */}
        <button
          type="button"
          onClick={handleToggleBookmark}
          className={`group flex items-center gap-1.5 py-1 px-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            isBookmarked ? "text-amber-500 font-semibold" : "text-muted-foreground hover:text-amber-500"
          }`}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark post"}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md transition-colors group-hover:bg-amber-500/10">
            <BookmarkIcon className={`h-4 w-4 transition-transform group-hover:scale-105 ${isBookmarked ? "fill-current" : ""}`} />
          </div>
          <span>{bookmarkCount || ""}</span>
        </button>
      </div>

      {/* Inline Comments Section */}
      <div className="mt-3 space-y-3">
        {/* Comment input field */}
        <div className="flex items-center gap-2">
          <input
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Write a comment..."
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary transition-colors"
            disabled={isActionPending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCreateComment();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 shrink-0 rounded-md font-medium shadow-none"
            onClick={handleCreateComment}
            disabled={isActionPending || !commentText.trim()}
            aria-label="Send comment"
          >
            {isActionPending ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              "Reply"
            )}
          </Button>
        </div>

        {/* Existing comments list */}
        {showComments && comments.length > 0 ? (
          <div className="mt-3 space-y-2.5 pt-1">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                viewerUserId={viewerUserId}
                onToggleLike={handleToggleCommentLike}
                onReply={handleReply}
              />
            ))}

            {hasMoreComments && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground mt-1 rounded-md h-8"
                onClick={handleLoadMoreComments}
                disabled={isLoadingMoreComments}
              >
                {isLoadingMoreComments ? (
                  <><Loader2Icon className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Loading...</>
                ) : (
                  "View more comments"
                )}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default PostCard;
