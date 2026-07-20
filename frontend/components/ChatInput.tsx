"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { AttachmentDraft } from "@/lib/types";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 200_000;
const MAX_TEXTAREA_HEIGHT_RATIO = 0.3;

export default function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (content: string, attachments: AttachmentDraft[]) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "";
    if (el.scrollHeight > el.clientHeight) {
      const maxHeight = window.innerHeight * MAX_TEXTAREA_HEIGHT_RATIO;
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  useEffect(() => {
    window.addEventListener("resize", resizeTextarea);
    return () => window.removeEventListener("resize", resizeTextarea);
  }, []);

  const send = () => {
    const content = value.trim();
    if ((!content && attachments.length === 0) || disabled) return;
    onSend(content, attachments);
    setValue("");
    setAttachments([]);
    setAttachError("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const addFiles = async (files: FileList) => {
    setAttachError("");
    const accepted: AttachmentDraft[] = [];
    for (const file of Array.from(files)) {
      if (attachments.length + accepted.length >= MAX_ATTACHMENTS) {
        setAttachError(`You can attach up to ${MAX_ATTACHMENTS} files`);
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        setAttachError(`"${file.name}" is too large (max ${MAX_FILE_SIZE / 1000}KB)`);
        continue;
      }
      const text = await file.text();
      if (text.includes("\u0000")) {
        setAttachError(`"${file.name}" doesn't look like a text file`);
        continue;
      }
      accepted.push({ filename: file.name, content: text });
    }
    if (accepted.length > 0) {
      setAttachments((prev) => [...prev, ...accepted]);
    }
  };

  const removeAttachment = (filename: string) => {
    setAttachments((prev) => prev.filter((a) => a.filename !== filename));
  };

  return (
    <div className="border-t border-border p-4">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <span
              key={a.filename}
              className="flex items-center gap-1 rounded-md border border-border bg-black/5 px-2 py-1 text-xs dark:bg-white/5"
            >
              {a.filename}
              <button
                onClick={() => removeAttachment(a.filename)}
                aria-label={`Remove ${a.filename}`}
                className="opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {attachError && <p className="mb-2 text-xs text-red-400">{attachError}</p>}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach files"
          title="Attach files"
          className="rounded-md border border-border p-2 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
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
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
