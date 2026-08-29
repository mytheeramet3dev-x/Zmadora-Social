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
          className="md:hidden fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 h-12 w-12 rounded-full shadow-md z-40 bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
          aria-label="Create new post"
        >
          <FeatherIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92dvh] rounded-t-lg px-0 pb-0 pt-3 flex flex-col bg-background">
        <SheetHeader className="px-4 pb-2 border-b border-border">
          <SheetTitle className="text-left text-sm font-semibold">New Post</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <CreatePost userImage={userImage} onPostCreated={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
