"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { ShopHeader } from "@/components/shop/ShopHeader";

/**
 * Paper skin — you're browsing here, not operating (PRD §2).
 *
 * USER only. An admin has their own ink-skinned screens under /admin, so
 * sending them here would mean a shopper's nav and no cart (POST /orders is
 * USER-only anyway). The store DETAIL page still allows admins, since
 * /admin/stores links to it to preview a storefront.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allow={["USER", "ADMIN"]}>
      <div data-skin="paper" className="min-h-screen bg-surface">
        <ShopHeader />
        {/* Room for the bottom tab bar on mobile. */}
        <main className="pb-24 lg:pb-0">{children}</main>
      </div>
    </RoleGuard>
  );
}
