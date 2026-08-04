"use client";

import { useState } from "react";
import { ChecklistSession } from "@/lib/types";

function formatDate(value: string) {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AllSessionsView({
  sessions,
  activeId,
  onSelect,
  onDelete,
}: {
  sessions: ChecklistSession[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [filter, setFilter] = useState("");
  const trimmed = filter.trim().toLowerCase();
  const shown = trimmed
    ? sessions.filter((s) =>
        [s.title, s.subdomain, ...s.locations, ...s.checklists]
          .join(" ")
          .toLowerCase()
          .includes(trimmed),
      )
    : sessions;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Усі сесії</h1>
        <span className="text-xs opacity-60">
          {sessions.length} {sessions.length === 1 ? "сесія" : "сесій"}
        </span>
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Фільтр за назвою, субдоменом, локацією..."
        className="mb-3 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-50"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 && (
          <p className="px-3 py-10 text-center text-sm opacity-50">
            {sessions.length === 0 ? "Сесій ще немає" : "Нічого не знайдено"}
          </p>
        )}
        {shown.map((s) => (
          <div
            key={s.id}
            className={`group mb-1 flex items-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${
              s.id === activeId ? "bg-black/5 dark:bg-white/10" : ""
            }`}
          >
            <button onClick={() => onSelect(s.id)} className="min-w-0 flex-1 px-3 py-2 text-left">
              <div className="truncate text-sm">{s.title}</div>
              <div className="truncate text-xs opacity-50">
                {s.subdomain} · {s.locations.join(", ")} · {s.checklists.join(", ")} ·{" "}
                {formatDate(s.created_at)}
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this session?")) onDelete(s.id);
              }}
              className="mr-2 shrink-0 rounded px-2 py-2 text-xs opacity-0 hover:opacity-100 group-hover:opacity-60"
              aria-label="Delete session"
              title="Delete session"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
