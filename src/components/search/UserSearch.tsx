"use client";

import { searchUsers } from "@/actions/user.action";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

type UserSearchProps = {
  className?: string;
};

function UserSearch({ className }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<
    {
      id: string;
      name: string | null;
      username: string;
      image: string | null;
    }[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = (value: string) => {
    const normalizedQuery = value.trim();

    if (normalizedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    startTransition(async () => {
      const users = await searchUsers(normalizedQuery);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setResults(users);
      setIsOpen(true);
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      requestIdRef.current += 1;
      setResults([]);
      setIsOpen(false);
      return;
    }

    runSearch(debouncedQuery);
  }, [debouncedQuery]);

  return (
    <div ref={containerRef} className={className}>
      <div className="relative flex h-10 items-center rounded-full border border-border bg-muted/50 px-2">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setDebouncedQuery(query.trim());
              runSearch(query);
            }
          }}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search users"
          className="w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-3"
          onClick={() => {
            setDebouncedQuery(query.trim());
            runSearch(query);
          }}
          disabled={query.trim().length < 2 || isPending}
        >
          Search
        </Button>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-12 z-50 rounded-[24px] border border-border bg-popover p-2 shadow-2xl">
          {isPending ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.username}`}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={user.image || "/avatar.png"} />
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.name || user.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default UserSearch;
