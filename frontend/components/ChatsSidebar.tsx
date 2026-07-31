"use client";

import ModelPicker from "@/components/ModelPicker";
import SidebarShell from "@/components/SidebarShell";
import { CollapsibleSection, SectionItem } from "@/components/SidebarSections";
import { IconButton, ListIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Conversation } from "@/lib/types";

const RECENTS_LIMIT = 20;

/** The /chats product's own sidebar content, dropped into the shared shell. */
export default function ChatsSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onShowAllChats,
  allChatsActive,
  onDelete,
  onOpenSearch,
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
  onOpenSearch: () => void;
  models: string[];
  selectedModel: string | null;
  onModelChange: (model: string) => void;
  modelPickerDisabled: boolean;
}) {
  return (
    <SidebarShell
      title="Чатуй!"
      headerActions={
        <IconButton onClick={onOpenSearch} label="Search chats">
          <SearchIcon />
        </IconButton>
      }
      collapsedRail={
        <>
          <IconButton onClick={onOpenSearch} label="Search chats">
            <SearchIcon />
          </IconButton>
          <IconButton onClick={onNewChat} label="New chat">
            <PlusIcon />
          </IconButton>
          <IconButton onClick={onShowAllChats} label="All chats">
            <ListIcon />
          </IconButton>
        </>
      }
      menuExtras={
        <div className="px-3 py-2">
          <div className="mb-1 text-xs opacity-60">Model</div>
          <ModelPicker
            models={models}
            value={selectedModel}
            onChange={onModelChange}
            disabled={modelPickerDisabled}
          />
        </div>
      }
      pinned={
        <>
          <SectionItem onClick={onNewChat} icon={<PlusIcon />}>
            New chat
          </SectionItem>
          <SectionItem onClick={onShowAllChats} active={allChatsActive} icon={<ListIcon />}>
            All chats
          </SectionItem>
        </>
      }
    >
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
    </SidebarShell>
  );
}
