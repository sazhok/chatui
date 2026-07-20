"use client";

import { useEffect, useState, FormEvent } from "react";
import { AdminUser, UsageRow } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeMode } from "@/lib/theme";
import { useModalTransition } from "@/lib/useModalTransition";

type Section = "general" | "usage" | "administration";

export default function SettingsModal({
  username,
  role,
  onClose,
}: {
  username: string;
  role: string;
  onClose: () => void;
}) {
  const isAdmin = role === "admin";
  const [section, setSection] = useState<Section>("general");
  const { closing, requestClose } = useModalTransition(onClose);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections: { id: Section; label: string }[] = [
    { id: "general", label: "General" },
    { id: "usage", label: "Usage" },
    ...(isAdmin ? [{ id: "administration" as Section, label: "Administration" }] : []),
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ${
        closing ? "animate-[modal-backdrop-out_150ms_ease-in]" : "animate-[modal-backdrop-in_150ms_ease-out]"
      }`}
      onClick={requestClose}
    >
      <div
        className={`flex h-[32rem] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-sidebar text-sm ${
          closing ? "animate-[modal-panel-out_150ms_ease-in]" : "animate-[modal-panel-in_150ms_ease-out]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-48 shrink-0 border-r border-border p-3">
          <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide opacity-50">Settings</div>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`mb-1 block w-full rounded-md px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 ${
                section === s.id ? "bg-black/5 dark:bg-white/10" : ""
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 overflow-y-auto p-6">
          <button
            onClick={requestClose}
            aria-label="Close settings"
            className="absolute right-4 top-4 opacity-60 hover:opacity-100"
          >
            ✕
          </button>
          {section === "general" && <GeneralSection username={username} role={role} />}
          {section === "usage" && <UsageSection />}
          {section === "administration" && isAdmin && <AdministrationSection />}
        </div>
      </div>
    </div>
  );
}

function GeneralSection({ username, role }: { username: string; role: string }) {
  return (
    <div className="space-y-8">
      <h2 className="text-base font-medium">General</h2>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide opacity-50">Profile</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="opacity-60">Username</dt>
            <dd>{username}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="opacity-60">Role</dt>
            <dd className="capitalize">{role}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide opacity-50">Preferences</h3>
        <AppearanceSetting />
      </div>
    </div>
  );
}

function AppearanceSetting() {
  const { theme, setTheme } = useTheme();
  const options: { mode: ThemeMode; label: string }[] = [
    { mode: "system", label: "System" },
    { mode: "light", label: "Light" },
    { mode: "dark", label: "Dark" },
  ];

  return (
    <div>
      <p className="mb-2 text-sm">Appearance</p>
      <div className="grid grid-cols-3 gap-3">
        {options.map((o) => (
          <button
            key={o.mode}
            onClick={() => setTheme(o.mode)}
            className={`flex flex-col items-center gap-2 rounded-lg border p-2 transition ${
              theme === o.mode ? "border-foreground" : "border-border hover:border-foreground/40"
            }`}
          >
            <ThemePreview variant={o.mode} />
            <span className="text-xs">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemePreviewPanel({ bg, bar }: { bg: string; bar: string }) {
  return (
    <div className="flex h-full w-full flex-col gap-1 p-1.5" style={{ backgroundColor: bg }}>
      <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: bar, opacity: 0.9 }} />
      <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: bar, opacity: 0.6 }} />
      <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: bar, opacity: 0.4 }} />
    </div>
  );
}

function ThemePreview({ variant }: { variant: ThemeMode }) {
  return (
    <div className="h-16 w-full overflow-hidden rounded-md border border-border">
      {variant === "system" ? (
        <div className="flex h-full w-full">
          <div className="h-full w-1/2">
            <ThemePreviewPanel bg="#f2f2f3" bar="#1a1a1a" />
          </div>
          <div className="h-full w-1/2">
            <ThemePreviewPanel bg="#171717" bar="#ececec" />
          </div>
        </div>
      ) : variant === "light" ? (
        <ThemePreviewPanel bg="#f2f2f3" bar="#1a1a1a" />
      ) : (
        <ThemePreviewPanel bg="#171717" bar="#ececec" />
      )}
    </div>
  );
}

function UsageSection() {
  const [rows, setRows] = useState<UsageRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/usage");
      if (!res.ok) {
        setError("Failed to load usage");
        return;
      }
      const data = await res.json();
      setRows(data.usage);
    })();
  }, []);

  const totals = rows?.reduce(
    (acc, r) => ({
      requests: acc.requests + r.requests,
      total_tokens: acc.total_tokens + r.total_tokens,
    }),
    { requests: 0, total_tokens: 0 },
  );

  return (
    <div>
      <h2 className="mb-4 text-base font-medium">Usage</h2>
      {error && <p className="text-red-400">{error}</p>}
      {!error && rows === null && <p className="opacity-60">Loading...</p>}
      {rows && rows.length === 0 && <p className="opacity-60">No usage recorded yet.</p>}
      {rows && rows.length > 0 && (
        <>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border opacity-60">
                <th className="py-1.5 pr-2 font-normal">Model</th>
                <th className="py-1.5 pr-2 font-normal">Requests</th>
                <th className="py-1.5 pr-2 font-normal">Prompt tokens</th>
                <th className="py-1.5 pr-2 font-normal">Completion tokens</th>
                <th className="py-1.5 font-normal">Total tokens</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model} className="border-b border-border/50">
                  <td className="py-1.5 pr-2">{r.model}</td>
                  <td className="py-1.5 pr-2">{r.requests}</td>
                  <td className="py-1.5 pr-2">{r.prompt_tokens}</td>
                  <td className="py-1.5 pr-2">{r.completion_tokens}</td>
                  <td className="py-1.5">{r.total_tokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totals && (
            <p className="mt-3 text-xs opacity-60">
              {totals.requests} total requests, {totals.total_tokens} total tokens
            </p>
          )}
        </>
      )}
    </div>
  );
}

function AdministrationSection() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [creating, setCreating] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<{ username: string; password: string } | null>(null);

  const refreshUsers = async () => {
    const res = await fetch("/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  };

  useEffect(() => {
    (async () => {
      await refreshUsers();
    })();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (!username) return;
    setCreating(true);
    setError("");
    setCreatedPassword(null);
    try {
      const res = await fetch("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create user");
      setCreatedPassword({ username: data.username, password: data.password });
      setNewUsername("");
      setNewRole("user");
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-base font-medium">Administration</h2>

      <form onSubmit={handleCreate} className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs opacity-60">Username</label>
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="new-user"
            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs opacity-60">Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
            className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating || !newUsername.trim()}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
        >
          Create
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {createdPassword && (
        <p className="mb-3 rounded-md border border-border bg-black/5 px-3 py-2 text-xs dark:bg-white/5">
          User <span className="font-medium">{createdPassword.username}</span> created. Password (shown once):{" "}
          <span className="font-mono">{createdPassword.password}</span>
        </p>
      )}

      {users === null && <p className="opacity-60">Loading...</p>}
      {users && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border opacity-60">
              <th className="py-1.5 pr-2 font-normal">Username</th>
              <th className="py-1.5 pr-2 font-normal">Role</th>
              <th className="py-1.5 font-normal">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="py-1.5 pr-2">{u.username}</td>
                <td className="py-1.5 pr-2 capitalize">{u.role}</td>
                <td className="py-1.5">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
