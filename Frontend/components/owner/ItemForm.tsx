"use client";

import { useState } from "react";
import { ImagePicker } from "@/components/ImagePicker";
import { Button } from "@/components/ui/Button";
import { DialogShell } from "@/components/ui/DialogShell";
import { Input } from "@/components/ui/Input";
import { fieldErrorsOf } from "@/lib/formErrors";
import { useCreateItem, useUpdateItem } from "@/lib/mutations/ownerActions";
import type { Item } from "@/lib/types";

/**
 * Add or edit one menu item.
 *
 * Two rules from the contract shape this:
 *  - `price` must be a JSON number. A form gives you a string, so it goes
 *    through Number() before submit or the API returns 400.
 *  - On edit, only changed fields are sent. `image_url: null` REMOVES the
 *    picture while omitting the key leaves it alone — sending the whole form
 *    would wipe an image the owner never touched.
 */
export function ItemForm({
  storeId,
  item,
  open,
  onClose,
}: {
  storeId: string;
  /** Absent for a new item. */
  item?: Item;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateItem(storeId);
  const update = useUpdateItem(storeId);
  const pending = create.isPending || update.isPending;
  const serverFields = fieldErrorsOf(create.error ?? update.error);

  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);

  const trimmed = name.trim();
  const priceNumber = Number(price);
  const priceError =
    price !== "" && (!Number.isFinite(priceNumber) || priceNumber < 0)
      ? "Enter a price like 349 or 349.50"
      : priceNumber > 9_999_999
        ? "That's above the maximum"
        : serverFields.price;

  const nameError =
    trimmed.length > 120 ? "At most 120 characters" : serverFields.name;

  const valid = trimmed.length > 0 && price !== "" && !priceError && !nameError;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;

    if (!item) {
      create.mutate(
        {
          name: trimmed,
          price: priceNumber,
          ...(imageUrl && { image_url: imageUrl }),
        },
        { onSuccess: onClose },
      );
      return;
    }

    const patch = {
      ...(trimmed !== item.name && { name: trimmed }),
      ...(priceNumber !== item.price && { price: priceNumber }),
      ...(imageUrl !== item.image_url && { image_url: imageUrl }),
    };

    // The API requires at least one field; nothing changed means nothing to do.
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    update.mutate({ id: item.id, ...patch }, { onSuccess: onClose });
  }

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      className="m-auto w-[calc(100vw-2.5rem)] max-w-[440px] rounded-card p-6"
    >
      <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
        {item ? `Edit ${item.name}` : "Add an item"}
      </h2>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Butter Chicken"
          error={nameError}
          autoFocus
        />

        <Input
          label="Price"
          // inputMode gets a numeric keypad without type="number"'s scroll-wheel
          // and spinner behaviour.
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="349"
          error={priceError}
          hint="In rupees. Decimals are fine."
        />

        <ImagePicker
          label="Item picture"
          value={imageUrl}
          onChange={setImageUrl}
          name={trimmed || "Item"}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!valid || pending}>
            {pending ? "Saving…" : item ? "Save changes" : "Add item"}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
