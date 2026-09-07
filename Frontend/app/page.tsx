import { Hero } from "@/components/landing_page/Hero";
import { LandingFooter } from "@/components/landing_page/LandingFooter";
import { OrderChips } from "@/components/landing_page/OrderChips";
import { PillNav } from "@/components/landing_page/PillNav";
import { RolePaths } from "@/components/landing_page/RolePaths";
import { Sequence } from "@/components/landing_page/Sequence";

// Section order is PRD §6: pill nav → hero → live order chips → the split →
// how an order moves → footer.
//
// This page itself is a server component now — only the sections that animate
// or read the session carry "use client". Sequence and LandingFooter are
// static, so they ship no JS of their own.
export default function LandingPage() {
  return (
    <div data-skin="paper" className="min-h-screen bg-surface">
      <PillNav />
      <Hero />
      <OrderChips />
      <RolePaths />
      <Sequence />
      <LandingFooter />
    </div>
  );
}
