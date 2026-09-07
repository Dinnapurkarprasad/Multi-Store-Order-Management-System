"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuReceipt, LuShoppingBag, LuStore } from "react-icons/lu";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { Logotype } from "@/components/Logotype";
import { useSession } from "@/components/RoleGuard";
import { SignOut } from "@/components/SignOut";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { useSelectedStore } from "@/lib/mutations/ownerActions";

// Analytics is deliberately absent — it's an admin-only screen in this build,
// even though the API would serve a STORE_OWNER scoped to their own stores.
const NAV = [
  { href: "/dashboard", label: "Orders", Icon: LuReceipt },
  { href: "/menu", label: "Menu", Icon: LuShoppingBag },
  { href: "/store", label: "Store", Icon: LuStore },
];

export function ConsoleHeader() {
  const pathname = usePathname();
  const session = useSession();
  const { stores, store, setStoreId } = useSelectedStore();

  const user = session.state === "authed" ? session.user : null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-5 md:px-8">
      <Logotype href="/dashboard" />

      {/* Owners can have several stores; this sets store_id on the orders
          query. Hidden when there's only one — a switcher with one option is
          furniture. */}
      {stores.length > 1 && store && (
        <label className="ml-2 flex items-center gap-2">
          <span className="sr-only">Store</span>
          <select
            value={store.id}
            onChange={(event) => setStoreId(event.target.value)}
            className="focus-ring rounded-full border border-line bg-card px-3 py-1.5 text-sm text-fg"
          >
            {stores.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      )}

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

/** Bottom tab bar under lg (PRD §7). */
export function ConsoleTabs() {
  const pathname = usePathname();

  return (
    <nav className="grid shrink-0 grid-cols-3 border-t border-line lg:hidden">
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
