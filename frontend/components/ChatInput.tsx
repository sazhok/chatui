"use client";

import { useState, KeyboardEvent } from "react";

export default function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  const send = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-border p-4">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder="Message chatui..."
        className="flex-1 resize-none rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none"
      />
      <button
        onClick={send}
        disabled={disabled}
        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
