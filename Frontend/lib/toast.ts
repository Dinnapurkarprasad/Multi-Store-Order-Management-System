"use client";

import { toast } from "sonner";
import { errorMessage } from "./formErrors";

/**
 * Every action reports through here, so wording and placement stay consistent
 * and no mutation fails silently.
 *
 * Not for errors a form already shows inline — the auth screens keep their
 * banner and field messages. A toast on top of those says the same thing twice.
 */
export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),

  /** Takes the raw error — the copy comes from errorMessage(), which knows the
   *  API's codes. */
  error: (error: unknown, description?: string) =>
    toast.error(errorMessage(error), { description }),

  message: (message: string, description?: string) =>
    toast(message, { description }),

  /** For an action worth watching, like the archive run. */
  promise: <T>(
    work: Promise<T>,
    copy: { loading: string; success: string | ((value: T) => string) },
  ) =>
    toast.promise(work, {
      loading: copy.loading,
      success: copy.success,
      error: (error: unknown) => errorMessage(error),
    }),
};
