"use client";

import { useState } from "react";
import { ImagePicker } from "@/components/ImagePicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { fieldErrorsOf } from "@/lib/formErrors";
import { useCreateStore } from "@/lib/mutations/ownerActions";


/**
 * What a fresh owner signup lands on: GET /stores/mine came back empty, so the
 * whole console becomes this until there's a storefront to run.
 *
 * Built first, on purpose — it's the very first screen a new owner sees, and
 * every other console screen needs a store to point at.
 */
export function Onboarding() {
  const create = useCreateStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const trimmed = name.trim();
  const serverFields = fieldErrorsOf(create.error);
  const nameError =
    trimmed.length > 0 && trimmed.length < 2
      ? "At least 2 characters"
      : serverFields.name;

  return (
    <div className="mx-auto flex min-h-full max-w-[560px] flex-col justify-center px-5 py-12 md:px-8">
      <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
        Open your storefront
      </h1>
      <p className="mt-3 max-w-[52ch] text-base text-fg-muted">
        Give it a name and shoppers can find it. You can add your menu, change
        the picture, and hide the store again at any point.
      </p>

      <Card className="mt-8 p-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmed || nameError) return;
            create.mutate({
              name: trimmed,
              // Omit rather than send empty strings — description and
              // image_url are optional and "" is not a valid URL.
              ...(description.trim() && { description: description.trim() }),
              ...(imageUrl && { image_url: imageUrl }),
            });
          }}
          className="flex flex-col gap-5"
        >
          <Input
            label="Store name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bombay Bistro"
            error={nameError}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-store-desc" className="text-sm font-medium text-fg">
              Description
            </label>
            <textarea
              id="new-store-desc"
              value={description}
              maxLength={500}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="North Indian classics"
              className="focus-ring rounded-input border border-line bg-card px-3.5 py-2.5 text-base text-fg placeholder:text-fg-muted"
            />
          </div>

          <ImagePicker
            label="Store image"
            value={imageUrl}
            onChange={setImageUrl}
            name={trimmed || "Store"}
          />

          <Button
            type="submit"
            variant="primary"
            disabled={!trimmed || create.isPending || Boolean(nameError)}
            className="mt-1 self-start"
          >
            {create.isPending ? "Opening…" : "Open your storefront"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
