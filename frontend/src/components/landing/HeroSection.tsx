"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, CheckCircle, PlayCircle, Send, Sparkles, Database, Mail, TrendingUp, Users, ShieldCheck } from "lucide-react";

export default function HeroSection() {
  const words = ["Find leads.", "Generate outreach.", "Create campaigns.", "Manage assets.", "Track replies."];
  const [wordIdx, setWordIdx] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMockTab, setActiveMockTab] = useState<"overview" | "leads" | "campaign">("overview");

  // Mock Data states for interactive dashboard
  const [leadsCount, setLeadsCount] = useState(247);
  const [emailsSent, setEmailsSent] = useState(347);
  const [replies, setReplies] = useState(42);

  // Typing effect logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fullWord = words[wordIdx];

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentWord((prev) => prev.slice(0, -1));
      }, 50);
    } else {
      timer = setTimeout(() => {
        setCurrentWord((prev) => fullWord.slice(0, prev.length + 1));
      }, 100);
    }

    if (!isDeleting && currentWord === fullWord) {
      timer = setTimeout(() => setIsDeleting(true), 1500);
    } else if (isDeleting && currentWord === "") {
      setIsDeleting(false);
      setWordIdx((prev) => (prev + 1) % words.length);
    }

    return () => clearTimeout(timer);
  }, [currentWord, isDeleting, wordIdx]);

  return (
    <header className="relative bg-zinc-950 pt-20 pb-32 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-950/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] bg-indigo-950/20 blur-[150px] rounded-full pointer-events-none" />

      {/* Grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* LEFT SIDE CONTENT */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">

            {/* Title / Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="heading-font text-3xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
            >
              OutreachX is an <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-200 to-white">
                AI Operating System
              </span>{" "}
              <br />
              for Outreach.
            </motion.h1>

            {/* Typing Prompt Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center gap-x-2 text-xl font-medium text-zinc-300 h-10 mb-6 bg-zinc-900/40 border border-zinc-800/50 px-4 py-2 rounded-xl"
            >
              <span className="text-cyan-400 font-semibold">Deva, please:</span>
              <span className="text-white border-r-2 border-cyan-400 pr-1 animate-pulse font-mono">
                {currentWord}
              </span>
            </motion.div>

            {/* Call To Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap gap-4 w-full sm:w-auto"
            >
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-5 bg-white text-zinc-950 text-base font-semibold rounded-2xl flex items-center justify-center gap-x-3 hover:bg-cyan-400 hover:text-white transition-all duration-300 hover:scale-102 shadow-xl shadow-cyan-500/10 hover:shadow-cyan-500/25"
              >
                <Send size={20} />
                Start Your First Campaign
                <ArrowRight size={18} />
              </Link>
              <a
                href="#deva"
                className="w-full sm:w-auto px-8 py-5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 rounded-2xl flex items-center justify-center gap-x-3 text-zinc-300 hover:text-white transition-all duration-300 hover:scale-102"
              >
                <PlayCircle size={20} className="text-cyan-400" />
                Meet Deva AI
              </a>
            </motion.div>

            {/* Trust Badging */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-wrap gap-y-4 gap-x-8 mt-12 text-sm border-t border-zinc-900 pt-8 w-full"
            >
              <div className="flex items-center gap-x-2">
                <Lock className="text-cyan-400" size={16} />
                <div>
                  <div className="font-semibold text-zinc-300">OAuth + AES-256 Encrypted</div>
                  <div className="text-zinc-500 text-xs">Zero credential leakage risk</div>
                </div>
              </div>
              <div className="h-8 w-px bg-zinc-900 hidden sm:block"></div>
              <div className="flex items-center gap-x-2">
                <CheckCircle className="text-emerald-400" size={16} />
                <div>
                  <div className="font-semibold text-zinc-300">Safe Send & Rate Limits</div>
                  <div className="text-zinc-500 text-xs">Respected sending jitter</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT SIDE LARGE INTERACTIVE DASHBOARD */}
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="lg:col-span-6 relative w-full"
          >
            {/* Dashboard border glow container */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-indigo-500/20 blur-3xl rounded-[32px] pointer-events-none" />

            <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-[28px] overflow-hidden shadow-2xl">
              {/* Top Window Bar */}
              <div className="bg-zinc-950/60 border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-4 text-xs font-mono text-zinc-500">app.outreachx.ai / dashboard</span>
                </div>
                <div className="flex items-center gap-x-2 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] text-zinc-400 font-mono font-medium">Deva Active</span>
                </div>
              </div>

              {/* Sub-Header Tabs */}
              <div className="flex bg-zinc-950/20 border-b border-zinc-900">
                <button
                  onClick={() => setActiveMockTab("overview")}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all ${activeMockTab === "overview"
                    ? "border-cyan-400 text-white bg-zinc-900/20"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  Campaign Overview
                </button>
                <button
                  onClick={() => setActiveMockTab("leads")}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all ${activeMockTab === "leads"
                    ? "border-cyan-400 text-white bg-zinc-900/20"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  Live Lead Verified
                </button>
                <button
                  onClick={() => setActiveMockTab("campaign")}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all ${activeMockTab === "campaign"
                    ? "border-cyan-400 text-white bg-zinc-900/20"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  Active Campaign
                </button>
              </div>

              {/* Mock Dashboard Screens */}
              <div className="p-6 min-h-[340px]">
                <AnimatePresence mode="wait">
                  {/* OVERVIEW TAB */}
                  {activeMockTab === "overview" && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Dashboard KPI grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700/60 transition-colors">
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Emails Sent</div>
                          <div className="text-2xl font-bold text-white font-mono">{emailsSent}</div>
                          <div className="text-[9px] text-emerald-400 mt-1 flex items-center gap-0.5">
                            <TrendingUp size={10} /> +12% vs yesterday
                          </div>
                        </div>
                        <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700/60 transition-colors">
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Open Rate</div>
                          <div className="text-2xl font-bold text-cyan-400 font-mono">68.4%</div>
                          <div className="text-[9px] text-zinc-500 mt-1">AI Personalized</div>
                        </div>
                        <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700/60 transition-colors">
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Replies</div>
                          <div className="text-2xl font-bold text-emerald-400 font-mono">{replies}</div>
                          <div className="text-[9px] text-emerald-400 mt-1">12.1% Reply rate</div>
                        </div>
                      </div>

                      {/* Mock Chart Area */}
                      <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/60">
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-xs font-semibold text-zinc-400 flex items-center gap-x-1.5">
                            <Mail size={12} className="text-cyan-400" /> Hourly Delivery Queue (Mimicking Human Jitter)
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">Safe limits respected: 50 / hr</div>
                        </div>
                        <div className="h-28 flex items-end justify-between gap-x-2 pt-2 px-1">
                          {[32, 45, 18, 29, 41, 50, 24, 38, 42, 15, 30, 48].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-y-1.5">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 1, delay: i * 0.05 }}
                                className={`w-full rounded-t-sm transition-colors ${h === 50 ? "bg-cyan-500" : "bg-cyan-500/40 hover:bg-cyan-500/80"
                                  }`}
                                style={{ minHeight: "4px" }}
                              />
                              <span className="text-[8px] text-zinc-600 font-mono">{i + 8}h</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* LEADS TAB */}
                  {activeMockTab === "leads" && (
                    <motion.div
                      key="leads"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold">
                        <span className="flex items-center gap-x-1"><Database size={12} className="text-cyan-400" /> Lead List: "AI Founders"</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-2 py-0.5 rounded">Verification Active</span>
                      </div>

                      <div className="space-y-2.5 max-h-[260px] overflow-hidden">
                        {[
                          { name: "Siddharth Mehta", role: "CTO", company: "Cyberlabs", mail: "siddharth@cyberlabs.ai", status: "Verified", color: "text-emerald-400" },
                          { name: "Clara Becker", role: "Founder", company: "Voxel AI", mail: "c.becker@voxel.de", status: "Verified", color: "text-emerald-400" },
                          { name: "Jason Wright", role: "VP Growth", company: "Linear Tech", mail: "jason@linear.co", status: "Verified", color: "text-emerald-400" },
                          { name: "Meera Nair", role: "Head of Product", company: "FlowGen", mail: "meera.nair@flowgen.io", status: "Checking", color: "text-amber-400" },
                        ].map((lead, i) => (
                          <div key={i} className="flex items-center justify-between bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/80 text-xs">
                            <div className="flex items-center gap-x-3">
                              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 uppercase">
                                {lead.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{lead.name}</div>
                                <div className="text-[10px] text-zinc-500">{lead.role} at {lead.company}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-[10px] text-zinc-400">{lead.mail}</div>
                              <div className={`text-[10px] font-semibold mt-0.5 flex items-center justify-end gap-x-1 ${lead.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${lead.status === "Verified" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                                {lead.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* CAMPAIGN ACTIVE TAB */}
                  {activeMockTab === "campaign" && (
                    <motion.div
                      key="campaign"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-zinc-400">Campaign sequence details</span>
                        <span className="text-zinc-500 text-[10px]">OAuth Gmail: active</span>
                      </div>

                      <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 space-y-4">
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-900">
                          <div className="font-semibold text-white">Step 1: AI Cold Email</div>
                          <div className="text-[10px] text-zinc-500">Wait: Instant (with Jitter)</div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[10px] font-mono text-zinc-500">Subject: React & AI Experience Inquiry — OutreachX</div>
                          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 text-[11px] text-zinc-300 font-mono leading-relaxed relative overflow-hidden">
                            <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] bg-gradient-to-r from-cyan-400/20 to-indigo-500/20 border border-cyan-400/30 text-cyan-300 px-2 py-0.5 rounded-full">
                              <Sparkles size={8} /> AI Generated
                            </div>
                            Hi Priya,<br /><br />
                            I saw your recent work scaling React platforms at Zomato. We're launching an outreach optimization engine and thought your tech stack insight...
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                          <div className="flex items-center gap-1">
                            <Lock size={12} className="text-cyan-400" /> Zero Password exposure OAuth2 active.
                          </div>
                          <div>Deliverability: 99.1%</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Console Logging Panel */}
              <div className="bg-zinc-950 px-6 py-3 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                <div className="flex items-center gap-x-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  <span>Deva Engine: Analyzing reply sentiment (42 replies parsed)</span>
                </div>
                <div className="flex gap-x-4">
                  <span className="hover:text-zinc-300 cursor-pointer" onClick={() => { setEmailsSent(prev => prev + 1); setReplies(prev => prev + 1); }}>+ Send Test</span>
                  <span className="hover:text-zinc-300 cursor-pointer" onClick={() => setLeadsCount(prev => prev + 1)}>+ Add Lead</span>
                </div>
              </div>
            </div>

            {/* Glowing Tag */}
            <motion.div
              initial={{ rotate: 12, scale: 0 }}
              animate={{ rotate: 12, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.8 }}
              className="absolute -top-6 -right-6 bg-gradient-to-r from-cyan-400 to-indigo-500 text-zinc-950 text-[11px] font-extrabold px-6 py-2.5 rounded-full flex items-center gap-x-2 shadow-2xl z-20 border border-white/20 select-none cursor-default"
            >
              <Sparkles size={14} className="fill-zinc-950" />
              AI-PERSONALIZED IN 0.8s
            </motion.div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
