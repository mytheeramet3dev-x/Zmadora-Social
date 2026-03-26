"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BellIcon,
  CheckCheckIcon,
  HeartIcon,
  MessageCircleIcon,
  MessageCircleMoreIcon,
  MessageSquareReplyIcon,
  UserPlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getNotifications, markAllNotificationsAsRead } from "@/actions/notification.action";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: "LIKE" | "COMMENT" | "FOLLOW" | "COMMENT_LIKE" | "REPLY" | "MESSAGE";
  read: boolean;
  createdAt: string | Date;
  creator: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  post: {
    id: string;
    content: string | null;
    image: string | null;
  } | null;
  comment: {
    id: string;
    content: string | null;
  } | null;
  message: {
    id: string;
    content: string | null;
  } | null;
};

type NotificationBellProps = {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  className?: string;
  showLabel?: boolean;
  labelClassName?: string;
};

function getNotificationCopy(notification: NotificationItem) {
  const actor = notification.creator.name || `@${notification.creator.username}`;

  switch (notification.type) {
    case "LIKE":
      return {
        icon: HeartIcon,
        accent: "text-rose-500",
        title: `${actor} liked your post`,
        body: notification.post?.content || "They reacted to one of your posts.",
      };
    case "COMMENT":
      return {
        icon: MessageCircleIcon,
        accent: "text-sky-500",
        title: `${actor} commented on your post`,
        body: notification.post?.content || "They left a new comment for you.",
      };
    case "COMMENT_LIKE":
      return {
        icon: HeartIcon,
        accent: "text-pink-500",
        title: `${actor} liked your comment`,
        body: notification.comment?.content || "Someone reacted to your comment.",
      };
    case "REPLY":
      return {
        icon: MessageSquareReplyIcon,
        accent: "text-cyan-500",
        title: `${actor} replied to your comment`,
        body: notification.comment?.content || "There is a new reply in the thread.",
      };
    case "FOLLOW":
      return {
        icon: UserPlusIcon,
        accent: "text-emerald-500",
        title: `${actor} followed you`,
        body: "Your profile is getting attention.",
      };
    case "MESSAGE":
      return {
        icon: MessageCircleMoreIcon,
        accent: "text-sky-500",
        title: `${actor} sent you a message`,
        body: notification.message?.content || "Open chat to continue the conversation.",
      };
  }
}

function formatNotificationTime(createdAt: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(createdAt));
}

function NotificationBell({
  initialNotifications,
  initialUnreadCount,
  className,
  showLabel = true,
  labelClassName = "hidden lg:inline",
}: NotificationBellProps) {
  const router = useRouter();
  const { openChat } = useLayoutChrome();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isPending, startTransition] = useTransition();

  const hasNotifications = notifications.length > 0;
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const refreshNotifications = useCallback(async () => {
    const next = await getNotifications();
    setNotifications(next.notifications as NotificationItem[]);
    setUnreadCount(next.unreadCount);
  }, []);

  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream");

    const handleNotificationEvent = () => {
      void refreshNotifications();
    };

    eventSource.addEventListener("notification", handleNotificationEvent as EventListener);

    return () => {
      eventSource.removeEventListener(
        "notification",
        handleNotificationEvent as EventListener
      );
      eventSource.close();
    };
  }, [refreshNotifications]);

  const handleOpenChange = (open: boolean) => {
    if (!open || unreadCount === 0) return;

    setUnreadCount(0);
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );

    startTransition(async () => {
      const result = await markAllNotificationsAsRead();
      if (!result.success) {
        toast.error(result.error || "Failed to update notifications");
        await refreshNotifications();
      }
    });
  };

  const handleNotificationSelect = (notification: NotificationItem) => {
    if (notification.type === "MESSAGE") {
      openChat();
      window.dispatchEvent(
        new CustomEvent("social:open-chat", {
          detail: {
            id: notification.creator.id,
            name: notification.creator.name,
            username: notification.creator.username,
            image: notification.creator.image,
          },
        })
      );
      return;
    }

    if (notification.type === "FOLLOW") {
      router.push(`/profile/${notification.creator.username}`);
      return;
    }

    router.push("/");
  };

  return (
    <DropdownMenu.Root onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" className={cn("relative flex items-center gap-2", className)}>
          <BellIcon className="h-4 w-4" />
          {showLabel ? <span className={labelClassName}>Notifications</span> : null}
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold text-white shadow-lg">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={12}
          className="glass-panel z-50 w-[22rem] rounded-[24px] p-2 shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {hasNotifications
                  ? `${notifications.length} recent updates`
                  : "You are all caught up"}
              </p>
            </div>
            {isPending ? (
              <span className="text-xs text-muted-foreground">Updating...</span>
            ) : unreadCount > 0 ? (
              <div className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                <CheckCheckIcon className="h-3.5 w-3.5" />
                New
              </div>
            ) : null}
          </div>

          <div className="max-h-[26rem] space-y-2 overflow-y-auto px-1 pb-1">
            {hasNotifications ? (
              notifications.map((notification) => {
                const copy = getNotificationCopy(notification);
                const Icon = copy.icon;

                return (
                  <DropdownMenu.Item
                    key={notification.id}
                    onSelect={(event) => {
                      event.preventDefault();
                      handleNotificationSelect(notification);
                    }}
                    className="outline-none"
                  >
                    <button
                      type="button"
                      className={[
                        "flex w-full items-start gap-3 rounded-[20px] border px-3 py-3 text-left transition",
                        notification.read
                          ? "border-white/10 bg-white/30 dark:bg-white/5"
                          : "border-sky-300/60 bg-sky-50/80 dark:border-sky-400/20 dark:bg-sky-500/10",
                      ].join(" ")}
                    >
                      <Avatar className="h-10 w-10 border border-white/40">
                        <AvatarImage src={notification.creator.image || "/avatar.png"} />
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium leading-5">{copy.title}</p>
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${copy.accent}`} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {copy.body}
                        </p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                    </button>
                  </DropdownMenu.Item>
                );
              })
            ) : (
              <div className="rounded-[20px] border border-white/10 bg-white/30 px-4 py-8 text-center dark:bg-white/5">
                <BellIcon className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No notifications yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New follows, reactions, replies, and messages will appear here.
                </p>
              </div>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default NotificationBell;
