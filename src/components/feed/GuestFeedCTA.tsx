import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";

export default function GuestFeedCTA() {
  return (
    <div className="glass-panel rounded-[28px] p-8 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Join the conversation</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to publish posts, follow people, and join realtime discussions.
      </p>
      <div className="mt-5 flex justify-center">
        <SignInButton mode="modal">
          <Button size="lg" className="min-w-40">
            Sign in to post
          </Button>
        </SignInButton>
      </div>
    </div>
  );
}
