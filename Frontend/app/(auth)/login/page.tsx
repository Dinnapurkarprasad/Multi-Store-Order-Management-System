"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/lib/mutations/authActions";
import { authErrorMessage, fieldErrorsOf } from "@/lib/formErrors";
import { ROLE_HOME } from "@/lib/roles";

// Deliberately looser than the register rules. The server decides whether
// these credentials are right, and refusing to even submit an 7-character
// password would lock out anyone whose account predates a rule change —
// telling someone their existing password is "too short" is nonsense.
const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .pipe(z.email("That doesn't look like an email address")),
  password: z.string().min(1, "Enter your password"),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const serverFields = fieldErrorsOf(login.error);
  const banner = authErrorMessage(login.error);

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: ({ user }) => router.replace(ROLE_HOME[user.role]),
    }),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-[-0.035em] text-fg">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Sign in to follow your orders.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        {banner && (
          <p
            role="alert"
            className="rounded-input border border-ember bg-ember-haze px-3.5 py-3 text-sm text-fg"
          >
            {banner}
          </p>
        )}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message ?? serverFields.email}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message ?? serverFields.password}
          {...register("password")}
        />

        <Button
          type="submit"
          variant="primary"
          disabled={login.isPending}
          className="mt-2 w-full"
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-fg-muted">
        New here?{" "}
        <Link
          href="/signup"
          className="focus-ring rounded-sm text-accent underline"
        >
          Create an account
        </Link>
      </p>

      {/* There is no admin signup — the API rejects role: "ADMIN" (§3). */}
      <p className="mt-8 text-xs text-fg-muted">
        Admin? Use the credentials in the README.
      </p>
    </div>
  );
}
