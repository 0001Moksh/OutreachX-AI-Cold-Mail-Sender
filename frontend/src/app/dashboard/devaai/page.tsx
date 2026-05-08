"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDevaApiUrl } from "@/lib/deva-api";

import {
  Bot,
  Send,
  Loader2,
  Wand2,
  MessageSquareMore,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  Workflow,
} from "lucide-react";

type ChatRole = "assistant" | "user";

type DevaAction = {
  type: string;
  label: string;
  payload: Record<string, unknown>;
  destructive?: boolean;
};

type Message = {
  id: string;
  role: ChatRole;
  content: string;
  actions?: DevaAction[];
};

export default function DevaPage() {
  const router = useRouter();
  const apiUrl = getDevaApiUrl();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState("");

  const [message, setMessage] = useState("");

  // START WITH EMPTY CHAT
  const [messages, setMessages] = useState<Message[]>([]);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const hydrate = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setSessionToken(session.access_token);

      const storedConversationId =
        window.localStorage.getItem("deva_conversation_id");

      setConversationId(
        storedConversationId || crypto.randomUUID()
      );

      setLoading(false);
    };

    hydrate();
  }, [router]);

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "0px";

    const scrollHeight = textareaRef.current.scrollHeight;

    textareaRef.current.style.height =
      Math.min(scrollHeight, 180) + "px";
  }, [message]);

  const suggestions = useMemo(
    () => [
      "Build a personalized cold email sequence",
      "Analyze my lead database",
      "Generate AI sales workflow",
      "Create outreach strategy",
    ],
    []
  );

  const runAction = (action: DevaAction) => {
    console.log("Action triggered:", action);
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

      window.localStorage.setItem(
        "deva_conversation_id",
        data.conversation_id
      );

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
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="animate-spin" size={22} />
          <span className="text-sm tracking-wide">
            Initializing Deva...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden">

      {/* GLOBAL BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.png')]" />

        {/* Glow 1 */}
        <div className="absolute left-[-10%] top-[10%] h-[520px] w-[520px] rounded-full bg-cyan-500/[0.08] blur-[160px]" />

        {/* Glow 2 */}
        <div className="absolute bottom-[-20%] right-[-10%] h-[520px] w-[520px] rounded-full bg-blue-500/[0.07] blur-[180px]" />

        {/* Grid */}
        <div
          className="
            absolute
            inset-0
            opacity-[0.03]
            [background-image:linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]
            [background-size:80px_80px]
          "
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">

        {/* CHAT AREA */}
        <div
          className="
            flex-1
            overflow-y-auto
            overflow-x-hidden
            scrollbar-thin
            scrollbar-thumb-white/10
            scrollbar-track-transparent
            px-5
            md:px-8
            pt-2
            pb-[220px]
          "
        >

          {/* EMPTY STATE */}
          {!hasMessages ? (
            <div className="mx-auto flex min-h-[calc(100vh-240px)] max-w-6xl flex-col items-center justify-center py-16">

              {/* Heading */}
              <div className="text-center">
                <h1
                  className="
                    mt-2
                    text-center
                    text-5xl
                    font-semibold
                    tracking-tight
                    text-zinc-100
                    md:text-7xl
                  "
                >
                  Deva Intelligence
                </h1>

                <p
                  className="
                    mx-auto
                    mt-6
                    max-w-2xl
                    text-center
                    text-[17px]
                    leading-8
                    text-zinc-500
                  "
                >
                  Build AI workflows, automate outreach,
                  analyze lead intelligence, and execute
                  complex operations with one unified agent.
                </p>
              </div>

              {/* QUICK ACTIONS */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-3">

                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMessage(item)}
                    className="
                      group
                      flex
                      items-center
                      gap-2
                      rounded-2xl
                      border
                      border-white/[0.06]
                      bg-white/[0.03]
                      px-5
                      py-3
                      text-sm
                      text-zinc-300
                      backdrop-blur-xl
                      transition-all
                      duration-300
                      hover:border-cyan-400/20
                      hover:bg-white/[0.05]
                    "
                  >
                    {item}

                    <ArrowRight
                      size={15}
                      className="
                        opacity-50
                        transition-all
                        group-hover:translate-x-1
                        group-hover:opacity-100
                      "
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* CHAT MODE */
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-7">

              {messages.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex ${
                    entry.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`
                      relative
                      max-w-[82%]
                      rounded-[28px]
                      border
                      px-6
                      py-5
                      backdrop-blur-2xl
                      transition-all
                      duration-200
                      ${
                        entry.role === "user"
                          ? `
                            bg-cyan-400
                            text-black
                            border-cyan-300/20
                            shadow-[0_10px_40px_rgba(34,211,238,0.10)]
                          `
                          : `
                            bg-white/[0.035]
                            border-white/[0.06]
                            text-zinc-100
                            shadow-[0_12px_40px_rgba(0,0,0,0.30)]
                          `
                      }
                    `}
                  >

                    <div
                      className="
                        mb-3
                        flex
                        items-center
                        gap-2
                        text-[10px]
                        uppercase
                        tracking-[0.22em]
                        opacity-60
                      "
                    >
                      {entry.role === "user" ? (
                        <MessageSquareMore size={12} />
                      ) : (
                        <Bot size={12} />
                      )}

                      {entry.role === "user"
                        ? "You"
                        : "Deva"}
                    </div>

                    <div className="whitespace-pre-wrap text-[15px] leading-7">
                      {entry.content}
                    </div>

                    {entry.actions?.length ? (
                      <div className="mt-5 flex flex-wrap gap-2">

                        {entry.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => runAction(action)}
                            className="
                              rounded-full
                              border
                              border-white/10
                              bg-white/5
                              px-4
                              py-2
                              text-xs
                              transition-all
                              hover:bg-white/10
                            "
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
          )}
        </div>

        {/* INPUT DOCK */}
        <div className="absolute bottom-0 left-0 right-0 z-30">

          {/* Fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#050505] via-[#050505]/96 to-transparent" />

              <div className="relative mx-auto w-full max-w-4xl px-4 pb-8">

            <div
              className="
                relative
                overflow-hidden
                rounded-[32px]
                border
                border-white/[0.07]
                bg-[#0A0A0A]/90
                backdrop-blur-3xl
                shadow-[0_20px_80px_rgba(0,0,0,0.65)]
              "
            >

              {/* Top Line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.03] via-transparent to-blue-500/[0.03]" />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage(message);
                }}
                className="relative flex items-end gap-4 p-4"
              >

                {/* Icon */}
                <div
                  className="
                    mb-1
                    flex
                    h-11
                    w-11
                    flex-shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-cyan-400/10
                    bg-cyan-400/[0.06]
                  "
                >
                  <Wand2
                    size={18}
                    className="text-cyan-300"
                  />
                </div>

                {/* INPUT */}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={1}
                  placeholder="Message Deva..."
                  className="
                    flex-1
                    resize-none
                    overflow-y-auto
                    bg-transparent
                    py-3
                    text-[15px]
                    leading-7
                    text-white
                    placeholder:text-zinc-500
                    focus:outline-none
                    max-h-[180px]
                    scrollbar-none
                  "
                />

                {/* BUTTON */}
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    bg-cyan-400
                    text-black
                    transition-all
                    duration-200
                    hover:bg-cyan-300
                    hover:shadow-[0_0_35px_rgba(34,211,238,0.30)]
                    active:scale-95
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  {sending ? (
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <p className="mt-4 text-center text-[11px] text-zinc-600">
              Deva may generate inaccurate information.
              Always verify critical outputs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}