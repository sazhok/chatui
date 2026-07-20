"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setError("Invalid username or password");
      return;
    }
    router.push("/");
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={submit} className="w-80 space-y-4 rounded-lg border border-border p-6">
        <h1 className="text-lg font-semibold">chatui</h1>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
