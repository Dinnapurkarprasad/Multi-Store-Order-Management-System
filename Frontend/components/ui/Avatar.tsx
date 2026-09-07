"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { isRemoteUrl, isUsableSrc } from "@/lib/imageFile";

/**
 * A square image with an initial as the fallback.
 *
 * next/image handles remote http(s) URLs. data: and blob: sources skip it —
 * the optimizer can't fetch either, and there's nothing to optimise: a data
 * URL here is already under 2 KB, and a blob is a local preview.
 */
export function Avatar({
  src,
  name,
  size = 48,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  // A new src deserves a fresh attempt. Without this, one failed load — a
  // half-typed URL, say — would latch the fallback on for good.
  useEffect(() => setBroken(false), [src]);

  const shell = cn(
    "relative shrink-0 overflow-hidden rounded-full bg-ember-haze",
    className,
  );

  // isUsableSrc keeps a partial URL away from next/image, which throws on a
  // src that isn't absolute rather than just failing to load.
  if (!isUsableSrc(src) || broken) {
    return (
      <div
        className={cn(shell, "flex items-center justify-center")}
        style={{ width: size, height: size }}
      >
        <span
          className="font-display font-bold text-ember"
          style={{ fontSize: Math.round(size / 2.4) }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={shell} style={{ width: size, height: size }}>
      {isRemoteUrl(src) ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  );
}
