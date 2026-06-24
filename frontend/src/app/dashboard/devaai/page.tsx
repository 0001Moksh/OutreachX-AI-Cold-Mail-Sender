"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDevaApiUrl } from "@/lib/deva-api";
import { DynamicWidget } from "@/components/deva/DynamicWidgets";

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
  Trash2,
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
  duration?: number;
  isTyping?: boolean;
  created_at?: string;
};

function TypewriterEffect({ text, onComplete, speed = 8 }: { text: string; onComplete: () => void; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!text) {
      onComplete();
      return;
    }
    let index = 0;
    const timer = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(timer);
        onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return <>{displayed}</>;
}

function MarkdownRenderer({ content }: { content: string }) {
  const parseMarkdown = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const fullContent = part.slice(3, -3).trim();
        const firstLineBreak = fullContent.indexOf("\n");
        const language = firstLineBreak !== -1 ? fullContent.slice(0, firstLineBreak).trim() : "";
        const code = firstLineBreak !== -1 ? fullContent.slice(firstLineBreak + 1) : fullContent;
        return (
          <pre key={index} className="my-4 overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-sm border border-zinc-800/80 text-zinc-300">
            {language && <div className="mb-2 text-xs text-zinc-500 uppercase tracking-wider">{language}</div>}
            <code>{code}</code>
          </pre>
        );
      } else {
        return renderTextBlocks(part, index);
      }
    });
  };

  const renderTextBlocks = (text: string, partIndex: number) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    
    let currentList: { type: "ul" | "ol" | "table"; items: string[] } | null = null;
    
    const flushList = (key: string | number) => {
      if (!currentList) return;
      if (currentList.type === "ul") {
        elements.push(
          <ul key={key} className="my-3 list-disc pl-6 space-y-1.5 text-zinc-300">
            {currentList.items.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      } else if (currentList.type === "ol") {
        elements.push(
          <ol key={key} className="my-3 list-decimal pl-6 space-y-1.5 text-zinc-300">
            {currentList.items.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      } else if (currentList.type === "table") {
        const rows = currentList.items.map(rowStr => 
          rowStr.split("|").map(cell => cell.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        ).filter(row => row.length > 0);
        
        if (rows.length > 0) {
          const isDivider = (cell: string) => /^[:-]+$/.test(cell);
          const hasHeader = rows.length > 1 && rows[1].every(isDivider);
          const headerRow = hasHeader ? rows[0] : null;
          const bodyRows = hasHeader ? rows.slice(2) : rows;
          
          elements.push(
            <div key={key} className="my-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
              <table className="w-full border-collapse text-left text-sm text-zinc-300">
                {headerRow && (
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      {headerRow.map((cell, idx) => (
                        <th key={idx} className="px-4 py-2.5 font-semibold text-zinc-100">{renderInline(cell)}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {bodyRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-zinc-900 last:border-0 hover:bg-white/[0.01]">
                      {row.map((cell, colIdx) => (
                        <td key={colIdx} className="px-4 py-2.5">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }
      currentList = null;
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith("#")) {
        flushList(`flush-${partIndex}-${i}`);
        const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          const level = match[1].length;
          const title = match[2];
          const headingClasses = [
            "",
            "text-2xl font-bold text-zinc-100 mt-5 mb-3",
            "text-xl font-bold text-zinc-100 mt-4 mb-2.5",
            "text-lg font-semibold text-zinc-100 mt-3.5 mb-2",
            "text-base font-semibold text-zinc-200 mt-3 mb-1.5",
            "text-sm font-semibold text-zinc-300 mt-3 mb-1.5",
            "text-xs font-semibold text-zinc-400 mt-3 mb-1"
          ];
          const HeadingTag = `h${level}` as any;
          elements.push(
            <HeadingTag key={i} className={headingClasses[level]}>
              {renderInline(title)}
            </HeadingTag>
          );
          continue;
        }
      }
      
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        flushList(`flush-${partIndex}-${i}`);
        elements.push(<hr key={i} className="my-5 border-zinc-800" />);
        continue;
      }
      
      const bulletMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
      if (bulletMatch) {
        const content = bulletMatch[3];
        if (currentList && currentList.type !== "ul") {
          flushList(`flush-${partIndex}-${i}`);
        }
        if (!currentList) {
          currentList = { type: "ul", items: [] };
        }
        currentList.items.push(content);
        continue;
      }
      
      const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberMatch) {
        const content = numberMatch[3];
        if (currentList && currentList.type !== "ol") {
          flushList(`flush-${partIndex}-${i}`);
        }
        if (!currentList) {
          currentList = { type: "ol", items: [] };
        }
        currentList.items.push(content);
        continue;
      }
      
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        if (currentList && currentList.type !== "table") {
          flushList(`flush-${partIndex}-${i}`);
        }
        if (!currentList) {
          currentList = { type: "table", items: [] };
        }
        currentList.items.push(trimmed);
        continue;
      }
      
      if (trimmed === "") {
        flushList(`flush-${partIndex}-${i}`);
        elements.push(<div key={i} className="h-2" />);
      } else {
        flushList(`flush-${partIndex}-${i}`);
        elements.push(
          <p key={i} className="my-2 text-zinc-300 leading-7">
            {renderInline(line)}
          </p>
        );
      }
    }
    
    flushList(`flush-end-${partIndex}`);
    return <div key={partIndex}>{elements}</div>;
  };

  const renderInline = (text: string): React.ReactNode => {
    let parts: (string | React.ReactNode)[] = [text];
    
    parts = parts.flatMap((part, partIdx) => {
      if (typeof part !== "string") return part;
      const split = part.split(/(\*\*.*?\*\*)/g);
      return split.map((subPart, subIdx) => {
        if (subPart.startsWith("**") && subPart.endsWith("**")) {
          return <strong key={`bold-${partIdx}-${subIdx}`} className="font-semibold text-white">{subPart.slice(2, -2)}</strong>;
        }
        return subPart;
      });
    });
    
    parts = parts.flatMap((part, partIdx) => {
      if (typeof part !== "string") return part;
      const split = part.split(/(`.*?`)/g);
      return split.map((subPart, subIdx) => {
        if (subPart.startsWith("`") && subPart.endsWith("`")) {
          return <code key={`code-${partIdx}-${subIdx}`} className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 font-mono text-sm text-cyan-300">{subPart.slice(1, -1)}</code>;
        }
        return subPart;
      });
    });
    
    parts = parts.flatMap((part, partIdx) => {
      if (typeof part !== "string") return part;
      const split = part.split(/(\[.*?\]\(.*?\))/g);
      return split.map((subPart, subIdx) => {
        const match = subPart.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          return (
            <a key={`link-${partIdx}-${subIdx}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300 transition-colors">
              {match[1]}
            </a>
          );
        }
        return subPart;
      });
    });
    
    return <>{parts}</>;
  };

  return <>{parseMarkdown(content)}</>;
}

function formatDateDivider(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
}


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
      const activeConvId = storedConversationId || crypto.randomUUID();

      setConversationId(activeConvId);

      // Hydrate chat messages from localStorage if cached
      const cachedMessages = window.localStorage.getItem(`deva_chat_messages_${activeConvId}`);
      if (cachedMessages) {
        try {
          const parsed = JSON.parse(cachedMessages);
          const sanitized = parsed.map((m: any, idx: number) => ({
            ...m,
            created_at: m.created_at || new Date(Date.now() - (parsed.length - idx) * 60000).toISOString()
          }));
          setMessages(sanitized);
        } catch (e) {
          console.error("Failed to parse cached chat messages", e);
        }
      }

      setLoading(false);
    };

    hydrate();
  }, [router]);

  // Sync messages to localStorage whenever they change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      window.localStorage.setItem(`deva_chat_messages_${conversationId}`, JSON.stringify(messages));
    }
  }, [messages, conversationId]);

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

  const runAction = async (action: DevaAction) => {
    console.log("Action triggered:", action);
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
      if (data.success) {
        // Optionally add a message to chat saying it was successful
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.message || "Action completed successfully.",
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        throw new Error(data.message || "Action failed");
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${err.message}`,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || !sessionToken || sending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessage("");
    setSending(true);

    setMessages((prev) => [...prev, userMessage]);

    const startTime = performance.now();

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

      const endTime = performance.now();
      const elapsed = ((endTime - startTime) / 1000).toFixed(1);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message || "No response received.",
          actions: data.actions || [],
          duration: parseFloat(elapsed),
          isTyping: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      const endTime = performance.now();
      const elapsed = ((endTime - startTime) / 1000).toFixed(1);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong.",
          duration: parseFloat(elapsed),
          created_at: new Date().toISOString(),
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
    <div className="relative h-[calc(100vh-64px)] lg:h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden">

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

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">

        {/* CLEAR HISTORY BUTTON */}
        {hasMessages && (
          <div className="absolute top-4 right-6 z-50">
            <button
              onClick={async () => {
                setMessages([]);
                window.localStorage.removeItem(`deva_chat_messages_${conversationId}`);
                try {
                  await fetch(`${apiUrl}/deva/chat`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${sessionToken}`,
                    },
                    body: JSON.stringify({
                      message: "clear history",
                      conversation_id: conversationId,
                    }),
                  });
                } catch(e) {}
              }}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0A]/80 px-4 py-2 text-xs text-zinc-400 backdrop-blur-md transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 size={14} />
              Clear History
            </button>
          </div>
        )}

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
            pb-[140px]
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

              {messages.map((entry, idx) => {
                const prevEntry = idx > 0 ? messages[idx - 1] : null;
                const showDateDivider = !prevEntry || (
                  entry.created_at && prevEntry.created_at &&
                  new Date(entry.created_at).toDateString() !== new Date(prevEntry.created_at).toDateString()
                );
                const dateLabel = showDateDivider && entry.created_at ? formatDateDivider(entry.created_at) : null;

                return (
                  <React.Fragment key={entry.id}>
                    {dateLabel && (
                      <div className="flex items-center my-4 w-full justify-center">
                        <div className="flex-1 h-[1px] bg-white/[0.06]" />
                        <span className="px-4 py-1.5 mx-4 rounded-full bg-zinc-900 border border-white/[0.04] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                          {dateLabel}
                        </span>
                        <div className="flex-1 h-[1px] bg-white/[0.06]" />
                      </div>
                    )}
                    <div
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
                            : entry.duration
                              ? `Deva (${entry.duration}s)`
                              : "Deva"}
                        </div>

                        <div className="text-[15px] leading-7">
                          {entry.role === "assistant" && entry.isTyping ? (
                            <div className="whitespace-pre-wrap">
                              <TypewriterEffect 
                                text={entry.content} 
                                onComplete={() => {
                                  setMessages((prev) => 
                                    prev.map((msg) => 
                                      msg.id === entry.id ? { ...msg, isTyping: false } : msg
                                    )
                                  );
                                }}
                              />
                            </div>
                          ) : entry.role === "assistant" ? (
                            <MarkdownRenderer content={entry.content} />
                          ) : (
                            <div className="whitespace-pre-wrap">{entry.content}</div>
                          )}
                        </div>

                        {(!entry.isTyping && entry.actions?.length) ? (
                          <div className="mt-5 flex flex-wrap gap-2 w-full">

                            {entry.actions.map((action, idx) => {
                              if (action.type.startsWith("widget_")) {
                                return (
                                  <div key={idx} className="w-full">
                                    <DynamicWidget 
                                      type={action.type.replace("widget_", "")} 
                                      payload={action.payload} 
                                      onAction={runAction} 
                                    />
                                  </div>
                                );
                              }
                              return (
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
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {sending && (
                <div className="flex justify-start">
                  <div className="relative max-w-[82%] rounded-[28px] border bg-white/[0.035] border-white/[0.06] text-zinc-100 shadow-[0_12px_40px_rgba(0,0,0,0.30)] px-6 py-5 backdrop-blur-2xl">
                    <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] opacity-60">
                      <Bot size={12} />
                      Deva
                    </div>
                    <div className="flex items-center gap-1.5 py-2">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/90" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/90" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/90" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(message);
                    }
                  }}
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
          </div>
        </div>
      </div>
    </div>
  );
}