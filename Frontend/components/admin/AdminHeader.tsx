"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuArchive,
  LuChartNoAxesColumn,
  LuReceipt,
  LuStore,
} from "react-icons/lu";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { Logotype } from "@/components/Logotype";
import { useSession } from "@/components/RoleGuard";
import { SignOut } from "@/components/SignOut";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

// PRD §3 lists the admin's routes as /admin /stores /orders /archive, but
// /stores and /orders already belong to the shopper. One path can only render
// one component, so the admin's versions are nested under /admin — the
// alternative was branching on role inside the shopper's pages.
const NAV = [
  { href: "/admin", label: "Overview", Icon: LuChartNoAxesColumn },
  { href: "/admin/orders", label: "Orders", Icon: LuReceipt },
  { href: "/admin/stores", label: "Stores", Icon: LuStore },
  { href: "/archive", label: "Archive", Icon: LuArchive },
];

export function AdminHeader() {
  const pathname = usePathname();
  const session = useSession();
  const user = session.state === "authed" ? session.user : null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-5 md:px-8">
      <Logotype href="/admin" />
      <span className="rounded-full bg-ink-line px-2.5 py-1 text-xs font-medium text-fg">
        Admin
      </span>

      <nav className="ml-auto hidden items-center gap-1 lg:flex">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(
              "focus-ring inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150",
              pathname === href
                ? "bg-ink-line text-fg"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3 lg:ml-0">
        <ConnectionBadge />
        {user && (
          <Link href="/account" className="focus-ring rounded-full">
            <Avatar src={user.image_url} name={user.name} size={32} />
          </Link>
        )}
        <SignOut />
      </div>
    </header>
  );
}

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="grid shrink-0 grid-cols-4 border-t border-line lg:hidden">
      {NAV.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "focus-ring flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors duration-150",
            pathname === href ? "text-accent" : "text-fg-muted",
          )}
        >
          <Icon className="size-6" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
