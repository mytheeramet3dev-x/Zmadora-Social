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

  const runSearch = (value: string) => {
    const normalizedQuery = value.trim();

    if (normalizedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    startTransition(async () => {
      const users = await searchUsers(normalizedQuery);
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
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      runSearch(normalizedQuery);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className={className}>
      <div className="glass-surface relative flex h-10 items-center rounded-full px-2">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
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
          onClick={() => runSearch(query)}
          disabled={query.trim().length < 2 || isPending}
        >
          Search
        </Button>
      </div>

      {isOpen ? (
        <div className="glass-panel absolute left-0 right-0 top-12 z-50 rounded-[24px] p-2 shadow-2xl">
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
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/40 dark:hover:bg-white/10"
                >
                  <Avatar className="h-10 w-10 border border-white/30">
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
