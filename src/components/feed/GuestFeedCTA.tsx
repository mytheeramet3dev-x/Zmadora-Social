import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GuestFeedCTA() {
  return (
    <div className="glass-panel rounded-[28px] p-8 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Join the conversation</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to publish posts, follow people, and join realtime discussions.
      </p>
      <div className="mt-5 flex justify-center">
        <Button size="lg" className="min-w-40 rounded-full shadow-lg" asChild>
          <Link href="/sign-in">Sign in to post</Link>
        </Button>
      </div>
    </div>
  );
}
