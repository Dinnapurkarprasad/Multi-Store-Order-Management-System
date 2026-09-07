"use client";

import { useEffect, useRef, useState } from "react";
import { LuSearch, LuStore } from "react-icons/lu";
import { StoreCard, StoreCardSkeleton } from "@/components/shop/StoreCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { useStores } from "@/lib/mutations/shopperActions";
import { useDebounced } from "@/lib/useDebounced";

export default function StoresPage() {
  const [term, setTerm] = useState("");
  const q = useDebounced(term.trim());

  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStores(q);

  const stores = data?.pages.flatMap((page) => page.data) ?? [];

  // Infinite scroll off a sentinel. IntersectionObserver is native — no
  // scroll-position maths, and it stops firing when the sentinel unmounts.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" }, // start loading before it's visible
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
      <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
        Stores
      </h1>

      {/* Pinned search (PRD §6). */}
      <div className="sticky top-16 z-20 -mx-5 mt-6 bg-surface px-5 py-4 md:-mx-8 md:px-8">
        <div className="relative max-w-[420px]">
          <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-fg-muted" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search stores"
            aria-label="Search stores"
            className="pl-10"
          />
        </div>
      </div>

      {isError ? (
        <EmptyState
          icon={LuStore}
          title="Couldn't load stores."
          description="The server didn't answer. It may still be waking up."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isPending ? (
        <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <EmptyState
          icon={LuStore}
          title={q ? `No stores match "${q}"` : "No stores yet."}
          description={q ? undefined : "Check back once a shop opens up."}
          actionLabel={q ? "Clear search" : undefined}
          onAction={q ? () => setTerm("") : undefined}
        />
      ) : (
        <>
          <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>

          <div ref={sentinel} className="h-px" />

          {isFetchingNextPage && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <StoreCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Keyboard and reduced-motion users shouldn't have to scroll to
              trigger a load. */}
          {hasNextPage && !isFetchingNextPage && (
            <div className="mt-8 flex justify-center">
              <Button variant="secondary" onClick={() => fetchNextPage()}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
