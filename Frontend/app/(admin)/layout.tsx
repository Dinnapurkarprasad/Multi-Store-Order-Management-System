"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { AdminHeader, AdminTabs } from "@/components/admin/AdminHeader";

/**
 * Ink skin, wider tables (PRD §6). Same fixed-height shell as the owner
 * console — header, one scrolling pane, tab bar on mobile.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allow={["ADMIN"]}>
      <div data-skin="ink" className="flex h-screen flex-col bg-surface">
        <AdminHeader />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <AdminTabs />
      </div>
    </RoleGuard>
  );
}
