"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CoverImage } from "@/components/ui/CoverImage";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Store } from "@/lib/types";

export function StoreCard({ store }: { store: Store }) {
  return (
    <Card className="overflow-hidden transition-shadow duration-150 hover:shadow-lg">
      {/* The whole card links (PRD §6) — one target, not a name plus a button. */}
      <Link href={`/stores/${store.id}`} className="focus-ring block rounded-card">
        <CoverImage
          src={store.image_url}
          name={store.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <div className="p-5">
          <p className="font-display text-lg font-bold tracking-[-0.02em] text-fg">
            {store.name}
          </p>
          {store.description && (
            <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
              {store.description}
            </p>
          )}
        </div>
      </Link>
    </Card>
  );
}

/** Six of these while loading, in the real card's shape so nothing reflows. */
export function StoreCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </Card>
  );
}
