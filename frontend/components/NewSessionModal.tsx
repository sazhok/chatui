"use client";

import { useEffect, useMemo, useState } from "react";
import { CatalogSubdomain } from "@/lib/types";
import { useModalTransition } from "@/lib/useModalTransition";

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-current" />
      <span className="min-w-0 truncate">{children}</span>
    </label>
  );
}

/**
 * Confirms a new session's scope: one subdomain, one or more locations, one or
 * more checklist types. Checklist types are the union of what the picked
 * locations actually have in the catalog.
 */
export default function NewSessionModal({
  catalog,
  initialSubdomain,
  onCreate,
  onClose,
}: {
  catalog: CatalogSubdomain[];
  initialSubdomain: string | null;
  onCreate: (scope: { subdomain: string; locations: string[]; checklists: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const { closing, requestClose } = useModalTransition(onClose);
  const [subdomain, setSubdomain] = useState(initialSubdomain ?? catalog[0]?.name ?? "");
  const [locations, setLocations] = useState<string[]>([]);
  const [checklists, setChecklists] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const current = catalog.find((s) => s.name === subdomain);

  const availableChecklists = useMemo(() => {
    const names = new Set<string>();
    for (const location of current?.locations ?? []) {
      if (locations.includes(location.id)) location.checklists.forEach((c) => names.add(c));
    }
    return [...names].sort();
  }, [current, locations]);

  // Dropping a location can take its checklist types out of the catalog union,
  // so derive the effective selection instead of syncing state in an effect.
  const selectedChecklists = checklists.filter((c) => availableChecklists.includes(c));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const pickSubdomain = (name: string) => {
    setSubdomain(name);
    setLocations([]);
    setChecklists([]);
    setError("");
  };

  const canCreate =
    Boolean(subdomain) && locations.length > 0 && selectedChecklists.length > 0 && !busy;

  const create = async () => {
    if (!canCreate) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({ subdomain, locations, checklists: selectedChecklists });
      requestClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити сесію");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 ${
        closing ? "animate-[modal-backdrop-out_150ms_ease-in]" : "animate-[modal-backdrop-in_150ms_ease-out]"
      }`}
      onClick={requestClose}
    >
      <div
        className={`flex max-h-[32rem] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-sidebar text-sm shadow-lg ${
          closing ? "animate-[modal-panel-out_150ms_ease-in]" : "animate-[modal-panel-in_150ms_ease-out]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3 font-semibold">Нова сесія</div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide opacity-60">Субдомен</div>
            <div className="flex flex-wrap gap-2">
              {catalog.map((s) => (
                <button
                  key={s.name}
                  onClick={() => pickSubdomain(s.name)}
                  className={`rounded-md border px-3 py-1.5 ${
                    s.name === subdomain
                      ? "border-current"
                      : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs uppercase tracking-wide opacity-60">
              Локації {locations.length > 0 && `(${locations.length})`}
            </div>
            {(current?.locations.length ?? 0) === 0 ? (
              <p className="px-2 py-2 text-xs opacity-50">Немає локацій у каталозі</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                {current?.locations.map((location) => (
                  <Toggle
                    key={location.id}
                    checked={locations.includes(location.id)}
                    onChange={() => setLocations((prev) => toggle(prev, location.id))}
                  >
                    {location.id}
                  </Toggle>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-xs uppercase tracking-wide opacity-60">
              Типи чек-лісту {selectedChecklists.length > 0 && `(${selectedChecklists.length})`}
            </div>
            {availableChecklists.length === 0 ? (
              <p className="px-2 py-2 text-xs opacity-50">Спочатку виберіть локацію</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                {availableChecklists.map((name) => (
                  <Toggle
                    key={name}
                    checked={selectedChecklists.includes(name)}
                    onChange={() => setChecklists((prev) => toggle(prev, name))}
                  >
                    {name}
                  </Toggle>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
          <button onClick={requestClose} className="opacity-60 hover:opacity-100">
            Скасувати
          </button>
          <button
            onClick={create}
            disabled={!canCreate}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/5"
          >
            {busy ? "Створення..." : "Створити сесію"}
          </button>
        </div>
      </div>
    </div>
  );
}
