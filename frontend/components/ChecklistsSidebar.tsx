"use client";

import SidebarShell from "@/components/SidebarShell";
import { CollapsibleSection, SectionItem } from "@/components/SidebarSections";
import { IconButton, ListIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { CatalogSubdomain, ChecklistSession } from "@/lib/types";

const RECENTS_LIMIT = 20;

/**
 * The /checklists product's own sidebar: sessions instead of chats, and a
 * subdomain picker where /chats has its products section - the picked subdomain
 * is what a new session gets created against.
 */
export default function ChecklistsSidebar({
  catalog,
  subdomain,
  onSubdomainChange,
  sessions,
  activeId,
  onSelect,
  onNewSession,
  onShowAllSessions,
  allSessionsActive,
  onDelete,
  onOpenSearch,
}: {
  catalog: CatalogSubdomain[];
  subdomain: string | null;
  onSubdomainChange: (name: string) => void;
  sessions: ChecklistSession[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewSession: () => void;
  onShowAllSessions: () => void;
  allSessionsActive: boolean;
  onDelete: (id: number) => void;
  onOpenSearch: () => void;
}) {
  return (
    <SidebarShell
      title="Чек-лісти"
      headerActions={
        <IconButton onClick={onOpenSearch} label="Search sessions">
          <SearchIcon />
        </IconButton>
      }
      collapsedRail={
        <>
          <IconButton onClick={onOpenSearch} label="Search sessions">
            <SearchIcon />
          </IconButton>
          <IconButton onClick={onNewSession} label="New session">
            <PlusIcon />
          </IconButton>
          <IconButton onClick={onShowAllSessions} label="All sessions">
            <ListIcon />
          </IconButton>
        </>
      }
      pinned={
        <>
          <SectionItem onClick={onNewSession} icon={<PlusIcon />}>
            New session
          </SectionItem>
          <SectionItem onClick={onShowAllSessions} active={allSessionsActive} icon={<ListIcon />}>
            All sessions
          </SectionItem>
        </>
      }
    >
      <CollapsibleSection title="Subdomain">
        {catalog.length === 0 && (
          <p className="px-2 py-2 text-xs opacity-40">Каталог порожній</p>
        )}
        {catalog.map((s) => (
          <button
            key={s.name}
            onClick={() => onSubdomainChange(s.name)}
            className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 ${
              s.name === subdomain ? "bg-black/5 dark:bg-white/10" : ""
            }`}
          >
            <span className="min-w-0 truncate">{s.name}</span>
            <span className="shrink-0 text-xs opacity-40">{s.locations.length}</span>
          </button>
        ))}
      </CollapsibleSection>
      <CollapsibleSection title="Recents">
        {sessions.length === 0 && (
          <p className="px-2 py-2 text-xs opacity-40">Сесій ще немає</p>
        )}
        {sessions.slice(0, RECENTS_LIMIT).map((s) => (
          <div
            key={s.id}
            className={`group mb-0.5 flex items-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${
              s.id === activeId && !allSessionsActive ? "bg-black/5 dark:bg-white/10" : ""
            }`}
          >
            <button
              onClick={() => onSelect(s.id)}
              className="min-w-0 flex-1 px-2 py-1.5 text-left"
            >
              <div className="truncate text-sm">{s.title}</div>
              <div className="truncate text-xs opacity-50">
                {s.subdomain} · {s.locations.length} лок. · {s.checklists.length} тип.
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this session?")) onDelete(s.id);
              }}
              className="mr-1 shrink-0 rounded px-1.5 py-1.5 text-xs opacity-0 hover:opacity-100 group-hover:opacity-60"
              aria-label="Delete session"
              title="Delete session"
            >
              ✕
            </button>
          </div>
        ))}
      </CollapsibleSection>
    </SidebarShell>
  );
}
