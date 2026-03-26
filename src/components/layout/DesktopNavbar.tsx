import { HomeIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/layout/ModeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";

type DesktopNavbarProps = {
  isSignedIn: boolean;
  profileHref: string;
  initialNotifications: {
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
  }[];
  unreadCount: number;
};

function DesktopNavbar({
  isSignedIn,
  profileHref,
  initialNotifications,
  unreadCount,
}: DesktopNavbarProps) {

  return (
    <div className="hidden md:flex items-center space-x-4">
      <ModeToggle />

      <Button variant="ghost" className="flex items-center gap-2" asChild>
        <Link href="/">
          <HomeIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>
      </Button>

      {isSignedIn ? (
        <>
          <NotificationBell
            initialNotifications={initialNotifications}
            initialUnreadCount={unreadCount}
          />
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href={profileHref}>
              <UserIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Profile</span>
            </Link>
          </Button>
          <UserButton />
        </>
      ) : (
        <SignInButton mode="modal">
          <Button variant="default">Sign-In</Button>
        </SignInButton>
      )}
    </div>
  );
}
export default DesktopNavbar;
