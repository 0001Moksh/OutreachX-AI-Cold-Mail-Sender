"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDevaApiUrl } from "@/lib/deva-api";
import {
  Bot,
  Send,
  Loader2,
  Wand2,
  ShieldCheck,
  MessageSquareMore,
  ChevronDown,
} from "lucide-react";

type ChatRole = "assistant" | "user";

type DevaAction = {
  type: string;
  label: string;
  payload: Record<string, unknown>;
  destructive?: boolean;
};

type DevaContextItem = {
  id: string;
  title: string;
  kind: string;
  summary?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown>;
};

type DevaContext = {
  profile?: Record<string, unknown>;
  assets?: DevaContextItem[];
  templates?: DevaContextItem[];
  campaigns?: DevaContextItem[];
  leads?: DevaContextItem[];
  memory?: DevaContextItem[];
  suggested_prompts?: string[];
};

type Message = {
  id: string;
  role: ChatRole;
  content: string;
  actions?: DevaAction[];
};

function toTitle(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function DevaPage() {
  const router = useRouter();
  const apiUrl = getDevaApiUrl();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [context, setContext] = useState<DevaContext>({});
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Deva, your AI assistant. How can I help you today?",
    },
  ]);

  const [scopeOpen, setScopeOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const hydrate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      setSessionToken(session.access_token);
      const storedConversationId = window.localStorage.getItem("deva_conversation_id");
      setConversationId(storedConversationId || crypto.randomUUID());
      await loadContext(session.access_token);
      setLoading(false);
    };

    hydrate();
  }, [router]);

  const loadContext = async (token: string) => {
    try {
      const response = await fetch(`${apiUrl}/deva/context`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      setContext(data);
    } catch (error) {
      console.error("Failed to load Deva context", error);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionToken || sending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessage("");
    setSending(true);
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(`${apiUrl}/deva/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Request failed");
      }

      setConversationId(data.conversation_id);
      window.localStorage.setItem("deva_conversation_id", data.conversation_id);
      setContext(data.context || {});

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message || "No response received.",
          actions: data.actions || [],
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "Something went wrong.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const runAction = async (action: DevaAction) => {
    if (!sessionToken) return;

    try {
      const response = await fetch(`${apiUrl}/deva/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: action.type,
          payload: action.payload,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Action failed");

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message || "Action completed successfully.",
        },
      ]);
      await loadContext(sessionToken);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "Action failed.",
        },
      ]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-zinc-300">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading Deva...</span>
        </div>
      </div>
    );
  }

  const suggestedPrompts = context.suggested_prompts || [
    "Summarize my recent activity",
    "What should I focus on next?",
    "Help me draft a message",
  ];

  const profile = context.profile || {};

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Top Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Deva</h1>
              <p className="text-xs text-zinc-500">AI Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-400">
              {toTitle((profile.full_name as string) || "User")}
            </div>
            
            {/* Scope Dropdown */}
            <div className="relative">
              <button
                onClick={() => setScopeOpen(!scopeOpen)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
              >
                <ShieldCheck size={16} className="text-cyan-400" />
                <span>Current Scope</span>
                <ChevronDown size={16} className={`transition ${scopeOpen ? "rotate-180" : ""}`} />
              </button>

              {scopeOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-xl z-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-zinc-400 text-xs">Assets</p>
                      <p className="text-3xl font-semibold mt-1">{context.assets?.length || 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-zinc-400 text-xs">Campaigns</p>
                      <p className="text-3xl font-semibold mt-1">{context.campaigns?.length || 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-zinc-400 text-xs">Templates</p>
                      <p className="text-3xl font-semibold mt-1">{context.templates?.length || 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-zinc-400 text-xs">Leads</p>
                      <p className="text-3xl font-semibold mt-1">{context.leads?.length || 0}</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-4">
                    All operations are scoped to your account only.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 mx-auto max-w-7xl w-full px-6 py-8 gap-8">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur shadow-2xl">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {messages.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-6 py-5 text-[15px] leading-relaxed shadow-lg ${
                    entry.role === "user"
                      ? "bg-cyan-500 text-zinc-950"
                      : "bg-zinc-900 border border-white/10 text-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-widest opacity-70">
                    {entry.role === "user" ? (
                      <MessageSquareMore size={14} />
                    ) : (
                      <Bot size={14} />
                    )}
                    {entry.role === "user" ? "You" : "Deva"}
                  </div>

                  <p className="whitespace-pre-wrap">{entry.content}</p>

                  {entry.actions?.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {entry.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => runAction(action)}
                          className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                            action.destructive
                              ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                              : "bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-white/10 bg-black/40">
            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-2 mb-5">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs border border-white/10 hover:border-cyan-400/40 bg-white/5 hover:bg-cyan-400/10 px-4 py-2.5 rounded-2xl transition-colors text-zinc-300"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(message);
              }}
              className="flex gap-3"
            >
              <div className="flex-1 relative">
                <div className="absolute left-5 top-4 text-cyan-400">
                  <Wand2 size={18} />
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Ask Deva anything..."
                  className="w-full resize-y min-h-[52px] max-h-[180px] pl-14 pr-6 py-4 bg-zinc-900 border border-white/10 rounded-3xl text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400/30"
                />
              </div>

              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="h-[52px] w-[52px] flex items-center justify-center bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 rounded-2xl transition-all active:scale-95"
              >
                {sending ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} />}
              </button>
            </form>

            <p className="text-center text-[10px] text-zinc-600 mt-4">
              Deva can make mistakes. Always verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
