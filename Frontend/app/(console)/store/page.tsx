"use client";

import { Onboarding } from "@/components/owner/Onboarding";
import { StoreForm } from "@/components/owner/StoreForm";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSelectedStore } from "@/lib/mutations/ownerActions";

/** One form on PATCH /stores/:id. Same component the account page uses. */
export default function StoreSettingsPage() {
  const { store, stores, isPending } = useSelectedStore();

  if (isPending) return <Skeleton className="m-5 h-64 rounded-card md:m-8" />;

  if (stores.length === 0 || !store) {
    return (
      <div className="h-full overflow-y-auto">
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[560px] px-5 py-8 md:px-8">
        <h1 className="font-display text-2xl font-bold tracking-[-0.035em] text-fg">
          Store
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          What shoppers see when they find {store.name}.
        </p>

        <Card className="mt-6 p-6">
          <StoreForm key={store.id} store={store} />
        </Card>
      </div>
    </div>
  );
}
