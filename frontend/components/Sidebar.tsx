"use client";

import { Conversation } from "@/lib/types";

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onLogout,
  username,
}: {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onLogout: () => void;
  username: string;
}) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-white/5"
        >
          + New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`mb-1 block w-full truncate rounded-md px-3 py-2 text-left text-sm hover:bg-white/5 ${
              c.id === activeId ? "bg-white/10" : ""
            }`}
          >
            {c.title || "New chat"}
          </button>
        ))}
      </div>
      <div className="border-t border-border p-3 text-sm">
        <div className="mb-2 truncate opacity-70">{username}</div>
        <button onClick={onLogout} className="text-xs opacity-60 hover:opacity-100">
          Log out
        </button>
      </div>
    </div>
  );
}
