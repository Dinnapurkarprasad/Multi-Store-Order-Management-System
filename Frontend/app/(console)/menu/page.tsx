"use client";

import { useState } from "react";
import { LuPlus, LuShoppingBag } from "react-icons/lu";
import { ItemForm } from "@/components/owner/ItemForm";
import { Onboarding } from "@/components/owner/Onboarding";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { money } from "@/lib/money";
import {
  useHideItem,
  useMenu,
  useSelectedStore,
  useUpdateItem,
} from "@/lib/mutations/ownerActions";
import type { Item } from "@/lib/types";

function Menu({ storeId }: { storeId: string }) {
  const { data: items, isPending, isError, refetch } = useMenu(storeId);
  const update = useUpdateItem(storeId);
  const hide = useHideItem(storeId);

  const [editing, setEditing] = useState<Item | null>(null);
  const [adding, setAdding] = useState(false);
  const [hiding, setHiding] = useState<Item | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-5 md:p-8">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={LuShoppingBag}
        title="Couldn't load your menu."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 px-5 pt-6 md:px-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.035em] text-fg">
            Menu
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {items?.length ?? 0} items · hidden ones stay listed so you can bring
            them back
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
          <LuPlus className="size-4" />
          Add item
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        {!items || items.length === 0 ? (
          <EmptyState
            icon={LuShoppingBag}
            title="Your menu is empty."
            description="Add your first item so people can order."
          />
        ) : (
          // A table, not cards — this is data and owners scan it (PRD §6).
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-muted">
                  <th className="w-14 py-2 font-medium" />
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Price</th>
                  <th className="py-2 font-medium">Available</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-line/60 last:border-b-0"
                  >
                    <td className="py-3">
                      <Avatar src={item.image_url} name={item.name} size={36} />
                    </td>
                    <td className="py-3">
                      <span
                        className={
                          item.is_available ? "text-fg" : "text-fg-muted line-through"
                        }
                      >
                        {item.name}
                      </span>
                    </td>
                    {/* Mono so the digits line up down the column. */}
                    <td className="py-3 font-mono text-fg">{money(item.price)}</td>
                    <td className="py-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.is_available}
                          disabled={update.isPending}
                          onChange={(event) =>
                            update.mutate({
                              id: item.id,
                              is_available: event.target.checked,
                            })
                          }
                          className="focus-ring size-4 accent-ember"
                        />
                        <span className="sr-only">
                          {item.name} available to order
                        </span>
                      </label>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(item)}
                        >
                          Edit
                        </Button>
                        {item.is_available && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHiding(item)}
                          >
                            Hide
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <ItemForm
          storeId={storeId}
          open
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <ItemForm
          key={editing.id}
          storeId={storeId}
          item={editing}
          open
          onClose={() => setEditing(null)}
        />
      )}

      <Dialog
        open={hiding !== null}
        onClose={() => setHiding(null)}
        title={`Hide ${hiding?.name ?? "this item"}?`}
        description="Shoppers won't be able to order it. It stays on this list and past orders keep it, so you can bring it back whenever."
        confirmLabel="Hide item"
        pending={hide.isPending}
        onConfirm={() => {
          if (hiding) hide.mutate(hiding.id, { onSuccess: () => setHiding(null) });
        }}
      />
    </div>
  );
}

export default function MenuPage() {
  const { store, stores, isPending } = useSelectedStore();

  if (isPending) return <Skeleton className="m-5 h-64 rounded-card md:m-8" />;
  if (stores.length === 0 || !store) {
    return (
      <div className="h-full overflow-y-auto">
        <Onboarding />
      </div>
    );
  }

  return <Menu key={store.id} storeId={store.id} />;
}
