import React, { useState } from "react";
import { cx } from "../lib/api";

const initialsOf = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

/**
 * Candidate portrait with an initials fallback — bulk-uploaded and
 * self-applied candidates have no avatar URL, and remote images can fail.
 */
export default function Avatar({ src, name, className, size = 32 }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={cx(
          "rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-brand/40 to-brand/10 border border-brand/30 text-white/80 font-medium",
          className
        )}
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.34) }}
        title={name}
        data-testid="avatar-fallback"
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className={cx("rounded-full object-cover shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}
