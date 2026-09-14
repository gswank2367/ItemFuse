"use client";

import { useEffect, useRef, useState } from "react";

type SearchItem = {
  marketHashName: string;
  imageUrl: string | null;
  priceCents: number | null;
};

function money(cents: number | null) {
  if (cents === null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function CatalogItemPicker({
  value,
  onChange,
  placeholder = "Search CS2 items…",
  allowBlank = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowBlank?: boolean;
}) {
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipSearchFor = useRef<string | null>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const query = value.trim();

    // Selecting a result updates `value`. Without this guard, that value change
    // immediately triggers another search and re-opens the results dropdown.
    if (skipSearchFor.current === query) {
      skipSearchFor.current = null;
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(query)}`, { credentials: "same-origin" });
        if (!response.ok) throw new Error("search failed");
        const data = await response.json() as { items?: SearchItem[] };
        if (id === requestId.current) {
          setResults(data.items ?? []);
          setOpen(Boolean(data.items?.length));
        }
      } catch {
        if (id === requestId.current) {
          setResults([]);
          setOpen(false);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value]);

  function choose(item: SearchItem) {
    const selected = item.marketHashName.trim();
    skipSearchFor.current = selected;
    requestId.current += 1;
    setResults([]);
    setLoading(false);
    setOpen(false);
    onChange(selected);
  }

  return (
    <div className="catalog-picker" ref={rootRef}>
      <input
        value={value}
        onChange={(event) => {
          skipSearchFor.current = null;
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => value.trim().length >= 2 && results.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        required={!allowBlank}
        autoComplete="off"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {loading ? <span className="catalog-loading">Searching…</span> : null}
      {open && results.length ? (
        <div className="catalog-results" role="listbox">
          {results.map((item) => (
            <button
              type="button"
              className="catalog-result"
              key={item.marketHashName}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(item)}
            >
              <span className="catalog-thumb">
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>No image</span>}
              </span>
              <span className="catalog-result-copy">
                <b>{item.marketHashName}</b>
                <small>{money(item.priceCents) ?? "Price unavailable"}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
