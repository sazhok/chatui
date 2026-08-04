"use client";

import { useEffect, useState } from "react";
import AllSessionsView from "@/components/AllSessionsView";
import ChecklistsSidebar from "@/components/ChecklistsSidebar";
import NewSessionModal from "@/components/NewSessionModal";
import SessionSearchModal from "@/components/SessionSearchModal";
import SessionView from "@/components/SessionView";
import { CatalogSubdomain, ChecklistSession } from "@/lib/types";

export default function ChecklistsPage() {
  const [catalog, setCatalog] = useState<CatalogSubdomain[]>([]);
  const [sessions, setSessions] = useState<ChecklistSession[]>([]);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<ChecklistSession | null>(null);
  const [view, setView] = useState<"session" | "allSessions">("allSessions");
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const refreshSessions = async () => {
    const res = await fetch("/api/checklists/sessions");
    if (res.ok) setSessions((await res.json()).sessions);
  };

  useEffect(() => {
    (async () => {
      const catalogRes = await fetch("/api/checklists/catalog");
      if (catalogRes.ok) {
        const data = await catalogRes.json();
        setCatalog(data.subdomains);
        if (data.subdomains.length > 0) setSubdomain(data.subdomains[0].name);
      }
      await refreshSessions();
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelect = async (id: number) => {
    setError("");
    const res = await fetch(`/api/checklists/sessions/${id}`);
    if (!res.ok) return;
    setActiveSession(await res.json());
    setActiveId(id);
    setView("session");
  };

  const handleCreate = async (scope: {
    subdomain: string;
    locations: string[];
    checklists: string[];
  }) => {
    const res = await fetch("/api/checklists/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scope),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? "Не вдалося створити сесію");
    }
    const { id } = await res.json();
    setSubdomain(scope.subdomain);
    await refreshSessions();
    await handleSelect(id);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/checklists/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    if (id === activeId) {
      setActiveId(null);
      setActiveSession(null);
      setView("allSessions");
    }
    await refreshSessions();
  };

  if (!ready) {
    return <div className="flex flex-1 items-center justify-center text-sm opacity-60">Loading...</div>;
  }

  return (
    <>
      <ChecklistsSidebar
        catalog={catalog}
        subdomain={subdomain}
        onSubdomainChange={setSubdomain}
        sessions={sessions}
        activeId={activeId}
        onSelect={handleSelect}
        onNewSession={() => setNewSessionOpen(true)}
        onShowAllSessions={() => setView("allSessions")}
        allSessionsActive={view === "allSessions"}
        onDelete={handleDelete}
        onOpenSearch={() => setSearchOpen(true)}
      />
      {newSessionOpen && (
        <NewSessionModal
          catalog={catalog}
          initialSubdomain={subdomain}
          onCreate={handleCreate}
          onClose={() => setNewSessionOpen(false)}
        />
      )}
      {searchOpen && (
        <SessionSearchModal
          sessions={sessions}
          onSelect={handleSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error && <div className="px-4 py-2 text-sm text-red-400">{error}</div>}
        {view === "session" && activeSession ? (
          <SessionView session={activeSession} />
        ) : (
          <AllSessionsView
            sessions={sessions}
            activeId={activeId}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        )}
      </div>
    </>
  );
}
