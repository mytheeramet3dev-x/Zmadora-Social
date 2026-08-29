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
      <div className="relative flex h-9 items-center rounded-md border border-border bg-card px-2.5">
        <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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
          placeholder="Search users..."
          className="w-full bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/60"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs rounded-md"
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
        <div className="absolute left-0 right-0 top-10 z-50 rounded-md border border-border bg-popover p-1.5 shadow-md">
          {isPending ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.username}`}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent/60"
                >
                  <Avatar className="h-8 w-8 border border-border shrink-0">
                    <AvatarImage src={user.image || "/avatar.png"} />
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {user.name || user.username}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default UserSearch;
