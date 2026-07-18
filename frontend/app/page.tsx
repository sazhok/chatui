"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ModelPicker from "@/components/ModelPicker";
import { Conversation, Message } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshConversations = async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
  };

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const me = await meRes.json();
      setUsername(me.username);

      const modelsRes = await fetch("/api/models");
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(data.models);
        if (data.models.length > 0) setSelectedModel(data.models[0]);
      }

      await refreshConversations();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelect = async (id: number) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setActiveId(id);
    setMessages(data.messages);
    if (data.model) setSelectedModel(data.model);
  };

  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleSend = async (content: string) => {
    if (!selectedModel) return;
    setSending(true);
    setSendError("");
    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      let conversationId = activeId;
      if (conversationId === null) {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel }),
        });
        if (!res.ok) throw new Error("Failed to create conversation");
        const data = await res.json();
        conversationId = data.id;
        setActiveId(conversationId);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Request failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: assistantText };
            return next;
          });
        }
      }

      await refreshConversations();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-sm opacity-60">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        username={username}
      />
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-sm opacity-70">chatui</span>
          <ModelPicker
            models={models}
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={activeId !== null}
          />
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
          <div ref={bottomRef} />
        </div>
        {sendError && (
          <div className="px-4 py-2 text-sm text-red-400">{sendError}</div>
        )}
        <ChatInput onSend={handleSend} disabled={sending || !selectedModel} />
      </div>
    </div>
  );
}
