"use client";

import { useState } from "react";
import { Conversation } from "@/lib/types";

function formatDate(value: string) {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AllChatsView({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [filter, setFilter] = useState("");
  const trimmed = filter.trim().toLowerCase();
  const shown = trimmed
    ? conversations.filter((c) => (c.title || "New chat").toLowerCase().includes(trimmed))
    : conversations;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Усі чати</h1>
        <span className="text-xs opacity-60">
          {conversations.length} {conversations.length === 1 ? "чат" : "чатів"}
        </span>
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Фільтр за назвою..."
        className="mb-3 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-50"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 && (
          <p className="px-3 py-10 text-center text-sm opacity-50">
            {conversations.length === 0 ? "Чатів ще немає" : "Нічого не знайдено"}
          </p>
        )}
        {shown.map((c) => (
          <div
            key={c.id}
            className={`group mb-1 flex items-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${
              c.id === activeId ? "bg-black/5 dark:bg-white/10" : ""
            }`}
          >
            <button
              onClick={() => onSelect(c.id)}
              className="min-w-0 flex-1 px-3 py-2 text-left"
            >
              <div className="truncate text-sm">{c.title || "New chat"}</div>
              <div className="truncate text-xs opacity-50">
                {formatDate(c.created_at)}
                {c.model ? ` · ${c.model}` : ""}
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this chat?")) onDelete(c.id);
              }}
              className="mr-2 shrink-0 rounded px-2 py-2 text-xs opacity-0 hover:opacity-100 group-hover:opacity-60"
              aria-label="Delete conversation"
              title="Delete conversation"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
