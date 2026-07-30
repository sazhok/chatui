"use client";

import { useState } from "react";
import { Conversation } from "@/lib/types";
import UserMenu from "@/components/UserMenu";

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function SectionItem({
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

function CollapsibleSection({
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

const RECENTS_LIMIT = 20;

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onShowAllChats,
  allChatsActive,
  onDelete,
  onLogout,
  onOpenSettings,
  onOpenSearch,
  username,
  models,
  selectedModel,
  onModelChange,
  modelPickerDisabled,
}: {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onShowAllChats: () => void;
  allChatsActive: boolean;
  onDelete: (id: number) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  username: string;
  models: string[];
  selectedModel: string | null;
  onModelChange: (model: string) => void;
  modelPickerDisabled: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`flex h-full flex-col overflow-hidden border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-12" : "w-64"
      }`}
    >
      {collapsed ? (
        <>
          <div className="flex flex-col items-center gap-1 py-3">
            <IconButton onClick={() => setCollapsed(false)} label="Expand sidebar">
              <PanelIcon />
            </IconButton>
            <IconButton onClick={onOpenSearch} label="Search chats">
              <SearchIcon />
            </IconButton>
            <IconButton onClick={onNewChat} label="New chat">
              <PlusIcon />
            </IconButton>
            <IconButton onClick={onShowAllChats} label="All chats">
              <ListIcon />
            </IconButton>
          </div>
          <div className="mt-auto flex flex-col items-center p-2">
            <UserMenu
              username={username}
              models={models}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              modelPickerDisabled={modelPickerDisabled}
              onOpenSettings={onOpenSettings}
              onLogout={onLogout}
              collapsed
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border px-3 py-3">
            <span className="whitespace-nowrap text-sm font-semibold">Чатуй!</span>
            <div className="flex items-center gap-1">
              <IconButton onClick={onOpenSearch} label="Search chats">
                <SearchIcon />
              </IconButton>
              <IconButton onClick={() => setCollapsed(true)} label="Collapse sidebar">
                <PanelIcon />
              </IconButton>
            </div>
          </div>
          <div className="border-b border-border p-2">
            <SectionItem onClick={onNewChat} icon={<PlusIcon />}>
              New chat
            </SectionItem>
            <SectionItem onClick={onShowAllChats} active={allChatsActive} icon={<ListIcon />}>
              All chats
            </SectionItem>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            <CollapsibleSection title="Products">
              <p className="px-2 py-2 text-xs opacity-40">Нічого поки що немає</p>
            </CollapsibleSection>
            <CollapsibleSection title="Recents">
              {conversations.length === 0 && (
                <p className="px-2 py-2 text-xs opacity-40">Чатів ще немає</p>
              )}
              {conversations.slice(0, RECENTS_LIMIT).map((c) => (
                <div
                  key={c.id}
                  className={`group mb-0.5 flex items-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${
                    c.id === activeId && !allChatsActive ? "bg-black/5 dark:bg-white/10" : ""
                  }`}
                >
                  <button
                    onClick={() => onSelect(c.id)}
                    className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm"
                  >
                    {c.title || "New chat"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this chat?")) onDelete(c.id);
                    }}
                    className="mr-1 shrink-0 rounded px-1.5 py-1.5 text-xs opacity-0 hover:opacity-100 group-hover:opacity-60"
                    aria-label="Delete conversation"
                    title="Delete conversation"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </CollapsibleSection>
          </div>
          <div className="border-t border-border p-2">
            <UserMenu
              username={username}
              models={models}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              modelPickerDisabled={modelPickerDisabled}
              onOpenSettings={onOpenSettings}
              onLogout={onLogout}
            />
          </div>
        </>
      )}
    </div>
  );
}
