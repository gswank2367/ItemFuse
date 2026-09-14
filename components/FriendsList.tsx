"use client";

import Link from "next/link";
import SteamAvatar from "@/components/SteamAvatar";
import { useEffect, useMemo, useRef, useState } from "react";

export type FriendCard = {
  steamId: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  online: boolean;
  tradeSyncMember: boolean;
};

type InventoryStatus = {
  steamId: string;
  hasItems: boolean | null;
  itemCount: number | null;
  isPublic: boolean | null;
  rateLimited: boolean;
  cached: boolean;
  retryAfterSeconds: number | null;
};

type StatusResponse = {
  statuses?: InventoryStatus[];
  rateLimited?: boolean;
  retryAfterSeconds?: number | null;
};

const BATCH_SIZE = 3;
const BETWEEN_BATCHES_MS = 1400;
const DEFAULT_RATE_LIMIT_WAIT_MS = 30000;
const MAX_AUTOMATIC_RATE_LIMIT_RETRIES = 4;

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function mergeStatuses(current: Record<string, InventoryStatus>, incoming: InventoryStatus[]) {
  const next = { ...current };
  for (const status of incoming) {
    // Do not overwrite a known result with a temporary 429/unknown state.
    if (status.hasItems === null && next[status.steamId]?.hasItems !== null && next[status.steamId]?.hasItems !== undefined) continue;
    next[status.steamId] = status;
  }
  return next;
}

