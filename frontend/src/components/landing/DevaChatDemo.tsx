"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Send, Sparkles, Terminal, CheckCircle2 } from "lucide-react";

interface Message {
  sender: "user" | "deva";
  text: string;
  logs?: string[];
  options?: string[];
}

export default function DevaChatDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "deva",
      text: "Hello! I am Deva, your outreach agent. How can I help you configure your campaigns today? Select a prompt below to see me in action.",
      options: ["Find AI startups in Germany", "Build my campaign templates", "Confirm SMTP ownership"]
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom without scrolling the whole page
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping, activeLogs]);

  const handleOptionClick = (option: string) => {
    // Add user message
    const userMsg: Message = { sender: "user", text: option };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setActiveLogs([]);

    // Simulate Agent execution sequence
    if (option.includes("Germany")) {
      simulateGermanyStartupsFlow();
    } else if (option.includes("templates")) {
      simulateTemplateFlow();
    } else {
      simulateSmtpFlow();
    }
  };

  const simulateGermanyStartupsFlow = () => {
    const logs = [
      "[Master Agent] Interpreting intent: 'Find AI startups in Germany'",
      "[Targeting Agent] Loading geolocation filters: Country=Germany",
      "[Data Agent] Initiating web search & scraping active directories...",
      "[Data Agent] Found 247 candidate companies matching filters.",
      "[Verification Agent] Running syntax and SMTP mailbox check... 241/247 verified."
    ];

    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < logs.length) {
        setActiveLogs((prev) => [...prev, logs[logIdx]]);
        logIdx++;
      } else {
        clearInterval(logInterval);
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: "deva",
            text: "Found 247 AI startups in Germany (241 verified emails). Would you like me to build a campaign and write hyper-personalized templates for them?",
            options: ["Yes, generate personalized emails", "No, just export the lead list"]
          }
        ]);
      }
    }, 800);
  };

  const simulateTemplateFlow = () => {
    const logs = [
      "[Master Agent] Interpreting: 'Build my campaign templates'",
      "[Template Agent] Fetching company portfolio context...",
      "[Personalization Agent] Compiling AI writing rules (Tone: Professional, Goal: Meeting Booking)",
      "[Personalization Agent] Generating subject lines & draft variations..."
    ];

    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < logs.length) {
        setActiveLogs((prev) => [...prev, logs[logIdx]]);
        logIdx++;
      } else {
        clearInterval(logInterval);
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: "deva",
            text: "Campaign created. I have generated subject lines and written personalized body drafts for all leads. Ready for your review & approval in the dashboard.",
            options: ["Launch campaign now", "Show campaign details"]
          }
        ]);
      }
    }, 800);
  };

  const simulateSmtpFlow = () => {
    const logs = [
      "[Master Agent] Interpreting: 'Confirm SMTP ownership'",
      "[Security Agent] Pulling encrypted SMTP credentials...",
      "[Verification Agent] Sending secure challenge OTP pin...",
      "[Verification Agent] challenge success: 10-digit IMAP code verified."
    ];

    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < logs.length) {
        setActiveLogs((prev) => [...prev, logs[logIdx]]);
        logIdx++;
      } else {
        clearInterval(logInterval);
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: "deva",
            text: "SMTP/IMAP inbox connection validated. Safety send limits set to 50 emails/hour with a 45-second jitter delay configured.",
            options: ["Run deliverability check", "Return to main menu"]
          }
        ]);
      }
    }, 800);
  };

  return (
    <section className="bg-zinc-950 py-24 relative" id="chat-demo">
      {/* Visual glowing border backdrop */}
      <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-indigo-900/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles size={12} className="fill-cyan-400" /> LIVE SIMULATION
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Chat with Deva AI
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto">
            Interact with the simulated dialogue widget below to experience how Deva orchestrates outreach and lead verification.
          </p>
        </div>

        {/* CHAT INTERFACE WINDOW */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Top Bar */}
          <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-cyan-400/20 blur-sm rounded-2xl" />
                <Bot className="text-cyan-400 relative z-10" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Deva AI Agent</h3>
                <p className="text-[10px] text-zinc-500 font-mono">Status: Connected / Listening</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              <Terminal size={12} className="text-cyan-400" />
              <span>Multi-Agent Mode</span>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollContainerRef} className="p-6 h-[400px] overflow-y-auto space-y-6 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex gap-x-3 max-w-[85%]">
                  {msg.sender === "deva" && (
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-cyan-400" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                      msg.sender === "user"
                        ? "bg-zinc-100 text-zinc-900 border-zinc-200 rounded-tr-none font-medium"
                        : "bg-zinc-900/80 text-zinc-200 border-zinc-850 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>

                    {/* Rendering action triggers/options */}
                    {msg.options && msg.options.length > 0 && msg.sender === "deva" && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {msg.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => handleOptionClick(opt)}
                            className="text-xs bg-zinc-950 hover:bg-cyan-950/40 hover:text-cyan-300 hover:border-cyan-500/40 text-zinc-300 px-4 py-2.5 rounded-full border border-zinc-800/80 transition-all font-medium duration-300 cursor-pointer shadow-sm shadow-black/5 flex items-center gap-1"
                          >
                            <Sparkles size={10} className="text-cyan-400" /> {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.sender === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <User size={16} className="text-zinc-300" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Simulated log console + typing state */}
            {isTyping && (
              <div className="space-y-4">
                {/* Simulated Log Output */}
                {activeLogs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl font-mono text-[10px] text-zinc-500 space-y-1 max-w-[85%] ml-11 shadow-inner"
                  >
                    {activeLogs.map((log, lIdx) => (
                      <div key={lIdx} className="flex items-start gap-1">
                        <span className="text-cyan-500">&gt;</span>
                        <span className="leading-normal">{log}</span>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Deva typing bubble */}
                <div className="flex gap-x-3 items-center ml-1">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-cyan-400" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-850 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-x-1.5">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Bottom simulated input bar */}
          <div className="bg-zinc-950 border-t border-zinc-900 px-6 py-4 flex items-center justify-between text-zinc-600 text-xs">
            <span>Select options above to chat</span>
            <div className="flex items-center gap-x-2 text-zinc-500">
              <CheckCircle2 size={12} className="text-cyan-400" />
              <span>Deva Core v1.4 active</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
