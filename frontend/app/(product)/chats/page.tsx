"use client";

import { useEffect, useRef, useState } from "react";
import ChatsSidebar from "@/components/ChatsSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import SearchModal from "@/components/SearchModal";
import AllChatsView from "@/components/AllChatsView";
import { AttachmentDraft, Conversation, Message } from "@/lib/types";

export default function ChatsPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [view, setView] = useState<"chat" | "allChats">("chat");
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
      const modelsRes = await fetch("/api/models");
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(data.models);
        if (data.models.length > 0) setSelectedModel(data.models[0]);
      }

      await refreshConversations();
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setActiveId(id);
    setMessages(data.messages);
    setView("chat");
    if (data.model) setSelectedModel(data.model);
  };

  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setView("chat");
  };

  const syncMessages = async (conversationId: number | null) => {
    if (conversationId === null) return;
    const res = await fetch(`/api/conversations/${conversationId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    if (id === activeId) {
      setActiveId(null);
      setMessages([]);
    }
    await refreshConversations();
  };

  const handleSend = async (content: string, attachments: AttachmentDraft[]) => {
    if (!selectedModel) return;
    setSending(true);
    setSendError("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content, attachments: attachments.map((a) => ({ filename: a.filename })) },
    ]);

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
        body: JSON.stringify({ content, attachments }),
      });
      if (!res.ok) throw new Error("Request failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const delta = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + delta };
            return next;
          });
        }
      }

      await syncMessages(conversationId);
      await refreshConversations();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: number, content: string) => {
    if (activeId === null) return;
    setSending(true);
    setSendError("");

    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId);
      if (idx === -1) return prev;
      const truncated = prev.slice(0, idx + 1);
      truncated[idx] = { ...truncated[idx], content };
      return [...truncated, { role: "assistant", content: "" }];
    });

    try {
      const res = await fetch(`/api/conversations/${activeId}/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to edit message");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const delta = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + delta };
            return next;
          });
        }
      }

      await syncMessages(activeId);
      await refreshConversations();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (!ready) {
    return <div className="flex flex-1 items-center justify-center text-sm opacity-60">Loading...</div>;
  }

  return (
    <>
      <ChatsSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onShowAllChats={() => setView("allChats")}
        allChatsActive={view === "allChats"}
        onDelete={handleDelete}
        onOpenSearch={() => setSearchOpen(true)}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        modelPickerDisabled={activeId !== null}
      />
      {searchOpen && (
        <SearchModal
          conversations={conversations}
          onSelect={handleSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === "allChats" ? (
          <AllChatsView
            conversations={conversations}
            activeId={activeId}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6">
              {messages.map((m, i) => (
                <ChatMessage
                  key={m.id ?? i}
                  message={m}
                  onEdit={
                    m.role === "user" && m.id != null && !sending
                      ? (content) => handleEditMessage(m.id as number, content)
                      : undefined
                  }
                />
              ))}
              <div ref={bottomRef} />
            </div>
            {sendError && (
              <div className="px-4 py-2 text-sm text-red-400">{sendError}</div>
            )}
            <ChatInput onSend={handleSend} disabled={sending || !selectedModel} />
          </>
        )}
      </div>
    </>
  );
}
