"use client";

import { useState } from "react";
import { ChecklistQuestion, ChecklistSession } from "@/lib/types";

/** Loaded lazily per (location, checklist) pair - the CSVs can be long. */
type Loaded = { columns: string[]; rows: ChecklistQuestion[] };

function formatDate(value: string) {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function SessionView({ session }: { session: ChecklistSession }) {
  const [location, setLocation] = useState(session.locations[0] ?? "");
  const [checklist, setChecklist] = useState(session.checklists[0] ?? "");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (nextLocation: string, nextChecklist: string) => {
    setLocation(nextLocation);
    setChecklist(nextChecklist);
    setLoaded(null);
    setError("");
    if (!nextLocation || !nextChecklist) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/checklists/sessions/${session.id}/questions` +
          `?location=${encodeURIComponent(nextLocation)}&checklist=${encodeURIComponent(nextChecklist)}`,
      );
      if (!res.ok) throw new Error((await res.json()).detail ?? "Не вдалося завантажити чек-ліст");
      const data = await res.json();
      const rows: ChecklistQuestion[] = data.questions;
      setLoaded({ columns: rows.length > 0 ? Object.keys(rows[0]) : [], rows });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити чек-ліст");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-lg font-semibold">{session.title}</h1>
        <p className="mt-1 text-xs opacity-60">
          {session.subdomain} · створено {formatDate(session.created_at)}
        </p>

        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide opacity-60">Локації</div>
            <div className="flex flex-wrap gap-2">
              {session.locations.map((id) => (
                <button
                  key={id}
                  onClick={() => load(id, checklist)}
                  className={`rounded-md border px-2.5 py-1 text-sm ${
                    id === location ? "border-current" : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide opacity-60">Типи чек-лісту</div>
            <div className="flex flex-wrap gap-2">
              {session.checklists.map((name) => (
                <button
                  key={name}
                  onClick={() => load(location, name)}
                  className={`rounded-md border px-2.5 py-1 text-sm ${
                    name === checklist ? "border-current" : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-5 min-h-0 w-full max-w-5xl flex-1 overflow-auto">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading && <p className="text-sm opacity-60">Завантаження...</p>}
        {!loading && !error && loaded === null && (
          <p className="text-sm opacity-50">
            Виберіть локацію й тип чек-лісту, щоб побачити його питання.
          </p>
        )}
        {loaded && loaded.rows.length === 0 && (
          <p className="text-sm opacity-50">У цьому чек-лісті немає питань.</p>
        )}
        {loaded && loaded.rows.length > 0 && (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-background">
              <tr>
                {loaded.columns.map((c) => (
                  <th key={c} className="border-b border-border px-2 py-2 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaded.rows.map((row, i) => (
                <tr key={i} className="align-top">
                  {loaded.columns.map((c) => (
                    <td key={c} className="border-b border-border px-2 py-2 whitespace-pre-wrap">
                      {row[c]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
