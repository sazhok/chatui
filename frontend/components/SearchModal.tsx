"use client";

import { useEffect, useRef, useState } from "react";
import { Conversation, SearchResult } from "@/lib/types";
import { useModalTransition } from "@/lib/useModalTransition";

export default function SearchModal({
  conversations,
  onSelect,
  onClose,
}: {
  conversations: Conversation[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { closing, requestClose } = useModalTransition(onClose);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const handle = setTimeout(() => {
      (async () => {
        if (!trimmed) {
          setResults(null);
          return;
        }
        const res = await fetch(`/api/conversations/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
          setHighlighted(0);
        }
      })();
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const items: (Conversation | SearchResult)[] = results ?? conversations;

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
            placeholder="Search chats..."
            className="w-full bg-transparent text-sm outline-none placeholder:opacity-50"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center opacity-50">
              {query.trim() ? "No matching chats" : "No chats yet"}
            </p>
          )}
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => choose(item.id)}
              onMouseEnter={() => setHighlighted(i)}
              className={`block w-full rounded-md px-3 py-2 text-left ${
                i === highlighted ? "bg-black/5 dark:bg-white/10" : ""
              }`}
            >
              <div className="truncate font-medium">
                <Highlight text={item.title || "New chat"} query={query} />
              </div>
              {"snippet" in item && item.snippet && (
                <div className="truncate text-xs opacity-60">
                  <Highlight text={item.snippet} query={query} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold">{text.slice(idx, idx + trimmed.length)}</span>
      {text.slice(idx + trimmed.length)}
    </>
  );
}
