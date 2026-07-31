"use client";

import { useState } from "react";
import { ChevronIcon } from "@/components/icons";

/** A single clickable row inside a sidebar section - shared by all products. */
export function SectionItem({
  onClick,
  active,
  icon,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 ${
        active ? "bg-black/5 dark:bg-white/10" : ""
      }`}
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="px-2 py-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
      >
        <ChevronIcon open={open} />
        <span className="truncate">{title}</span>
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}
