"use client";

import { useRouter } from "next/navigation";
import { LuLogOut } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { useLogout } from "@/lib/mutations/authActions";

export function SignOut() {
  const router = useRouter();
  const logout = useLogout();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={logout.isPending}
      onClick={() =>
        logout.mutate(undefined, { onSettled: () => router.replace("/login") })
      }
    >
      <LuLogOut className="size-4" />
      Sign out
    </Button>
  );
}
