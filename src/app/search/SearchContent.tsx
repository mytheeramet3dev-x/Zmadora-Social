"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import FollowButton from "@/components/profile/FollowButton";
import StartChatButton from "@/components/chat/StartChatButton";
import { SearchIcon, SparklesIcon, UsersIcon, XIcon } from "lucide-react";
import { searchUsers, getRandomUsers } from "@/actions/user.action";

type SearchUserResult = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  bio?: string | null;
};

type RecommendedUser = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  isFollowing: boolean;
};

export default function SearchContent() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load recommendations initially
    getRandomUsers().then((users) => {
      setRecommendations(users);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    startTransition(async () => {
      const foundUsers = await searchUsers(debouncedQuery);
      setResults(foundUsers);
    });
  }, [debouncedQuery]);

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Search Input Bar */}
      <div className="relative flex items-center h-11 rounded-md border border-border bg-card px-3 shadow-xs">
        <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username, or keywords..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          autoFocus
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results Section */}
      {hasSearched ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search Results ({results.length})
            </h2>
            {isPending && (
              <span className="text-xs text-muted-foreground animate-pulse">Searching...</span>
            )}
          </div>

          {results.length > 0 ? (
            <div className="divide-y divide-border border border-border rounded-md bg-card overflow-hidden">
              {results.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-accent/40 transition-colors"
                >
                  <Link
                    href={`/profile/${user.username}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <Avatar className="h-10 w-10 border border-border shrink-0">
                      <AvatarImage src={user.image || "/avatar.png"} />
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground hover:underline">
                        {user.name || user.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <StartChatButton
                      contact={{
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        image: user.image,
                      }}
                    />
                    <FollowButton targetUserId={user.id} initialIsFollowing={false} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : !isPending ? (
            <div className="rounded-md border border-dashed border-border/80 bg-muted/20 py-12 text-center">
              <UsersIcon className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching with a different name or username.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        /* Suggested / Who to follow section when search is empty */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Who to follow & connect with
            </h2>
          </div>

          {recommendations.length > 0 ? (
            <div className="divide-y divide-border border border-border rounded-md bg-card overflow-hidden">
              {recommendations.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-accent/40 transition-colors"
                >
                  <Link
                    href={`/profile/${user.username}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <Avatar className="h-10 w-10 border border-border shrink-0">
                      <AvatarImage src={user.image || "/avatar.png"} />
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground hover:underline">
                        {user.name || user.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <StartChatButton
                      contact={{
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        image: user.image,
                      }}
                    />
                    <FollowButton
                      targetUserId={user.id}
                      initialIsFollowing={user.isFollowing}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No recommendations available right now.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
