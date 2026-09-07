"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { isRemoteUrl, isUsableSrc } from "@/lib/imageFile";

/**
 * The 4:3 image at the top of a store card or an item card, with the name's
 * initial as the fallback.
 *
 * Remote http(s) URLs go through next/image; a data: URL from a device upload
 * doesn't (the optimizer can't fetch one, and it's already under 2 KB).
 */
export function CoverImage({
  src,
  name,
  sizes,
  className,
}: {
  src?: string | null;
  name: string;
  /** Match the grid the card sits in, so phones don't pull a desktop-width file. */
  sizes?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  // A new src gets a fresh attempt — otherwise one failure latches the
  // fallback on permanently.
  useEffect(() => setBroken(false), [src]);

  const shell = cn("relative aspect-[4/3] w-full overflow-hidden", className);

  if (!isUsableSrc(src) || broken) {
    return (
      <div className={cn(shell, "flex items-center justify-center bg-ember-haze")}>
        <span className="font-display text-3xl font-bold text-ember">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={shell}>
      {isRemoteUrl(src) ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          onError={() => setBroken(true)}
          className="object-cover"
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