export default function FriendsList({ friends }: { friends: FriendCard[] }) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, InventoryStatus>>({});
  const [checking, setChecking] = useState(friends.length > 0);
  const [rateLimitWait, setRateLimitWait] = useState<number | null>(null);
  const [scanPaused, setScanPaused] = useState(false);
  const restartToken = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const token = ++restartToken.current;

    async function checkInventories() {
      setChecking(friends.length > 0);
      setScanPaused(false);
      setRateLimitWait(null);

      const pending = [...friends];
      let rateLimitRetries = 0;

      while (pending.length > 0 && !cancelled && restartToken.current === token) {
        const batch = pending.splice(0, BATCH_SIZE);

        try {
          const response = await fetch("/api/friends/cs2-status", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ steamIds: batch.map((friend) => friend.steamId) })
          });
          const data = await response.json() as StatusResponse;
          if (!response.ok) throw new Error("Could not check CS2 inventories.");

          const returned = data.statuses ?? [];
          if (cancelled || restartToken.current !== token) return;
          setStatuses((current) => mergeStatuses(current, returned));

          const retryIds = new Set(returned.filter((status) => status.hasItems === null && status.rateLimited).map((status) => status.steamId));
          const retryFriends = batch.filter((friend) => retryIds.has(friend.steamId));

          if (data.rateLimited || retryFriends.length > 0) {
            rateLimitRetries += 1;
            pending.unshift(...retryFriends);

            if (rateLimitRetries > MAX_AUTOMATIC_RATE_LIMIT_RETRIES) {
              setScanPaused(true);
              break;
            }

            const waitMs = Math.max(
              DEFAULT_RATE_LIMIT_WAIT_MS,
              Math.min(120000, (data.retryAfterSeconds ?? 0) * 1000)
            );
            setRateLimitWait(Math.ceil(waitMs / 1000));

            for (let remaining = waitMs; remaining > 0 && !cancelled && restartToken.current === token; remaining -= 1000) {
              setRateLimitWait(Math.ceil(remaining / 1000));
              await pause(Math.min(1000, remaining));
            }
            setRateLimitWait(null);
            continue;
          }

          rateLimitRetries = 0;
        } catch {
          // Network/server errors are temporary. Requeue the batch once, but don't spin forever.
          pending.push(...batch);
          rateLimitRetries += 1;
          if (rateLimitRetries > MAX_AUTOMATIC_RATE_LIMIT_RETRIES) {
            setScanPaused(true);
            break;
          }
          await pause(5000);
          continue;
        }

        if (pending.length > 0) await pause(BETWEEN_BATCHES_MS);
      }

      if (!cancelled && restartToken.current === token) {
        setChecking(false);
        setRateLimitWait(null);
      }
    }

    void checkInventories();
    return () => { cancelled = true; };
  }, [friends]);

  const eligible = useMemo(() => friends.filter((friend) => statuses[friend.steamId]?.hasItems === true), [friends, statuses]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? eligible.filter((friend) => friend.displayName.toLowerCase().includes(q)) : eligible;
  }, [eligible, query]);

  const verifiedCount = useMemo(
    () => friends.filter((friend) => statuses[friend.steamId]?.hasItems !== null && statuses[friend.steamId]?.hasItems !== undefined).length,
    [friends, statuses]
  );
  const unknownCount = friends.length - verifiedCount;

  function continueScan() {
    // Remounting this component isn't necessary; a lightweight reload lets the server-side cache
    // preserve completed checks while resuming only the remaining unknown friends.
    window.location.reload();
  }

  return (
    <>
      <div className="friends-search">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search friends with CS2 items…" />
        <span>{filtered.length} shown</span>
      </div>

      {checking ? (
        <div className="friends-filter-status">
          <span className="friends-filter-spinner" aria-hidden="true" />
          <div>
            <b>{rateLimitWait !== null ? "Steam asked ItemFuse to slow down…" : "Finding friends with CS2 items…"}</b>
            <small>
              {rateLimitWait !== null
                ? `Resuming automatically in about ${rateLimitWait}s. ${verifiedCount} of ${friends.length} already verified.`
                : `Verified ${verifiedCount} of ${friends.length}. Results appear as Steam inventories are checked.`}
            </small>
          </div>
        </div>
      ) : null}

      {scanPaused && unknownCount > 0 ? (
        <div className="friends-filter-status friends-filter-paused">
          <div>
            <b>Steam is still rate limiting inventory checks</b>
            <small>{verifiedCount} of {friends.length} friends are saved. You won't lose that progress.</small>
          </div>
          <button type="button" className="button secondary" onClick={continueScan}>Continue scan</button>
        </div>
      ) : null}

      {!checking && !scanPaused && eligible.length === 0 ? (
        <section className="empty-state compact-empty"><h3>No friends with public CS2 items found</h3><p>ItemFuse only shows friends whose public CS2 inventory currently contains at least one item.</p></section>
      ) : null}

      <section className="friends-grid">
        {filtered.map((friend) => {
          const status = statuses[friend.steamId];
          return (
            <article className="friend-card" key={friend.steamId}>
              <div className="friend-card-top">
                <SteamAvatar src={friend.avatarUrl} name={friend.displayName} size={58} />
                <div>
                  <h3>{friend.displayName}</h3>
                  <div className={`presence ${friend.online ? "online" : "offline"}`}>{friend.online ? "Online" : "Offline"}</div>
                  <span className="cs2-items-badge">{status?.itemCount ?? 1} CS2 {status?.itemCount === 1 ? "item" : "items"}</span>
                  {friend.tradeSyncMember ? <span className="member-badge">ItemFuse member</span> : null}
                </div>
              </div>
              <div className="friend-actions"><Link className="button match-button" href={`/friends/${friend.steamId}`}>View CS2 inventory</Link>{friend.tradeSyncMember ? <Link className="button match-button" href={`/offers/direct/${friend.steamId}`}>Send offer</Link> : null}<a href={friend.profileUrl ?? `https://steamcommunity.com/profiles/${friend.steamId}`} target="_blank" rel="noreferrer">Steam ↗</a></div>
            </article>
          );
        })}
      </section>

      {!checking && unknownCount > 0 && !scanPaused ? <p className="privacy-note">{unknownCount} {unknownCount === 1 ? "friend still needs" : "friends still need"} verification. ItemFuse will resume from the saved cache the next time you open this page.</p> : null}
    </>
  );
}
