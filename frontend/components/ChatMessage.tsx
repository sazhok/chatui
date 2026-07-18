"use client";

import ReactMarkdown from "react-markdown";
import { Message } from "@/lib/types";

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-2xl rounded-lg px-4 py-2 text-sm leading-relaxed ${
          isUser ? "bg-white/10" : "bg-transparent"
        }`}
      >
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
