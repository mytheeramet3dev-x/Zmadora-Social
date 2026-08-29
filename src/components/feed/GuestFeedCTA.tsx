import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GuestFeedCTA() {
  return (
    <div className="rounded-md border border-border bg-card p-6 text-center m-4">
      <h2 className="text-lg font-semibold tracking-tight">Join the conversation</h2>
      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
        Sign in to publish posts, follow people, and join discussions.
      </p>
      <div className="mt-4 flex justify-center">
        <Button size="default" className="rounded-md font-medium shadow-sm" asChild>
          <Link href="/sign-in">Sign in to post</Link>
        </Button>
      </div>
    </div>
  );
}
