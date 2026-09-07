import Link from "next/link";
import { Logotype } from "@/components/Logotype";

const LINKS = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Start ordering" },
  { href: "/signup?as=owner", label: "Open a store" },
];

export function LandingFooter() {
  return (
    // Ink, so the page ends on the operator's surface.
    <footer data-skin="ink" className="bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <Logotype href="/" />
          <p className="mt-2 text-sm text-fg-muted">
            Order from any shop. Watch it move.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="focus-ring rounded-sm text-fg-muted transition-colors duration-150 hover:text-fg"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
