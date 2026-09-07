import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;

// NOTE: this used to set `distDir` per build phase, so a local production build
// wouldn't clobber a running dev server's `.next` manifests. Vercel expects the
// output at `.next` and failed the deploy with
// "The Next.js output directory .next was not found", so the default is back.
//
// The local hazard it worked around is real but small: don't run `npm run build`
// while `npm run dev` is running. Stop the dev server first, or the dev server
// starts 500ing on every route until you restart it.
