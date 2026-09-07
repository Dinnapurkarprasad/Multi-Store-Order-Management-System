"use client";

import { useState } from "react";
import Link from "next/link";
import { LuStore } from "react-icons/lu";
import { RoleGuard, useSession } from "@/components/RoleGuard";
import { ImagePicker } from "@/components/ImagePicker";
import { Logotype } from "@/components/Logotype";
import { SignOut } from "@/components/SignOut";
import { StoreForm } from "@/components/owner/StoreForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUpdateMe } from "@/lib/mutations/authActions";
import { cn } from "@/lib/cn";
import { useMyStores } from "@/lib/mutations/ownerActions";
import { ROLE_HOME } from "@/lib/roles";
import type { User } from "@/lib/types";

/** name + image_url are the only editable fields — email and role are
 *  deliberately not editable through the API. */
function ProfileForm({ user }: { user: User }) {
  const update = useUpdateMe();

  const [name, setName] = useState(user.name);
  const [imageUrl, setImageUrl] = useState<string | null>(user.image_url);

  const trimmed = name.trim();
  const nameError =
    trimmed.length > 0 && trimmed.length < 2
      ? "At least 2 characters"
      : trimmed.length > 80
        ? "At most 80 characters"
        : undefined;

  // Only changed fields — image_url: null removes the picture, omitting the key
  // leaves it untouched.
  const patch = {
    ...(trimmed !== user.name && { name: trimmed }),
    ...(imageUrl !== user.image_url && { image_url: imageUrl }),
  };
  const changed = Object.keys(patch).length > 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!changed || nameError || !trimmed) return;
        update.mutate(patch);
      }}
      className="flex flex-col gap-5"
    >
      <ImagePicker
        label="Profile picture"
        value={imageUrl}
        onChange={setImageUrl}
        name={user.name}
      />

      <Input
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={nameError}
      />

      <Input
        label="Email"
        value={user.email}
        disabled
        readOnly
        hint="Email and role can't be changed."
      />

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

function StoresTab() {
  const { data: stores, isPending, isError, refetch } = useMyStores();
  const [selected, setSelected] = useState(0);

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-card" />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={LuStore}
        title="Couldn't load your stores."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }

  if (!stores || stores.length === 0) {
    return (
      <EmptyState
        icon={LuStore}
        title="You haven't opened a storefront yet."
        description="Open one and you can edit its name, description and picture here."
      />
    );
  }

  const store = stores[Math.min(selected, stores.length - 1)];

  return (
    <div className="flex flex-col gap-6">
      {/* Owners can have several stores — pick which one to edit. */}
      {stores.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-full border border-line p-1">
          {stores.map((option, index) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                "focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150",
                index === selected
                  ? "bg-ink text-paper"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
      <StoreForm key={store.id} store={store} />
    </div>
  );
}

function Account() {
  const session = useSession();
  const [tab, setTab] = useState<"profile" | "store">("profile");

  if (session.state !== "authed") {
    return <Skeleton className="m-8 h-96 rounded-card" />;
  }

  const { user } = session;
  const isOwner = user.role === "STORE_OWNER";

  return (
    // Skin follows the role: a shopper is browsing, an owner is working.
    <div
      data-skin={user.role === "USER" ? "paper" : "ink"}
      className="min-h-screen bg-surface"
    >
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
          <Logotype href={ROLE_HOME[user.role]} />
          <SignOut />
        </div>
      </header>

      <div className="mx-auto max-w-[720px] px-5 py-10 md:px-8">
        <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
          Account
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {isOwner
            ? "Your details, and the storefront shoppers see."
            : "Your details. The picture is what shows in the nav."}
        </p>

        {/* Tabs, so only one form — and therefore one ember action — is on
            screen at a time (PRD §2). */}
        {isOwner && (
          <div className="mt-6 inline-flex gap-1 rounded-full border border-line p-1">
            {(
              [
                ["profile", "Profile"],
                ["store", "Store"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150",
                  tab === value
                    ? "bg-ink text-paper"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <Card className="mt-6 p-6">
          {isOwner && tab === "store" ? (
            <StoresTab />
          ) : (
            <ProfileForm user={user} />
          )}
        </Card>

        {user.role === "USER" && (
          <p className="mt-6 text-sm text-fg-muted">
            <Link
              href="/orders"
              className="focus-ring rounded-sm text-accent underline"
            >
              Back to your orders
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  // Every role has an account — a shopper, an owner and an admin all edit the
  // same two fields through PATCH /auth/me.
  return (
    <RoleGuard allow={["USER", "STORE_OWNER", "ADMIN"]}>
      <Account />
    </RoleGuard>
  );
}
