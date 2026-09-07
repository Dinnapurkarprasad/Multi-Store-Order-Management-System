"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LuShoppingBag } from "react-icons/lu";
import { CartPanel } from "@/components/shop/CartPanel";
import { QtyStepper } from "@/components/shop/QtyStepper";
import { useSession } from "@/components/RoleGuard";
import { Card } from "@/components/ui/Card";
import { CoverImage } from "@/components/ui/CoverImage";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api/client";
import { money } from "@/lib/money";
import { usePlaceOrder, useStore } from "@/lib/mutations/shopperActions";
import { notify } from "@/lib/toast";
import type { Item, StoreWithItems } from "@/lib/types";
import { useCart } from "@/store/cart";

function Menu({ store }: { store: StoreWithItems }) {
  const session = useSession();
  const router = useRouter();

  const { storeId, lines, add, setQty, startNew, clear, reconcile } = useCart();
  const placeOrder = usePlaceOrder();
  const { refetch } = useStore(store.id);

  // Set when adding from a different store — the switch needs confirming
  // because it throws away the current cart.
  const [pendingItem, setPendingItem] = useState<Item | null>(null);

  // Admins can browse but not order — POST /orders is USER-only.
  const canOrder = session.state === "authed" && session.user.role === "USER";
  const qtyOf = (itemId: string) =>
    lines.find((line) => line.item.id === itemId)?.qty ?? 0;

  function onAdd(item: Item) {
    // One store per cart. A different store means confirm first.
    if (storeId && storeId !== store.id) {
      setPendingItem(item);
      return;
    }
    add(store, item);
  }

  function onPlace() {
    const { idempotencyKey } = useCart.getState();
    if (!idempotencyKey || lines.length === 0) return;

    placeOrder.mutate(
      {
        storeId: store.id,
        items: lines.map(({ item, qty }) => ({ item_id: item.id, qty })),
        idempotencyKey,
      },
      {
        onSuccess: () => {
          clear();
          router.push("/orders");
        },
        onError: async (error) => {
          // The 400 is combined — it doesn't say WHICH item is gone. So refetch
          // the store, drop whatever no longer comes back, and say so.
          if (error instanceof ApiError && error.status === 400) {
            const fresh = await refetch();
            const available = fresh.data?.items.map((item) => item.id) ?? [];
            const dropped = reconcile(available);

            notify.message(
              "Some items are no longer available. Your order was updated.",
              dropped === 1 ? "1 item removed" : `${dropped} items removed`,
            );
            return;
          }
          notify.error(error);
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
          {store.name}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {store.items.length} {store.items.length === 1 ? "item" : "items"}
          {store.description && ` · ${store.description}`}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {store.items.length === 0 ? (
          <EmptyState
            icon={LuShoppingBag}
            title="Nothing on the menu yet."
            description="This store hasn't added any items you can order."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {store.items.map((item) => (
              <Card key={item.id} className="flex flex-col overflow-hidden">
                <CoverImage
                  src={item.image_url}
                  name={item.name}
                  sizes="(min-width: 1280px) 25vw, (min-width: 640px) 40vw, 100vw"
                />
                <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div>
                    <p className="text-base font-medium text-fg">{item.name}</p>
                    <p className="mt-0.5 font-mono text-sm text-fg-muted">
                      {money(item.price)}
                    </p>
                  </div>
                  {canOrder && (
                    <QtyStepper
                      qty={qtyOf(item.id)}
                      label={item.name}
                      onChange={(next) =>
                        qtyOf(item.id) === 0 ? onAdd(item) : setQty(item.id, next)
                      }
                      className="self-start"
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {canOrder && (
          <CartPanel onPlace={onPlace} placing={placeOrder.isPending} />
        )}
      </div>

      <Dialog
        open={pendingItem !== null}
        onClose={() => setPendingItem(null)}
        title={`Start a new order from ${store.name}?`}
        description="Your current order will be cleared."
        confirmLabel="Start new order"
        onConfirm={() => {
          if (pendingItem) startNew(store, pendingItem);
          setPendingItem(null);
        }}
      />
    </div>
  );
}

export default function StorePage() {
  const { id } = useParams<{ id: string }>();
  const { data: store, isPending, isError, error, refetch } = useStore(id);

  if (isPending) {
    return (
      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <Skeleton className="h-11 w-72" />
        <Skeleton className="mt-3 h-4 w-48" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !store) {
    // A 404 here is genuinely "no such store" — this endpoint is public, so
    // there's no hidden-ownership case to soften the wording for.
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <EmptyState
        icon={LuShoppingBag}
        title={missing ? "That store doesn't exist." : "Couldn't load the store."}
        description={
          missing
            ? "It may have been closed or the link is wrong."
            : "The server didn't answer. It may still be waking up."
        }
        actionLabel={missing ? undefined : "Try again"}
        onAction={missing ? undefined : () => refetch()}
      />
    );
  }

  return <Menu store={store} />;
}
