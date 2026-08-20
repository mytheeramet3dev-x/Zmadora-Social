"use client";

import { FeatherIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import CreatePost from "@/components/feed/CreatePost";
import { useState } from "react";

export default function MobilePostFAB({ userImage }: { userImage?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="md:hidden fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 h-14 w-14 rounded-full shadow-xl z-40 bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
          aria-label="Create new post"
        >
          <FeatherIcon className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-[20px] px-0 pb-0 pt-4 flex flex-col">
        <SheetHeader className="px-4 pb-2 border-b border-border">
          <SheetTitle className="text-left text-sm font-semibold">New Post</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {/* We wrap CreatePost, and let it know it should close the sheet on successful post if we want, but CreatePost doesn't have an onSuccess callback currently. For now, it will toast on success. Users can swipe down to close. */}
          <CreatePost userImage={userImage} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
