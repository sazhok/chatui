"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ModelPicker from "@/components/ModelPicker";

function getInitials(username: string): string {
  const parts = username.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] ?? "").slice(0, 2).toUpperCase();
}

export default function UserMenu({
  username,
  models,
  selectedModel,
  onModelChange,
  modelPickerDisabled,
  onOpenSettings,
  onLogout,
  collapsed,
}: {
  username: string;
  models: string[];
  selectedModel: string | null;
  onModelChange: (model: string) => void;
  modelPickerDisabled: boolean;
  onOpenSettings: () => void;
  onLogout: () => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  const toggle = () => setOpen((v) => !v);

  return (
    <div ref={containerRef} className="relative">
      {open && menuPos && (
        <div
          style={{ position: "fixed", bottom: menuPos.bottom, left: menuPos.left }}
          className="w-56 overflow-hidden rounded-md border border-border bg-sidebar text-sm shadow-lg"
        >
          <div className="border-b border-border py-1">
            <button
              onClick={() => {
                setOpen(false);
                onOpenSettings();
              }}
              className="block w-full px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
            >
              Settings
            </button>
            <div className="px-3 py-2">
              <div className="mb-1 text-xs opacity-60">Model</div>
              <ModelPicker
                models={models}
                value={selectedModel}
                onChange={onModelChange}
                disabled={modelPickerDisabled}
              />
            </div>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="block w-full px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
            >
              Log out
            </button>
          </div>
        </div>
      )}
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label="User menu"
        title={username}
        className={`flex items-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${
          collapsed ? "justify-center p-1.5" : "w-full gap-2 px-2 py-2 text-left"
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-medium dark:bg-white/10">
          {getInitials(username)}
        </span>
        {!collapsed && <span className="truncate text-sm opacity-90">{username}</span>}
      </button>
    </div>
  );
}
