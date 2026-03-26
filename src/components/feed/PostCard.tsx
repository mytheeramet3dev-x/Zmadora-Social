"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  createComment,
  deletePost,
  replyToComment,
  toggleCommentLike,
  toggleLike,
} from "@/actions/post.action";
import UserQuickActions from "@/components/feed/UserQuickActions";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  HeartIcon,
  Loader2Icon,
  MessageCircleIcon,
  MessageSquareReplyIcon,
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
    comments: CommentNode[];
    _count: {
      likes: number;
      comments: number;
    };
  };
  viewerUserId?: string | null;
};

function formatPostDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 border border-white/30">
          <AvatarImage src={comment.author.image || "/avatar.png"} />
        </Avatar>
        <div className="min-w-0 flex-1 rounded-2xl bg-white/35 px-3 py-2 dark:bg-white/5">
          <p className="text-xs font-medium">
            {comment.author.name || comment.author.username}
            <span className="ml-2 text-muted-foreground">
              @{comment.author.username} · {formatPostDate(comment.createdAt)}
            </span>
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
            {comment.content}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={isLiked ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => onToggleLike(comment.id, isLiked)}
            >
              <HeartIcon className={`mr-2 h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
              {comment.likes.length}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3"
              onClick={() => setShowReplyBox((current) => !current)}
            >
              <MessageSquareReplyIcon className="mr-2 h-3.5 w-3.5" />
              Reply
            </Button>
          </div>

          {showReplyBox ? (
            <div className="mt-3 space-y-2 rounded-2xl border border-white/15 bg-white/20 p-3 dark:bg-white/5">
              <Textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write a reply..."
                className="min-h-[72px] border-none bg-transparent px-1 py-1 shadow-none focus-visible:ring-0"
                disabled={isReplyPending}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyText("");
                    setShowReplyBox(false);
                  }}
                  disabled={isReplyPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={submitReply}
                  disabled={isReplyPending || !replyText.trim()}
                >
                  {isReplyPending ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    "Reply"
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {comment.replies?.length ? (
        <div className="ml-12 space-y-3 border-l border-white/10 pl-4">
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
  const [comments, setComments] = useState(post.comments);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(post.comments.length > 0);
  const [isCommentPending, startCommentTransition] = useTransition();
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
    setLikeCount((current) => current + (nextLiked ? 1 : -1));

    startCommentTransition(async () => {
      const result = await toggleLike(post.id);

      if (!result?.success) {
        setIsLiked(!nextLiked);
        setLikeCount((current) => current + (nextLiked ? -1 : 1));
        toast.error(result?.error || "Failed to update like");
      }
    });
  };

  const handleCreateComment = () => {
    const normalizedComment = commentText.trim();

    if (!viewerUserId) {
      toast.error("Sign in to comment");
      return;
    }

    if (!normalizedComment) {
      return;
    }

    startCommentTransition(async () => {
      const result = await createComment(post.id, normalizedComment);

      if (!result?.success || !result.comment) {
        toast.error(result?.error || "Failed to post comment");
        return;
      }

      setComments((current) => [...current, result.comment as CommentNode]);
      setCommentText("");
      setShowComments(true);
    });
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!viewerUserId) {
      toast.error("Sign in to reply");
      return;
    }

    const result = await replyToComment(post.id, parentId, content);
    if (!result?.success || !result.comment) {
      toast.error(result?.error || "Failed to reply");
      return;
    }

    setComments((current) =>
      appendReply(current, parentId, result.comment as CommentNode)
    );
    setShowComments(true);
  };

  const handleToggleCommentLike = (commentId: string, currentlyLiked: boolean) => {
    if (!viewerUserId) {
      toast.error("Sign in to like comments");
      return;
    }

    setComments((current) =>
      toggleCommentLikeState(current, commentId, viewerUserId)
    );

    void (async () => {
      const result = await toggleCommentLike(commentId);
      if (!result?.success) {
        setComments((current) =>
          toggleCommentLikeState(current, commentId, viewerUserId)
        );
        toast.error(result?.error || "Failed to update comment like");
        return;
      }

    })();
  };

  const handleDeletePost = () => {
    startDeleteTransition(async () => {
      const result = await deletePost(post.id);

      if (!result?.success) {
        toast.error(result?.error || "Failed to delete post");
        return;
      }

      toast.success("Post deleted");
      setIsDeleted(true);
    });
  };

  if (isDeleted) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <UserQuickActions user={post.author} viewerUserId={viewerUserId}>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl text-left transition hover:bg-white/5"
            >
              <Avatar className="h-11 w-11 border border-white/40">
                <AvatarImage src={post.author.image || "/avatar.png"} />
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold hover:underline">
                    {post.author.name || post.author.username}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Profile
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  @{post.author.username} · {formatPostDate(post.createdAt)}
                </p>
              </div>
            </button>
          </UserQuickActions>

          {isOwner ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeletePost}
              disabled={isDeletePending}
              className="h-8 w-8"
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
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {post.content}
          </p>
        ) : null}

        {post.image ? (
          <div className="relative mt-4 h-64 overflow-hidden rounded-2xl border border-white/20 bg-white/20">
            <Image
              src={post.image}
              alt="Post media"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 640px"
              unoptimized
            />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={isLiked ? "default" : "outline"}
            onClick={handleToggleLike}
            className="min-w-24"
          >
            <HeartIcon className={`mr-2 h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            {likeCount}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowComments((current) => !current)}
            className="min-w-24"
          >
            <MessageCircleIcon className="mr-2 h-4 w-4" />
            {commentCount}
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-[24px] border border-white/20 bg-white/20 p-4 dark:bg-white/5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Join the conversation</p>
                <p className="text-xs text-muted-foreground">
                  Add your comment below
                </p>
              </div>
              <div className="rounded-full bg-white/25 px-3 py-1 text-xs text-muted-foreground dark:bg-white/10">
                {commentCount} comments
              </div>
            </div>

            <div className="rounded-[20px] border border-white/15 bg-white/30 p-3 dark:bg-white/5">
              <div className="flex items-end gap-3">
                <Textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[84px] border-none bg-transparent px-1 py-1 shadow-none focus-visible:ring-0"
                  disabled={isCommentPending}
                />
                <Button
                  type="button"
                  onClick={handleCreateComment}
                  disabled={isCommentPending || !commentText.trim()}
                >
                  {isCommentPending ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {showComments ? (
            <div className="rounded-[24px] border border-white/20 bg-white/16 p-4 dark:bg-white/[0.04]">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-sm font-semibold">Comments</p>
                  <p className="text-xs text-muted-foreground">
                    Replies and reactions from other people
                  </p>
                </div>
                <div className="rounded-full bg-white/25 px-3 py-1 text-xs text-muted-foreground dark:bg-white/10">
                  {commentCount}
                </div>
              </div>

              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      viewerUserId={viewerUserId}
                      onToggleLike={handleToggleCommentLike}
                      onReply={handleReply}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No comments yet. Start the conversation.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default PostCard;
