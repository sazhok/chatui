"use client";

import { useEffect, useRef, useState } from "react";
import { ChecklistSession } from "@/lib/types";
import { useModalTransition } from "@/lib/useModalTransition";

/**
 * Sessions carry no message history, so unlike the chat search this filters the
 * already-loaded list in memory instead of hitting the backend.
 */
export default function SessionSearchModal({
  sessions,
  onSelect,
  onClose,
}: {
  sessions: ChecklistSession[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { closing, requestClose } = useModalTransition(onClose);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim().toLowerCase();
  const items = trimmed
    ? sessions.filter((s) =>
        [s.title, s.subdomain, ...s.locations, ...s.checklists]
          .join(" ")
          .toLowerCase()
          .includes(trimmed),
      )
    : sessions;

  const choose = (id: number) => {
    onSelect(id);
    requestClose();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((i) => Math.min(i + 1, items.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = items[highlighted];
        if (item) choose(item.id);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, highlighted]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24 ${
        closing ? "animate-[modal-backdrop-out_150ms_ease-in]" : "animate-[modal-backdrop-in_150ms_ease-out]"
      }`}
      onClick={requestClose}
    >
      <div
        className={`flex max-h-[28rem] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-sidebar text-sm shadow-lg ${
          closing ? "animate-[modal-panel-out_150ms_ease-in]" : "animate-[modal-panel-in_150ms_ease-out]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            placeholder="Search sessions..."
            className="w-full bg-transparent text-sm outline-none placeholder:opacity-50"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center opacity-50">
              {trimmed ? "No matching sessions" : "No sessions yet"}
            </p>
          )}
          {items.map((s, i) => (
            <button
              key={s.id}
              onClick={() => choose(s.id)}
              onMouseEnter={() => setHighlighted(i)}
              className={`block w-full rounded-md px-3 py-2 text-left ${
                i === highlighted ? "bg-black/5 dark:bg-white/10" : ""
              }`}
            >
              <div className="truncate font-medium">{s.title}</div>
              <div className="truncate text-xs opacity-60">
                {s.subdomain} · {s.locations.join(", ")} · {s.checklists.join(", ")}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
