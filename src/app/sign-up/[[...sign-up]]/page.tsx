import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto w-full max-w-md",
            card: "bg-background border border-border shadow-2xl rounded-3xl",
          },
        }}
      />
    </div>
  );
}
