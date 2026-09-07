import type { NextConfig } from "next";

/**
 * `next dev` and `next build` both write to `.next` by default, so building
 * while a dev server is running rips the manifests out from under it — the dev
 * server then 500s on every route with
 * `ENOENT: .next/static/development/_buildManifest.js.tmp`.
 *
 * Giving each phase its own directory means `npm run verify` can typecheck and
 * build at any time without touching a running `npm run dev`. `next build` and
 * `next start` share `.next-build` so a production run still finds its output.
 */
export default (phase: string): NextConfig => ({
  distDir: phase === "phase-development-server" ? ".next" : ".next-build",

  images: {
    // Store, item and avatar images are URLs typed in by users, so the host
    // isn't knowable ahead of time — the allow-list has to be open. next/image
    // still buys resizing, modern formats and lazy loading.
    //
    // It only proxies images, and only for pages the user is already on. If
    // this ever needs locking down, the honest fix is an upload endpoint so
    // every image lives on one known host.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
});
