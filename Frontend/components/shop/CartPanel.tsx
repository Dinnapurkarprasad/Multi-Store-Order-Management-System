"use client";

import { useEffect, useState } from "react";
import { LuShoppingBag } from "react-icons/lu";
import { QtyStepper } from "./QtyStepper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DialogShell } from "@/components/ui/DialogShell";
import { money } from "@/lib/money";
import { cartCount, cartSubtotal, useCart } from "@/store/cart";

/** The lines and the total — rendered in the desktop aside and the mobile
 *  sheet, so there's one copy of it. */
function CartContents({ onPlace, placing }: { onPlace: () => void; placing: boolean }) {
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const subtotal = cartSubtotal(lines);

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <LuShoppingBag className="size-6 text-fg-muted" />
        <p className="text-sm text-fg-muted">
          Nothing here yet. Add something from the menu.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {lines.map(({ item, qty }) => (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{item.name}</p>
              <p className="font-mono text-xs text-fg-muted">
                {money(item.price * qty)}
              </p>
            </div>
            <QtyStepper
              qty={qty}
              label={item.name}
              onChange={(next) => setQty(item.id, next)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-sm font-medium text-fg">Total</span>
        {/* Display only — total_amount off the response is the truth. */}
        <span className="font-mono text-lg text-fg">{money(subtotal)}</span>
      </div>

      <Button
        variant="primary"
        onClick={onPlace}
        disabled={placing}
        className="mt-4 w-full"
      >
        {placing ? "Placing order…" : "Place order"}
      </Button>
    </>
  );
}

export function CartPanel({
  onPlace,
  placing,
}: {
  onPlace: () => void;
  placing: boolean;
}) {
  const lines = useCart((s) => s.lines);
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);

  const [sheetOpen, setSheetOpen] = useState(false);

  // Close the sheet once the order clears the cart.
  useEffect(() => {
    if (count === 0) setSheetOpen(false);
  }, [count]);

  return (
    <>
      {/* Desktop: sticky beside the menu. */}
      <aside className="hidden lg:block">
        <Card className="sticky top-24 p-5">
          <p className="font-display text-lg font-bold tracking-[-0.02em] text-fg">
            Your order
          </p>
          <div className="mt-4">
            <CartContents onPlace={onPlace} placing={placing} />
          </div>
        </Card>
      </aside>

      {/* Mobile: a bar that opens a sheet. Sits above the bottom tab bar. */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-line bg-card px-5 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-fg">
                {count} {count === 1 ? "item" : "items"}
              </p>
              <p className="font-mono text-xs text-fg-muted">{money(subtotal)}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setSheetOpen(true)}>
              View order
            </Button>
          </div>
        </div>
      )}

      <DialogShell
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        className="mt-auto mb-0 w-full max-w-none rounded-t-card p-5 lg:hidden"
      >
        <p className="font-display text-lg font-bold tracking-[-0.02em]">
          Your order
        </p>
        <div className="mt-4">
          <CartContents onPlace={onPlace} placing={placing} />
        </div>
        <Button
          variant="ghost"
          onClick={() => setSheetOpen(false)}
          className="mt-2 w-full"
        >
          Keep browsing
        </Button>
      </DialogShell>
    </>
  );
}
