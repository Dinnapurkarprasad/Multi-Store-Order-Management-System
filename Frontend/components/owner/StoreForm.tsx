"use client";

import { useState } from "react";
import { ImagePicker } from "@/components/ImagePicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUpdateStore } from "@/lib/mutations/ownerActions";
import type { Store } from "@/lib/types";

/**
 * Edit one store. Reused by /account's Store tab and, in goal 4, the /store
 * route.
 *
 * The patch only carries fields that actually changed. That matters for
 * `image_url` and `description`, where null means REMOVE and an omitted key
 * means leave alone (API.md gotcha 2) — sending the whole form every time
 * would silently clear anything the user hadn't touched.
 */
export function StoreForm({ store }: { store: Store }) {
  const update = useUpdateStore(store.id);

  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(store.image_url);
  const [isActive, setIsActive] = useState(store.is_active);

  const trimmedName = name.trim();
  const nameError =
    trimmedName.length > 0 && trimmedName.length < 2
      ? "At least 2 characters"
      : trimmedName.length > 120
        ? "At most 120 characters"
        : undefined;

  const patch = {
    ...(trimmedName !== store.name && { name: trimmedName }),
    ...(description.trim() !== (store.description ?? "") && {
      // Emptied on purpose → null clears it server-side.
      description: description.trim() || null,
    }),
    ...(imageUrl !== store.image_url && { image_url: imageUrl }),
    ...(isActive !== store.is_active && { is_active: isActive }),
  };

  const changed = Object.keys(patch).length > 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        // The API requires at least one field.
        if (!changed || nameError || !trimmedName) return;
        update.mutate(patch);
      }}
      className="flex flex-col gap-5"
    >
      <Input
        label="Store name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={nameError}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`desc-${store.id}`} className="text-sm font-medium text-fg">
          Description
        </label>
        <textarea
          id={`desc-${store.id}`}
          value={description}
          maxLength={500}
          rows={3}
          onChange={(event) => setDescription(event.target.value)}
          className="focus-ring rounded-input border border-line bg-card px-3.5 py-2.5 text-base text-fg placeholder:text-fg-muted"
          placeholder="What do you sell?"
        />
        <p className="text-sm text-fg-muted">{description.length} / 500</p>
      </div>

      <ImagePicker
        label="Store image"
        value={imageUrl}
        onChange={setImageUrl}
        name={store.name}
      />

      {/* Plain language, not "is_active" (PRD §6). */}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="focus-ring mt-0.5 size-4 accent-ember"
        />
        <span>
          <span className="block text-sm font-medium text-fg">
            Visible to shoppers
          </span>
          <span className="block text-sm text-fg-muted">
            Turn this off and the store disappears from the public list. Existing
            orders are unaffected.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={!changed || update.isPending || Boolean(nameError)}
        >
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
        {!changed && (
          <span className="text-sm text-fg-muted">No changes yet.</span>
        )}
      </div>
    </form>
  );
}
