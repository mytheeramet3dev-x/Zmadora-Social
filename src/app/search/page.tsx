import { Suspense } from "react";
import SearchContent from "./SearchContent";

export const metadata = {
  title: "Search | Zmadora",
  description: "Search for users and connect on Zmadora",
};

export default function SearchPage() {
  return (
    <div className="w-full min-h-screen border-x border-border">
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <h1 className="text-lg font-bold tracking-tight">Explore & Search</h1>
      </div>

      <Suspense
        fallback={
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading search...
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </div>
  );
}
