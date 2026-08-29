import { getCurrentUserContext, getRandomUsers } from "@/actions/user.action";
import { getNotifications } from "@/actions/notification.action";
import { getChatUnreadCount } from "@/actions/chat.action";
import Link from "next/link";
import { HomeIcon, UserIcon, FeatherIcon, SettingsIcon } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserSearch from "@/components/search/UserSearch";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import FollowButton from "@/components/profile/FollowButton";

async function Sidebar() {
  const context = await getCurrentUserContext();
  const profileHref = context?.profileHref ?? "/profile";
  const [{ notifications, unreadCount }, chatUnreadCount, suggestedUsers] = context
    ? await Promise.all([getNotifications(), getChatUnreadCount(), getRandomUsers()])
    : [{ notifications: [], unreadCount: 0 }, 0, []];

  const linkClass =
    "flex items-center justify-center xl:justify-start gap-3.5 text-foreground/80 hover:text-foreground hover:bg-accent rounded-md p-2.5 xl:px-3.5 xl:py-2.5 transition-colors duration-150 w-full text-base font-medium";

  return (
    <div className="h-full flex flex-col py-4 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col items-center xl:items-start space-y-4 xl:pl-4 w-full">
        <Link
          href="/"
          className="xl:px-3.5 flex items-center gap-2"
        >
          <div className="hidden xl:block bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text font-mono text-2xl font-bold tracking-[0.2em] text-transparent">
            Zmadora
          </div>
          <div className="xl:hidden w-10 h-10 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
            Z
          </div>
        </Link>
        
        <div className="mt-4 space-y-1 flex flex-col items-center xl:items-start w-full">
          <Link href="/" className={linkClass}>
            <HomeIcon className="w-5 h-5" strokeWidth={2} />
            <span className="hidden xl:inline">Home</span>
          </Link>
          
          {context ? (
            <>
              <NotificationBell
                userId={context.dbUser.id}
                initialNotifications={notifications}
                initialUnreadCount={unreadCount}
                className={linkClass}
                showLabel={true}
                iconClassName="w-5 h-5"
                labelClassName="text-base font-medium hidden xl:inline"
              />

              <Link href={profileHref} className={linkClass}>
                <UserIcon className="w-5 h-5" strokeWidth={2} />
                <span className="hidden xl:inline">Profile</span>
              </Link>

              <Link href="/settings" className={linkClass}>
                <SettingsIcon className="w-5 h-5" strokeWidth={2} />
                <span className="hidden xl:inline">Settings</span>
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 hidden xl:flex w-full justify-center px-4">
        <UserSearch className="relative w-full max-w-[240px]" />
      </div>

      {context ? (
        <div className="mt-6 hidden xl:flex w-full justify-center px-4 flex-1">
          <div className="w-full max-w-[240px]">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider px-1">
              Who to follow
            </p>
            {suggestedUsers.length > 0 ? (
              <div className="space-y-2">
                {suggestedUsers.map((u: { id: string; name: string | null; username: string; image: string | null; isFollowing: boolean }) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 hover:bg-accent/60 p-2 -mx-1 rounded-md transition-colors w-full">
                    <Link href={`/profile/${u.username}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                      <Avatar className="w-9 h-9 border border-border shrink-0">
                        <AvatarImage src={u.image || "/avatar.png"} />
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground group-hover:underline">{u.name || u.username}</p>
                        <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                    </Link>
                    <div className="shrink-0">
                      <FollowButton
                        targetUserId={u.id}
                        initialIsFollowing={u.isFollowing}
                        size="sm"
                        className="h-7 px-2.5 text-xs min-w-[64px]"
                        followLabel="Follow"
                        followingLabel="Following"
                        pendingLabel="..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center rounded-md border border-dashed border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">No suggestions right now</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1"></div>
      )}

      <div className="flex items-center gap-3 px-4 pb-4 mt-auto justify-center xl:justify-start xl:pl-4 w-full border-t border-border pt-3">
        {context ? (
          <div className="flex items-center xl:gap-3 gap-0 w-full justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-9 h-9" } }} />
              <Link href={profileHref} className="flex-1 min-w-0 hidden xl:block hover:underline">
                <p className="truncate text-sm font-semibold">{context.dbUser.name || context.dbUser.username}</p>
                <p className="truncate text-xs text-muted-foreground">@{context.dbUser.username}</p>
              </Link>
            </div>
            <div className="hidden xl:block">
              <ModeToggle />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full items-center xl:items-stretch">
            <div className="hidden xl:block">
              <ModeToggle />
            </div>
            <Button variant="default" className="w-10 h-10 xl:w-full rounded-md shadow-sm" asChild>
              <Link href="/sign-in">
                <span className="hidden xl:inline">Sign In</span>
                <UserIcon className="w-4 h-4 xl:hidden" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
