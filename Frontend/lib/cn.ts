// ponytail: plain join, no clsx + tailwind-merge. Conflicting classes are settled
// by CSS order, not by specificity-aware merging, so primitives put the caller's
// `className` last and keep their own class strings free of duplicate properties.
// Swap in tailwind-merge if overriding a primitive's colours ever actually fights.
export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");
