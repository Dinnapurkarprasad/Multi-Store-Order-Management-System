"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuReceipt, LuStore, LuUser } from "react-icons/lu";
import { Logotype } from "@/components/Logotype";
import { useSession } from "@/components/RoleGuard";
import { SignOut } from "@/components/SignOut";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

// Sidebar becomes a bottom tab bar under lg (PRD §7). For the shop that means
// the same three links move from the header into a fixed bar.
const NAV = [
  { href: "/stores", label: "Stores", Icon: LuStore },
  { href: "/orders", label: "Orders", Icon: LuReceipt },
  { href: "/account", label: "Account", Icon: LuUser },
];

export function ShopHeader() {
  const pathname = usePathname();
  const session = useSession();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // The avatar is the whole reason /account has an image field — it's the one
  // place a user's picture surfaces.
  const user = session.state === "authed" ? session.user : null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-none">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
          <Logotype href="/stores" />

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150",
                  isActive(href) ? "bg-ink text-paper" : "text-fg-muted hover:text-fg",
                )}
              >
                {href === "/account" && user ? (
                  <Avatar src={user.image_url} name={user.name} size={20} />
                ) : (
                  <Icon className="size-4" />
                )}
                {label}
              </Link>
            ))}
            <span className="ml-2">
              <SignOut />
            </span>
          </nav>

          <span className="lg:hidden">
            <SignOut />
          </span>
        </div>
      </header>

      {/* Bottom tab bar under lg. pb-safe-ish padding is left to the page —
          the cart bar on the store page sits above this. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-surface lg:hidden">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "focus-ring flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors duration-150",
              isActive(href) ? "text-accent" : "text-fg-muted",
            )}
          >
            {href === "/account" && user ? (
              <Avatar src={user.image_url} name={user.name} size={24} />
            ) : (
              <Icon className="size-6" />
            )}
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
