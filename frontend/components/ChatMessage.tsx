"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { AttachmentRef, Message } from "@/lib/types";

function AttachmentChips({ attachments }: { attachments: AttachmentRef[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((a) => (
        <span
          key={a.filename}
          className="rounded-md border border-border bg-black/5 px-2 py-1 text-xs dark:bg-white/10"
        >
          {a.filename}
        </span>
      ))}
    </div>
  );
}

export default function ChatMessage({
  message,
  onEdit,
}: {
  message: Message;
  onEdit?: (content: string) => void;
}) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const startEdit = () => {
    setDraft(message.content);
    setIsEditing(true);
  };

  const save = () => {
    const content = draft.trim();
    if (!content) return;
    setIsEditing(false);
    onEdit?.(content);
  };

  if (isEditing) {
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-2xl rounded-lg bg-black/5 px-4 py-2 text-sm dark:bg-white/10">
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentChips attachments={message.attachments} />
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(2, draft.split("\n").length)}
            autoFocus
            className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
          />
          <div className="mt-2 flex justify-end gap-3 text-xs">
            <button onClick={() => setIsEditing(false)} className="opacity-60 hover:opacity-100">
              Скасувати
            </button>
            <button
              onClick={save}
              className="rounded-md border border-border px-2 py-1 hover:bg-black/10 dark:hover:bg-white/10"
            >
              Зберегти й надіслати
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-2xl rounded-lg px-4 py-2 text-sm leading-relaxed ${
          isUser ? "bg-black/5 dark:bg-white/10" : "bg-transparent"
        }`}
      >
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentChips attachments={message.attachments} />
        )}
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {onEdit && (
          <button
            onClick={startEdit}
            className="mt-1 block text-xs opacity-0 hover:opacity-100 group-hover:opacity-60"
          >
            Редагувати
          </button>
        )}
      </div>
    </div>
  );
}
