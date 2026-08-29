"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4">
      <SignUp
        appearance={{
          baseTheme: isDark ? dark : undefined,
          elements: {
            rootBox: "mx-auto w-full max-w-md",
            card: "bg-card border border-border shadow-md rounded-md",
          },
          variables: {
            colorPrimary: isDark ? "#60a5fa" : "#2563eb",
          },
        }}
      />
    </div>
  );
}
