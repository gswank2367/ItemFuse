"use client";

import { useEffect, useState } from "react";

type Props = { inspectLink: string | null };

export default function InspectButton({ inspectLink }: Props) {
  const [mobile, setMobile] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  if (!inspectLink) {
    return <span className="inspect disabled">Inspect unavailable</span>;
  }

  async function handleClick() {
    if (!inspectLink) return;

    if (mobile) {
      try {
        await navigator.clipboard.writeText(inspectLink);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        if (navigator.share) {
          await navigator.share({ title: "CS2 inspect link", text: inspectLink });
        }
      }
      return;
    }

    window.location.href = inspectLink;
  }

  return (
    <div className="inspect-wrap">
      <button
        className="inspect inspect-button"
        type="button"
        onClick={handleClick}
        title={mobile ? "Copy this inspect link to use on a PC with Steam and CS2" : "Launch the exact item in Steam/CS2"}
      >
        {mobile ? (copied ? "Inspect link copied ✓" : "Copy inspect link") : "Inspect in CS2"}
      </button>
    </div>
  );
}
