"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useRegister } from "@/lib/mutations/authActions";
import { authErrorMessage, fieldErrorsOf } from "@/lib/formErrors";
import { ROLE_HOME } from "@/lib/roles";

// Mirrors the server's rules (API.md §2) so the obvious mistakes never cost a
// round trip. Two roles only — the API rejects ADMIN with a 400.
//
// The complexity rules below are stricter than the server's bare 8–72, which
// is a deliberate choice for NEW accounts only: signup is the one moment we
// can ask for a decent password without locking anyone out of an existing one.
// Login stays permissive for exactly that reason.
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(80, "At most 80 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .pipe(z.email("That doesn't look like an email address"))
    .refine((value) => !/\s/.test(value), "No spaces in an email address"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(72, "At most 72 characters")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/\d/, "Add a number"),
  role: z.enum(["USER", "STORE_OWNER"]),
});

const ROLES = [
  { value: "USER", label: "I want to order" },
  { value: "STORE_OWNER", label: "I run a store" },
] as const;

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const register_ = useRegister();

  // ?as=owner preselects, anything else falls back to shopping.
  const initialRole = params.get("as") === "owner" ? "STORE_OWNER" : "USER";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: initialRole },
  });

  const role = watch("role");
  const serverFields = fieldErrorsOf(register_.error);
  const banner = authErrorMessage(register_.error);

  const onSubmit = handleSubmit((values) =>
    register_.mutate(values, {
      onSuccess: ({ user }) => router.replace(ROLE_HOME[user.role]),
    }),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-[-0.035em] text-fg">
        Create an account
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Takes a moment. You can change your name later.
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

        {/* Segmented control, not a dropdown (PRD §6) — two options that a
            person picks once should both be visible. */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-fg">
            What brings you here?
          </legend>
          <div className="flex gap-1 rounded-full border border-line p-1">
            {ROLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={role === value}
                onClick={() => setValue("role", value)}
                className={cn(
                  "focus-ring flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150",
                  role === value
                    ? "bg-ink text-paper"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <Input
          label="Name"
          autoComplete="name"
          placeholder="Prasad"
          error={errors.name?.message ?? serverFields.name}
          {...register("name")}
        />
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
          autoComplete="new-password"
          hint="At least 8 characters, with a number and an uppercase letter."
          error={errors.password?.message ?? serverFields.password}
          {...register("password")}
        />

        <Button
          type="submit"
          variant="primary"
          disabled={register_.isPending}
          className="mt-2 w-full"
        >
          {register_.isPending
            ? "Creating account…"
            : role === "STORE_OWNER"
              ? "Open your storefront"
              : "Start ordering"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-fg-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="focus-ring rounded-sm text-accent underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  // useSearchParams needs a Suspense boundary to keep this page static.
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
