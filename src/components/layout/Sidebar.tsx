import { getCurrentUserContext, getRandomUsers } from "@/actions/user.action";
import { getNotifications } from "@/actions/notification.action";
import { getChatUnreadCount } from "@/actions/chat.action";
import Link from "next/link";
import { HomeIcon, UserIcon, FeatherIcon } from "lucide-react";
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

  const linkClass = "flex items-center justify-center xl:justify-start gap-4 hover:bg-muted/50 xl:rounded-full rounded-2xl p-3 xl:px-4 xl:py-3 transition w-fit text-foreground";

  return (
    <div className="sticky top-0 h-screen flex flex-col py-6 w-full">
      <div className="flex flex-col items-center xl:items-start space-y-6 xl:pl-6 w-full">
        <Link
          href="/"
          className="xl:px-4"
        >
          <div className="hidden xl:block bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 bg-clip-text font-mono text-2xl font-bold tracking-[0.28em] text-transparent">
            Zmadora
          </div>
          <div className="xl:hidden w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 flex items-center justify-center text-white font-bold text-xl">
            Z
          </div>
        </Link>
        
        <div className="mt-8 space-y-2 flex flex-col items-center xl:items-start">
          <Link href="/" className={linkClass}>
            <HomeIcon className="w-7 h-7" strokeWidth={2} />
            <span className="text-xl font-medium hidden xl:inline">Home</span>
          </Link>
          
          {context ? (
            <>
              <NotificationBell
                userId={context.dbUser.id}
                initialNotifications={notifications}
                initialUnreadCount={unreadCount}
                className={linkClass}
                showLabel={true}
                labelClassName="text-xl font-medium hidden xl:inline"
              />

              <Link href={profileHref} className={linkClass}>
                <UserIcon className="w-7 h-7" strokeWidth={2} />
                <span className="text-xl font-medium hidden xl:inline">Profile</span>
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-6 hidden xl:flex w-full justify-center px-4">
        <UserSearch className="relative w-full max-w-[240px]" />
      </div>

      {context ? (
        <div className="mt-8 hidden xl:flex w-full justify-center px-4 flex-1">
          <div className="w-full max-w-[240px]">
            <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-widest px-2 text-center">Who to follow</p>
            {suggestedUsers.length > 0 ? (
              <div className="space-y-3">
                {suggestedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 hover:bg-muted/50 p-2 -mx-2 rounded-xl transition w-full">
                    <Link href={`/profile/${u.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                      <Avatar className="w-10 h-10 border border-border shrink-0">
                        <AvatarImage src={u.image || "/avatar.png"} />
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:underline">{u.name || u.username}</p>
                        <p className="truncate text-[11px] font-mono text-muted-foreground mt-0.5 tracking-tight">@{u.username}</p>
                      </div>
                    </Link>
                    <div className="shrink-0">
                      <FollowButton
                        targetUserId={u.id}
                        initialIsFollowing={u.isFollowing}
                        size="sm"
                        className="h-7 px-3 text-xs min-w-[70px] rounded-full"
                        followLabel="Follow"
                        followingLabel="Following"
                        pendingLabel="..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mx-2 p-4 text-center rounded-2xl border border-dashed border-border bg-muted/10">
                <p className="text-sm text-muted-foreground">No new users to recommend right now.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1"></div>
      )}

      <div className="flex items-center gap-4 px-4 pb-4 mt-auto justify-center xl:justify-start xl:pl-6 w-full">
        {context ? (
          <div className="flex items-center xl:gap-3 gap-0 w-full">
            <div className="flex-shrink-0">
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10" } }} />
            </div>
            <Link href={profileHref} className="flex-1 min-w-0 hidden xl:block hover:underline">
               <p className="truncate text-sm font-bold">{context.dbUser.name || context.dbUser.username}</p>
               <p className="truncate text-xs text-muted-foreground">@{context.dbUser.username}</p>
            </Link>
            <div className="hidden xl:block">
                <ModeToggle />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full items-center xl:items-stretch">
             <div className="hidden xl:block">
               <ModeToggle />
             </div>
             <SignInButton mode="modal">
               <Button variant="default" className="w-12 h-12 xl:w-full rounded-full">
                  <span className="hidden xl:inline">Sign-In</span>
                  <UserIcon className="w-5 h-5 xl:hidden" />
               </Button>
             </SignInButton>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
