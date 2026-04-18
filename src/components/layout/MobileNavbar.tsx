"use client";

import {
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import Link from "next/link";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserSearch from "@/components/search/UserSearch";

type MobileNavbarProps = {
  userId?: string;
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

function MobileNavbar({
  userId,
  profileHref,
  initialNotifications,
  unreadCount,
}: MobileNavbarProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { isSignedIn } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex md:hidden items-center space-x-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="mr-2"
      >
        <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scal-0" />
        <MoonIcon className="absolute h-1[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetTrigger asChild>
          <Button variant="ghost">
            <MenuIcon className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-300px">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col space-y-4 mt-6">
            <UserSearch className="relative" />
            <Button
              variant="ghost"
              className="flex items-center gap-3 justify-start"
              asChild
            >
              <Link href="/">
                <HomeIcon className="w-4 h-4" />
                Home
              </Link>
            </Button>

            {isSignedIn ? (
              <>
                <div className="px-1">
                  <NotificationBell
                    userId={userId!}
                    initialNotifications={initialNotifications}
                    initialUnreadCount={unreadCount}
                    className="flex w-full items-center justify-start gap-4 p-4"
                    labelClassName="text-lg font-medium"
                  />
                </div>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 justify-start"
                  asChild
                >
                  <Link href={profileHref}>
                    <UserIcon className="w-4 h-4" />
                    Profile
                  </Link>
                </Button>
                <SignOutButton>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 justify-start w-full"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    Logout
                  </Button>
                </SignOutButton>
              </>
            ) : (
              <SignInButton mode="modal">
                <Button variant="default" className="w-full">
                  Sign-In
                </Button>
              </SignInButton>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
export default MobileNavbar;
