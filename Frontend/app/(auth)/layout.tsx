import { AuthAside } from "@/components/auth/AuthAside";
import { Logotype } from "@/components/Logotype";

// Split screen: ink panel left, paper form right (PRD §6). The panel is
// decoration, so below lg it's dropped entirely rather than stacked — a
// phone-height hero above a login form just pushes the fields off-screen.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <AuthAside />
      <section
        data-skin="paper"
        className="flex min-h-screen flex-col justify-center bg-surface px-5 py-12 md:px-8"
      >
        <div className="mx-auto w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <Logotype />
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
