"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { ConsoleHeader, ConsoleTabs } from "@/components/owner/ConsoleHeader";

/**
 * Ink skin, fixed height, no page scroll (PRD §7). The body is exactly the
 * viewport minus the header, and only inner panes scroll — that's what lets
 * the rail hold three independently scrolling columns.
 */
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allow={["STORE_OWNER"]}>
      <div data-skin="ink" className="flex h-screen flex-col bg-surface">
        <ConsoleHeader />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        <ConsoleTabs />
      </div>
    </RoleGuard>
  );
}
