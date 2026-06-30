"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getDevaApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Cpu,
  Shield,
  Activity,
  DollarSign,
  Key,
  Database,
  Search,
  BookOpen,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon,
  HelpCircle,
  Eye,
  EyeOff
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "deva";
  content: string;
  activeNode?: string;
  elapsed?: number;
  ttft?: number;
  steps?: number;
  toolCalls?: number;
  provider?: string;
  citations?: { title: string; url: string }[];
  toolsLog?: string[];
}

interface TypewriterTextProps {
  text: string;
  isStreaming: boolean;
}

function TypewriterText({ text, isStreaming }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (isStreaming) {
      setDisplayedText(text);
      return;
    }

    const words = text.split(" ");
    let index = 0;
    setDisplayedText("");

    const timer = setInterval(() => {
      if (index < words.length) {
        setDisplayedText(prev => prev + (prev ? " " : "") + words[index]);
        index++;
      } else {
        clearInterval(timer);
      }
    }, 20); // 20ms per word

    return () => clearInterval(timer);
  }, [text, isStreaming]);

  return <span>{displayedText}</span>;
}

export default function DevaWorkspace() {
  const router = useRouter();
  const devaApiUrl = getDevaApiUrl();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'chat' | 'usage' | 'settings'
  const [activeTab, setActiveTab] = useState<'chat' | 'usage' | 'settings'>('chat');

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "deva",
      content: "Hello! I am Deva, your dedicated AI cold outreach agent. I coordinate between lead generation, market research, template building, and campaign scheduling. What targeting target can we plan today?",
      activeNode: "general_agent"
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [threadId] = useState(() => `deva_thread_${uuidv4()}`);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Real-time telemetry metrics
  const [activeNode, setActiveNode] = useState<string>("general_agent");
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [ttft, setTtft] = useState<number>(0);
  const [stepsCount, setStepsCount] = useState<number>(0);
  const [toolCallsCount, setToolCallsCount] = useState<number>(0);
  const [liveToolsLog, setLiveToolsLog] = useState<string[]>([]);
  const [currentCitations, setCurrentCitations] = useState<{ title: string; url: string }[]>([]);

  // Key configurations settings state
  const [keysForm, setKeysForm] = useState({
    gemini_key: "",
    groq_key: "",
    openrouter_key: "",
    tavily_key: ""
  });
  const [keysConfigured, setKeysConfigured] = useState({
    has_gemini: false,
    has_groq: false,
    has_openrouter: false,
    has_tavily: false
  });
  const [savingKeys, setSavingKeys] = useState(false);
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    groq: false,
    openrouter: false,
    tavily: false
  });

  // Usage panel statistics state
  const [totalSpend, setTotalSpend] = useState<number>(0.0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [costsBreakdown, setCostsBreakdown] = useState<any[]>([]);
  const [costsDailyStats, setCostsDailyStats] = useState<any[]>([]);

  // Enhanced telemetry and graph state
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [latestMsgId, setLatestMsgId] = useState<string | null>(null);
  
  const [prevActiveNode, setPrevActiveNode] = useState<string | null>(null);
  const [currentActiveNode, setCurrentActiveNode] = useState<string>("general_agent");

  useEffect(() => {
    if (activeNode !== currentActiveNode) {
      setPrevActiveNode(currentActiveNode);
      setCurrentActiveNode(activeNode);
    }
  }, [activeNode, currentActiveNode]);

  // Helper uuid generator
  function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
  }

  // Fetch API configured status
  const fetchAPIKeysStatus = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${devaApiUrl}/api/v1/deva/keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKeysConfigured(data);
      }
    } catch (err) {
      console.error("Failed to load api keys configured status:", err);
    }
  }, [devaApiUrl]);

  // Fetch usage & financial cost records
  const fetchUsageStats = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${devaApiUrl}/api/v1/deva/costs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTotalSpend(data.total_spend_usd);
          setTotalTokens(data.total_tokens_served);
          setCostsBreakdown(data.breakdown || []);
          setCostsDailyStats(data.daily_stats || []);
          setRecentLogs(data.recent_logs || []);
        }
      }
    } catch (err) {
      console.error("Failed to load cost statistics:", err);
    }
  }, [devaApiUrl]);

  // Auth setup hook
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSession(session);
        fetchAPIKeysStatus(session.access_token);
        fetchUsageStats(session.access_token);
        setLoading(false);
      }
    });
  }, [fetchAPIKeysStatus, fetchUsageStats, router]);

  // Auto scroll hook
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveToolsLog]);

  // Send message streaming turn
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !session || streaming) return;

    const userMessageText = inputMsg;
    setInputMsg("");
    setLiveToolsLog([]);
    setCurrentCitations([]);

    // Add user message locally
    const userMsgId = `msg_${uuidv4()}`;
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: userMessageText }
    ]);

    // Initial message holder for Deva
    const devaMsgId = `msg_${uuidv4()}`;
    setLatestMsgId(devaMsgId);
    setMessages(prev => [
      ...prev,
      {
        id: devaMsgId,
        role: "deva",
        content: "🧠 Activating multi-agent mesh sequence...",
        activeNode: "supervisor"
      }
    ]);

    try {
      setStreaming(true);
      const res = await fetch(`${devaApiUrl}/api/v1/deva/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: userMessageText,
          thread_id: threadId
        })
      });

      if (!res.body) {
        setMessages(prev =>
          prev.map(m =>
            m.id === devaMsgId
              ? { ...m, content: "⚠️ System error: Empty response stream." }
              : m
          )
        );
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let responseText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.type === "token") {
                if (responseText === "") {
                  responseText = data.content;
                } else {
                  responseText += data.content;
                }
                setMessages(prev =>
                  prev.map(m =>
                    m.id === devaMsgId
                      ? { ...m, content: responseText }
                      : m
                  )
                );
              } else if (data.type === "metadata") {
                setActiveNode(data.active_node);
                setMessages(prev =>
                  prev.map(m =>
                    m.id === devaMsgId
                      ? { ...m, activeNode: data.active_node }
                      : m
                  )
                );
              } else if (data.type === "node_start") {
                setActiveNode(data.node_name);
                setStepsCount(prev => prev + 1);
              } else if (data.type === "tool_start") {
                setToolCallsCount(prev => prev + 1);
                setLiveToolsLog(prev => [
                  ...prev,
                  `[${data.tool_name}] starting check: ${data.query}`
                ]);
              } else if (data.type === "tool_end") {
                setLiveToolsLog(prev => [
                  ...prev,
                  `[${data.tool_name}] executed successfully.`
                ]);
                if (data.urls && data.urls.length > 0) {
                  setCurrentCitations(prev => [...prev, ...data.urls]);
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === devaMsgId
                        ? {
                            ...m,
                            citations: [
                              ...(m.citations || []),
                              ...data.urls
                            ]
                          }
                        : m
                    )
                  );
                }
              } else if (data.type === "final_stats") {
                setElapsedTime(data.elapsed);
                setTtft(data.ttft);
                setStepsCount(data.steps);
                setToolCallsCount(data.tool_calls);
                setMessages(prev =>
                  prev.map(m =>
                    m.id === devaMsgId
                      ? {
                          ...m,
                          elapsed: data.elapsed,
                          ttft: data.ttft,
                          steps: data.steps,
                          toolCalls: data.tool_calls
                        }
                      : m
                  )
                );
                // Refresh billing stats
                fetchUsageStats(session.access_token);
              } else if (data.type === "error") {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === devaMsgId
                      ? { ...m, content: `🚨 Error: ${data.content}` }
                      : m
                  )
                );
              }
            } catch (err) {
              console.error("SSE parse error:", err);
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === devaMsgId
            ? { ...m, content: `⚠️ Failed to connect to Deva network: ${err.message}` }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  // Submit keys profile settings form
  const handleKeysSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSavingKeys(true);
    try {
      const res = await fetch(`${devaApiUrl}/api/v1/deva/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(keysForm)
      });

      if (res.ok) {
        await fetchAPIKeysStatus(session.access_token);
        setKeysForm({ gemini_key: "", groq_key: "", openrouter_key: "", tavily_key: "" });
        alert("Personal computational credentials saved successfully.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save keys.");
    } finally {
      setSavingKeys(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-cyan-400" />
          <p className="text-sm font-mono text-zinc-500">Connecting to Deva mesh...</p>
        </div>
      </div>
    );
  }

  // Calculate coordinates for custom SVG Cost graph
  const renderSVGChart = () => {
    if (costsDailyStats.length < 2) {
      return (
        <div className="h-44 flex items-center justify-center text-zinc-500 text-xs font-mono bg-white/[0.01] rounded-2xl border border-white/[0.03]">
          Awaiting API cost transactions logs...
        </div>
      );
    }

    const costs = costsDailyStats.map(d => d.cost);
    const maxCost = Math.max(...costs, 0.001);
    const chartHeight = 120;
    const chartWidth = 420;
    const points = costsDailyStats.map((item, idx) => {
      const x = (idx / (costsDailyStats.length - 1)) * chartWidth + 30;
      const y = chartHeight - (item.cost / maxCost) * chartHeight + 20;
      return { x, y, ...item };
    });

    const dPath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <svg className="w-full h-44 text-cyan-400" viewBox="0 0 480 160">
        <defs>
          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1="30" y1="20" x2="450" y2="20" stroke="white" strokeOpacity="0.03" strokeDasharray="3" />
        <line x1="30" y1="80" x2="450" y2="80" stroke="white" strokeOpacity="0.03" strokeDasharray="3" />
        <line x1="30" y1="140" x2="450" y2="140" stroke="white" strokeOpacity="0.05" />

        {/* Gradient fill */}
        <path
          d={`${dPath} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`}
          fill="url(#chartGlow)"
        />

        {/* Graph path */}
        <path d={dPath} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#050505"
              stroke="#22d3ee"
              strokeWidth="2"
              className="cursor-pointer hover:r-6 transition-all duration-100"
            />
            {idx % 2 === 0 && (
              <text x={p.x} y={155} fill="#71717a" fontSize="8" textAnchor="middle" fontFamily="monospace">
                {p.day.substring(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 lg:p-8 text-white selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/[0.05] pb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-cyan-950/40 border border-cyan-800/30 rounded-2xl flex items-center justify-center text-cyan-400">
                <Brain className="animate-pulse" size={24} />
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#050505] rounded-full"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Deva Multi-Agent Mesh
              </h1>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Active Node: <span className="text-cyan-400 font-semibold">[{activeNode.toUpperCase()}]</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl font-medium text-xs transition border ${
                activeTab === 'chat'
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/30 shadow-md shadow-cyan-900/10"
                  : "bg-white/[0.01] text-zinc-400 border-transparent hover:text-white"
              }`}
            >
              Chat Console
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`px-4 py-2 rounded-xl font-medium text-xs transition border ${
                activeTab === 'usage'
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/30 shadow-md shadow-cyan-900/10"
                  : "bg-white/[0.01] text-zinc-400 border-transparent hover:text-white"
              }`}
            >
              Usage Analytics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl font-medium text-xs transition border ${
                activeTab === 'settings'
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/30 shadow-md shadow-cyan-900/10"
                  : "bg-white/[0.01] text-zinc-400 border-transparent hover:text-white"
              }`}
            >
              API Credentials
            </button>
          </div>
        </div>

        {/* Tab contents */}
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chatTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left Chat Window */}
              <div className="lg:col-span-2 flex flex-col h-[650px] border border-white/[0.05] bg-white/[0.01] rounded-3xl overflow-hidden backdrop-blur-md relative">
                
                {/* Telemetry metrics bar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.05] bg-white/[0.02] font-mono text-[10px] text-zinc-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Cpu size={12} className="text-cyan-400" />
                      Steps: <span className="text-white font-semibold">{stepsCount}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity size={12} className="text-emerald-400" />
                      Tools Executed: <span className="text-white font-semibold">{toolCallsCount}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">TTFT: <span className="text-cyan-400 font-semibold">{ttft.toFixed(2)}s</span></span>
                    <span className="text-zinc-500">Duration: <span className="text-cyan-400 font-semibold">{elapsedTime.toFixed(2)}s</span></span>
                  </div>
                </div>

                {/* Message display grid */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 border transition-all ${
                          msg.role === "user"
                            ? "bg-cyan-950/30 text-zinc-100 border-cyan-800/30"
                            : "bg-[#0b0b0e] text-zinc-300 border-white/[0.03]"
                        }`}
                      >
                        {/* Role icon name */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                          <span>{msg.role === "user" ? "USER" : `DEVA [${(msg.activeNode || "mesh").toUpperCase()}]`}</span>
                          {msg.role === "deva" && msg.elapsed !== undefined && (
                            <span className="text-cyan-400 font-semibold">
                              {msg.elapsed.toFixed(2)}s
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.role === "deva" && msg.id === latestMsgId ? (
                            <TypewriterText text={msg.content} isStreaming={streaming} />
                          ) : (
                            msg.content
                          )}
                        </p>

                        {/* Citation cards rendering */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-2">
                            <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-1">
                              <BookOpen size={10} />
                              Verified Sources:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((c, i) => (
                                <a
                                  key={i}
                                  href={c.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-mono bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 border border-cyan-900/30 px-2 py-1 rounded-lg transition"
                                >
                                  {c.title ? c.title.substring(0, 20) : new URL(c.url).hostname}
                                  <ExternalLink size={8} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Live tool logic loader animation */}
                {streaming && liveToolsLog.length > 0 && (
                  <div className="px-6 py-2 bg-white/[0.01] border-t border-white/[0.03] space-y-1">
                    {liveToolsLog.map((log, index) => (
                      <div key={index} className="flex items-center gap-2 text-[10px] font-mono text-cyan-500">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                        </span>
                        <p className="truncate">{log}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Prompt entry */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white/[0.02] border-t border-white/[0.05] flex gap-3">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)}
                    disabled={streaming}
                    placeholder="Ask Deva to research targets, build templates, or create outreach campaign..."
                    className="flex-1 bg-[#0b0b0e] border border-white/[0.05] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition text-white placeholder-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={streaming || !inputMsg.trim()}
                    className="bg-cyan-400 hover:bg-cyan-300 text-black px-4 py-3 rounded-xl transition flex items-center justify-center disabled:opacity-30 disabled:hover:bg-cyan-400"
                  >
                    {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </div>

              {/* Right Visual Mesh Graph and details */}
              <div className="space-y-6">
                
                {/* Specialist Visual Anim */}
                <div className="rounded-3xl border border-white/[0.05] bg-white/[0.01] p-6 relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-zinc-500 tracking-widest uppercase">
                      Active Agent Node Linkage
                    </h3>
                    <button
                      onClick={() => setShowGraphModal(true)}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-mono font-medium border border-cyan-800/30 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 flex items-center gap-1 transition"
                    >
                      <Search size={10} />
                      Explore Graph
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3 font-mono text-[11px]">
                    {[
                      { id: "supervisor", name: "Master Supervisor", color: "border-purple-800/40 text-purple-400 bg-purple-950/20" },
                      { id: "general_agent", name: "Companion Node", color: "border-cyan-800/40 text-cyan-400 bg-cyan-950/20" },
                      { id: "lead_agent", name: "Lead Generation Specialist", color: "border-emerald-800/40 text-emerald-400 bg-emerald-950/20" },
                      { id: "research_agent", name: "Market Intelligence Scan", color: "border-amber-800/40 text-amber-400 bg-amber-950/20" },
                      { id: "template_agent", name: "Email Copywriter Writer", color: "border-pink-800/40 text-pink-400 bg-pink-950/20" },
                      { id: "campaign_agent", name: "Campaign Scheduler Node", color: "border-blue-800/40 text-blue-400 bg-blue-950/20" },
                      { id: "analysis_agent", name: "Analytics Engine DB Query", color: "border-rose-800/40 text-rose-400 bg-rose-950/20" }
                    ].map(node => {
                      const isActive = activeNode === node.id;
                      return (
                        <motion.div
                          key={node.id}
                          animate={{
                            scale: isActive ? 1.02 : 1.0,
                            borderColor: isActive ? "rgba(34, 211, 238, 0.4)" : "rgba(255,255,255,0.03)"
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            isActive ? "bg-cyan-950/10" : "bg-[#0b0b0e]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isActive && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                              </span>
                            )}
                            <span className="text-zinc-300 font-medium">{node.name}</span>
                          </div>
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${node.color}`}>
                            {node.id.toUpperCase()}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* System warnings box */}
                <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-yellow-500/5 to-transparent p-5">
                  <div className="flex gap-2.5">
                    <Shield size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">Active Guardrails Bindings</h4>
                      <p className="text-[10px] text-zinc-400 leading-relaxed mt-1">
                        System Level 1 Input guardrails regex block patterns and Level 3 Output credentials masking are actively scanning operations. Sensitive database information will trigger an access-deny override automatically.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'usage' && (
            <motion.div
              key="usageTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Financial metrics cards */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Cost graph grid container */}
                <div className="rounded-3xl border border-white/[0.05] bg-white/[0.01] p-6 backdrop-blur-md">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <TrendingUp size={16} className="text-cyan-400" />
                        Computational Usage Costs (USD)
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Estimated API consumption pricing trend</p>
                    </div>
                  </div>
                  
                  {renderSVGChart()}
                </div>

                {/* Tokens details list */}
                <div className="rounded-3xl border border-white/[0.05] bg-white/[0.01] p-6 backdrop-blur-md">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-1.5">
                    <Database size={16} className="text-emerald-400" />
                    API Provider Breakdown
                  </h3>

                  {costsBreakdown.length === 0 ? (
                    <p className="text-zinc-500 text-xs font-mono">No usage recorded yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {costsBreakdown.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-2xl border border-white/[0.03] bg-[#0b0b0e] space-y-2">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                            {item.provider.toUpperCase()}
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold tracking-tight text-white">{item.tokens.toLocaleString()}</span>
                            <span className="text-[10px] font-mono text-zinc-500">tokens</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.03]">
                            <span className="text-zinc-500">Cost (USD)</span>
                            <span className="text-emerald-400 font-semibold">${item.cost.toFixed(5)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Granular Cost Tracking Logs */}
                <div className="rounded-3xl border border-white/[0.05] bg-white/[0.01] p-6 backdrop-blur-md">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-1.5">
                    <Activity size={16} className="text-cyan-400" />
                    Granular Computation Logs
                  </h3>
                  
                  {recentLogs.length === 0 ? (
                    <p className="text-zinc-500 text-xs font-mono">No computation logs found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[10px] md:text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.05] text-zinc-500">
                            <th className="pb-3 font-semibold">Timestamp</th>
                            <th className="pb-3 font-semibold">API Provider</th>
                            <th className="pb-3 font-semibold text-right">Tokens</th>
                            <th className="pb-3 font-semibold text-right">Latency</th>
                            <th className="pb-3 font-semibold text-right">Cost (USD)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {recentLogs.map((log, idx) => {
                            const date = new Date(log.timestamp);
                            const formattedDate = date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            });
                            return (
                              <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                                <td className="py-3 text-zinc-400">{formattedDate}</td>
                                <td className="py-3 text-zinc-300 font-semibold">{log.provider}</td>
                                <td className="py-3 text-right text-zinc-300">{(log.tokens).toLocaleString()}</td>
                                <td className="py-3 text-right text-zinc-400">{(log.duration / 1000).toFixed(2)}s</td>
                                <td className="py-3 text-right text-emerald-400 font-semibold">${log.cost.toFixed(5)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Total Session Spend metrics columns */}
              <div className="space-y-6">
                
                <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-cyan-950/20 to-[#0b0b0e] p-6 text-center space-y-3 relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-400/5 rounded-full blur-2xl"></div>
                  
                  <div className="w-10 h-10 bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 rounded-xl flex items-center justify-center mx-auto">
                    <DollarSign size={20} />
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
                      Cumulative Session Spend
                    </span>
                    <h2 className="text-4xl font-extrabold tracking-tight text-white">
                      ${totalSpend.toFixed(5)}
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-[200px] mx-auto leading-relaxed">
                    Accumulated budget footprint calculated via FallbackLLM cost rates.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/[0.05] bg-[#0b0b0e] p-6 space-y-4">
                  <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                    Session Accumulations
                  </h3>
                  
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Total Tokens</span>
                      <span className="text-white font-medium">{totalTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Active Mesh Nodes</span>
                      <span className="text-white font-medium">7 Mesh specialists</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Failover Gateways</span>
                      <span className="text-emerald-400 font-medium">Active (Groq 1st)</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settingsTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Form Input fields */}
              <div className="lg:col-span-2 rounded-3xl border border-white/[0.05] bg-white/[0.01] p-6 backdrop-blur-md">
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Key size={16} className="text-cyan-400" />
                    Personal API Computations Credentials
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Submit your personal credentials. Deva will inject them decrypting dynamically to power operations.
                  </p>
                </div>

                <form onSubmit={handleKeysSubmit} className="space-y-5">
                  {[
                    { id: "groq_key", label: "Groq API Key (Llama 3.3-70b)", env: "groq", help: "Starts with gsk_..." },
                    { id: "gemini_key", label: "Gemini API Key (Gemini 2.5-flash)", env: "gemini", help: "AIzaSy..." },
                    { id: "openrouter_key", label: "OpenRouter API Key (GPT-4o-mini)", env: "openrouter", help: "sk-or-v1-..." },
                    { id: "tavily_key", label: "Tavily Search API Key", env: "tavily", help: "tvly-..." }
                  ].map(field => {
                    const isConfigured = (keysConfigured as any)[`has_${field.env}`];
                    const isVisible = (showKeys as any)[field.env];
                    return (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-zinc-300">{field.label}</label>
                          {isConfigured && (
                            <span className="text-[9px] font-mono font-semibold tracking-wider text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-full uppercase">
                              Active in Crypt Vault
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type={isVisible ? "text" : "password"}
                            value={(keysForm as any)[field.id]}
                            onChange={e =>
                              setKeysForm(prev => ({ ...prev, [field.id]: e.target.value }))
                            }
                            placeholder={isConfigured ? "••••••••••••••••••••••••••••••••" : field.help}
                            className="w-full bg-[#0b0b0e] border border-white/[0.05] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500/50 transition text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowKeys(prev => ({ ...prev, [field.env]: !(prev as any)[field.env] }))
                            }
                            className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-white"
                          >
                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="submit"
                    disabled={savingKeys}
                    className="w-full flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs py-3.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-cyan-400/5 disabled:opacity-50"
                  >
                    {savingKeys ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Encrypting and Committing Vault...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Commit API Credentials to Vault
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Secure Info columns */}
              <div className="space-y-6">
                
                <div className="rounded-3xl border border-white/[0.05] bg-[#0b0b0e] p-6 space-y-4">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Shield size={14} className="text-cyan-400" />
                    Vault Cryptography details
                  </h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Credentials submitted above are secured via AES-256 (Fernet) cryptographic frameworks matching industrial regulatory standards.
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    The backend router decrypts matching user credential records dynamically inside standard memory segments on model invokes, completely keeping your computation keys private.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-cyan-950/20 to-[#0b0b0e] p-6 space-y-3">
                  <h4 className="text-xs font-semibold text-white">Default computational footprint</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    If personal key fields are left empty, Deva will default usage billing to the platform's active keys environment configurations automatically.
                  </p>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Symmetrical LangGraph Mesh Visualizer Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0b0e] border border-white/[0.08] w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col h-[85vh] shadow-2xl relative">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Brain className="text-cyan-400" size={20} />
                  Deva Multi-Agent Mesh Topology
                </h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Interactive visualization of LangGraph execution architecture
                </p>
              </div>
              <button
                onClick={() => setShowGraphModal(false)}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-medium transition"
              >
                Close Visualization
              </button>
            </div>

            {/* Graphic Display Area */}
            <div className="flex-1 bg-[#050505] p-6 relative flex items-center justify-center overflow-auto select-none">
              <svg className="w-full max-w-4xl h-full min-h-[450px]" viewBox="0 0 820 500">
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                
                {/* Edges layer */}
                {(() => {
                  const nodePositions: Record<string, { x: number; y: number; label: string; color: string; desc: string }> = {
                    START: { x: 70, y: 250, label: "START", color: "#a1a1aa", desc: "Entry point" },
                    supervisor: { x: 200, y: 250, label: "Master Supervisor", color: "#c084fc", desc: "Mesh Routing Manager" },
                    general_agent: { x: 420, y: 70, label: "Companion Node", color: "#22d3ee", desc: "Greetings, onboarding" },
                    lead_agent: { x: 420, y: 140, label: "Lead Gen Specialist", color: "#34d399", desc: "Leads building/cleaning" },
                    research_agent: { x: 420, y: 210, label: "Web Intelligence", color: "#fbbf24", desc: "Web fact-check lookup" },
                    template_agent: { x: 420, y: 280, label: "Template Copywriter", color: "#f472b6", desc: "Construct email copy" },
                    campaign_agent: { x: 420, y: 350, label: "Campaign Scheduler", color: "#60a5fa", desc: "Scheduling outreach launch" },
                    analysis_agent: { x: 420, y: 420, label: "Analytics Engine", color: "#f87171", desc: "Statistics database query" },
                    execute_tools: { x: 630, y: 250, label: "Execute Tools", color: "#fb7185", desc: "Tool execution context" },
                    END: { x: 750, y: 250, label: "END", color: "#a1a1aa", desc: "Execution finalized" }
                  };

                  const edges = [
                    { from: "START", to: "supervisor" },
                    { from: "supervisor", to: "general_agent" },
                    { from: "supervisor", to: "lead_agent" },
                    { from: "supervisor", to: "research_agent" },
                    { from: "supervisor", to: "template_agent" },
                    { from: "supervisor", to: "campaign_agent" },
                    { from: "supervisor", to: "analysis_agent" },
                    { from: "supervisor", to: "END" },
                    
                    { from: "general_agent", to: "execute_tools" },
                    { from: "lead_agent", to: "execute_tools" },
                    { from: "research_agent", to: "execute_tools" },
                    { from: "template_agent", to: "execute_tools" },
                    { from: "analysis_agent", to: "execute_tools" },
                    { from: "campaign_agent", to: "execute_tools" },
                    
                    { from: "general_agent", to: "supervisor" },
                    { from: "lead_agent", to: "supervisor" },
                    { from: "research_agent", to: "supervisor" },
                    { from: "template_agent", to: "supervisor" },
                    { from: "analysis_agent", to: "supervisor" },
                    { from: "campaign_agent", to: "supervisor" },
                    
                    { from: "general_agent", to: "END" },
                    { from: "lead_agent", to: "END" },
                    { from: "research_agent", to: "END" },
                    { from: "template_agent", to: "END" },
                    { from: "analysis_agent", to: "END" },
                    { from: "campaign_agent", to: "END" },
                    
                    { from: "execute_tools", to: "lead_agent" },
                    { from: "execute_tools", to: "research_agent" },
                    { from: "execute_tools", to: "template_agent" },
                    { from: "execute_tools", to: "campaign_agent" },
                    { from: "execute_tools", to: "analysis_agent" },
                    { from: "execute_tools", to: "supervisor" }
                  ];

                  const getCurvePath = (startX: number, startY: number, endX: number, endY: number) => {
                    const midX = (startX + endX) / 2;
                    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
                  };

                  return (
                    <>
                      {/* Lines */}
                      {edges.map((edge, idx) => {
                        const fromNode = nodePositions[edge.from];
                        const toNode = nodePositions[edge.to];
                        if (!fromNode || !toNode) return null;
                        
                        const isTransition = prevActiveNode === edge.from && currentActiveNode === edge.to;
                        const isActiveEdge = activeNode === edge.from || activeNode === edge.to;
                        const pathString = getCurvePath(fromNode.x, fromNode.y, toNode.x, toNode.y);
                        
                        return (
                          <g key={idx}>
                            <path
                              d={pathString}
                              fill="none"
                              stroke={isTransition ? "#22d3ee" : isActiveEdge ? fromNode.color : "white"}
                              strokeWidth={isTransition ? 2.2 : isActiveEdge ? 1.4 : 0.8}
                              strokeOpacity={isTransition ? 0.85 : isActiveEdge ? 0.25 : 0.04}
                              className="transition-all duration-300"
                            />
                            {isTransition && (
                              <>
                                <path
                                  d={pathString}
                                  fill="none"
                                  stroke="#22d3ee"
                                  strokeWidth={4}
                                  strokeOpacity={0.4}
                                  filter="url(#glow)"
                                />
                                <circle r="4" fill="#22d3ee" filter="url(#glow)">
                                  <animateMotion dur="1.2s" repeatCount="indefinite" path={pathString} />
                                </circle>
                              </>
                            )}
                          </g>
                        );
                      })}

                      {/* Nodes */}
                      {Object.entries(nodePositions).map(([id, node]) => {
                        const isActive = activeNode === id;
                        const isSupervisorOrTools = id === "supervisor" || id === "execute_tools";
                        
                        return (
                          <g key={id} className="transition-all duration-300">
                            {isActive && (
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r={isSupervisorOrTools ? 38 : 30}
                                fill="none"
                                stroke={node.color}
                                strokeWidth={2}
                                strokeOpacity={0.6}
                                className="animate-pulse"
                              />
                            )}
                            
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={isSupervisorOrTools ? 30 : 22}
                              fill="#0b0b0e"
                              stroke={isActive ? node.color : "white"}
                              strokeWidth={isActive ? 2 : 1}
                              strokeOpacity={isActive ? 0.9 : 0.08}
                            />

                            {isActive && (
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r="5"
                                fill={node.color}
                                filter="url(#glow)"
                              />
                            )}

                            <text
                              x={node.x}
                              y={isSupervisorOrTools ? node.y + 45 : node.y + 36}
                              fill={isActive ? "white" : "#71717a"}
                              fontSize="9"
                              fontWeight={isActive ? "bold" : "normal"}
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
                              {node.label}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.05] bg-white/[0.02] flex items-center justify-between text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>Active Agent: <strong className="text-white">{activeNode.toUpperCase()}</strong></span>
              </div>
              <div>
                <span>OutreachX Deva Engine v2.0.0</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
);
}
