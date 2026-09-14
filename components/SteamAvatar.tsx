"use client";

import { useMemo, useState } from "react";

type Props = {
  src: string | null | undefined;
  name?: string | null;
  alt?: string;
  size?: number;
  className?: string;
};

function avatarCandidates(src: string | null | undefined) {
  if (!src) return [];
  const values = [src];

  // Steam has served community avatars from several CDN hostnames over time.
  if (src.includes("avatars.akamai.steamstatic.com")) {
    values.push(src.replace("avatars.akamai.steamstatic.com", "avatars.fastly.steamstatic.com"));
  }
  if (src.includes("avatars.fastly.steamstatic.com")) {
    values.push(src.replace("avatars.fastly.steamstatic.com", "avatars.akamai.steamstatic.com"));
  }

  // If the full-size image has an issue, Steam's medium asset is more than enough
  // for the 40-64px circles TradeSync renders.
  for (const value of [...values]) {
    if (value.includes("_full.")) values.push(value.replace("_full.", "_medium."));
  }

  return [...new Set(values)];
}

export default function SteamAvatar({ src, name, alt = "", size = 58, className = "friend-avatar" }: Props) {
  const candidates = useMemo(() => avatarCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const current = candidates[candidateIndex] ?? null;
  const initial = (name?.trim()?.[0] || "S").toUpperCase();

  if (!current) {
    return (
      <div
        className={`${className} fallback steam-avatar-fallback`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {initial}
      </div>
    );
  }

  return (
    // Intentionally use a normal img rather than next/image. Steam avatar CDN URLs
    // are already tiny and this avoids Vercel's image optimizer becoming another
    // point of failure between TradeSync and Steam's profile-image CDN.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      width={size}
      height={size}
      className={`${className} steam-avatar-direct`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setCandidateIndex((index) => index + 1)}
    />
  );
}
