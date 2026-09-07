"use client";

import { LuStore } from "react-icons/lu";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAllStores, useUpdateAnyStore } from "@/lib/mutations/adminActions";

export default function AdminStoresPage() {
  const { activeStores, hidden, isPending, isError, refetch } = useAllStores();
  const update = useUpdateAnyStore();

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
      <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
        Stores
      </h1>
      <p className="mt-2 max-w-[68ch] text-sm text-fg-muted">
        Every storefront. Hiding one removes it from the public list; existing
        orders are untouched.
      </p>

      <Card className="mt-6 p-5">
        {isError ? (
          <EmptyState
            icon={LuStore}
            title="Couldn't load stores."
            actionLabel="Try again"
            onAction={refetch}
          />
        ) : isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : activeStores.length === 0 && hidden.length === 0 ? (
          <EmptyState icon={LuStore} title="No stores yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-muted">
                  <th className="w-14 py-2 font-medium" />
                  <th className="py-2 font-medium">Store</th>
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 text-right font-medium">Visible</th>
                </tr>
              </thead>
              <tbody>
                {activeStores.map((store) => (
                  <tr
                    key={store.id}
                    className="border-b border-line/60 last:border-b-0"
                  >
                    <td className="py-3">
                      <Avatar src={store.image_url} name={store.name} size={36} />
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/stores/${store.id}`}
                        className="focus-ring rounded-sm text-fg underline decoration-line hover:decoration-fg-muted"
                      >
                        {store.name}
                      </Link>
                    </td>
                    <td className="max-w-[320px] truncate py-3 text-fg-muted">
                      {store.description ?? "—"}
                    </td>
                    <td className="py-3 text-right">
                      <label className="inline-flex items-center gap-2">
                        <span className="sr-only">
                          {store.name} visible to shoppers
                        </span>
                        <input
                          type="checkbox"
                          checked
                          disabled={update.isPending}
                          onChange={() =>
                            update.mutate({ id: store.id, is_active: false })
                          }
                          className="focus-ring size-4 accent-ember"
                        />
                      </label>
                    </td>
                  </tr>
                ))}

                {/* Recovered from revenue-per-store, because GET /stores only
                    returns active ones — see useAllStores. Without this row an
                    admin could hide a store and never get it back. */}
                {hidden.map((store) => (
                  <tr
                    key={store.id}
                    className="border-b border-line/60 last:border-b-0"
                  >
                    <td className="py-3">
                      <Avatar src={null} name={store.name} size={36} />
                    </td>
                    <td className="py-3 text-fg-muted line-through">
                      {store.name}
                    </td>
                    <td className="py-3 text-xs text-fg-muted">
                      Hidden — not in the public list
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ id: store.id, is_active: true })
                        }
                      >
                        Make visible
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
