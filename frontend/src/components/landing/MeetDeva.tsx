"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Cpu, ShieldCheck, Database, Search, Edit3, Type, Paperclip, Send, Activity, Sparkles } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  role: string;
  desc: string;
  icon: any;
  coordinates: { x: number; y: number };
}

export default function MeetDeva() {
  const [selectedAgent, setSelectedAgent] = useState<string>("master");

  const agents: Agent[] = [
    {
      id: "master",
      name: "Master Agent",
      role: "The Brain & Orchestrator",
      desc: "Interprets user instructions (e.g., 'Find AI founders in Berlin'), creates the action blueprint, and orchestrates subordinate agents to carry it out.",
      icon: <Bot className="text-cyan-400" size={24} />,
      coordinates: { x: 50, y: 50 } // Center node
    },
    {
      id: "security",
      name: "Security Agent",
      role: "Trust & Encrypted Storage",
      desc: "Manages AES-256 server-side encryption/decryption of SMTP configurations. Handles secure OAuth checks so raw credentials are never exposed.",
      icon: <ShieldCheck className="text-emerald-400" size={18} />,
      coordinates: { x: 50, y: 15 } // Top
    },
    {
      id: "data",
      name: "Data Agent",
      role: "Lead Harvester & CSV Parser",
      desc: "Processes list file uploads, normalizes columns, and commands browser extension scrapers to extract contact data securely.",
      icon: <Database className="text-indigo-400" size={18} />,
      coordinates: { x: 80, y: 25 } // Top-Right
    },
    {
      id: "targeting",
      name: "Targeting Agent",
      role: "Audience Optimizer",
      desc: "Applies filters for location, company size, and industry, ensuring campaigns focus solely on high-value decision-makers.",
      icon: <Search className="text-purple-400" size={18} />,
      coordinates: { x: 85, y: 50 } // Right
    },
    {
      id: "template",
      name: "Template Agent",
      role: "AI Template Designer",
      desc: "Generates high-conversion email layouts, writes catchy subject lines, and designs structural templates tailored for your goal.",
      icon: <Edit3 className="text-pink-400" size={18} />,
      coordinates: { x: 80, y: 75 } // Bottom-Right
    },
    {
      id: "personalization",
      name: "Personalization Agent",
      role: "Semantic Variance Generator",
      desc: "Generates unique text variations for every recipient. Ensures 100 uniquely worded drafts are sent instead of 1 copy 100 times, avoiding spam filters.",
      icon: <Type className="text-amber-400" size={18} />,
      coordinates: { x: 50, y: 85 } // Bottom
    },
    {
      id: "attachment",
      name: "Attachment Agent",
      role: "Asset Intelligence Analyzer",
      desc: "Validates and parses resumes or pitch brochures, dynamically extracting key highlights to incorporate into personalized emails.",
      icon: <Paperclip className="text-orange-400" size={18} />,
      coordinates: { x: 20, y: 75 } // Bottom-Left
    },
    {
      id: "sending",
      name: "Sending Agent",
      role: "Deliverability Safeguard",
      desc: "Paces mail delivery queues using variable delay jitter and respects hourly/daily safety limits (50/hr, 500/day) to safeguard domain health.",
      icon: <Send className="text-red-400" size={18} />,
      coordinates: { x: 15, y: 50 } // Left
    },
    {
      id: "verification",
      name: "Verification Agent",
      role: "Inbox Ownership Validator",
      desc: "Conducts IMAP Challenge-Response verification checks to confirm sender authentication, checking inboxes via a secure 10-digit OTP process.",
      icon: <ShieldCheck className="text-cyan-400" size={18} />,
      coordinates: { x: 20, y: 25 } // Top-Left
    },
    {
      id: "analytics",
      name: "Analytics Agent",
      role: "Closed-loop Optimization",
      desc: "Aggregates delivery, bounce, open, and reply rates in real-time, feeding insights back to the template builder for iterative optimization.",
      icon: <Activity className="text-yellow-400" size={18} />,
      coordinates: { x: 50, y: 50 } // Shared center node/integrated
    }
  ];

  const activeAgent = agents.find((a) => a.id === selectedAgent) || agents[0];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900" id="deva">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* LEFT: CONTENT SPOTLIGHT ON DEVA */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full">
              <Bot size={12} /> MEET DEVA AI
            </div>

            <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              An Autonomous Multi-Agent Core.
            </h2>

            <p className="text-zinc-400 leading-relaxed">
              Deva isn't just a static template script. Deva is an intelligent AI Agent that coordinates a network of 10 specialized mini-agents to safely research leads, design campaigns, write personalized drafts, and respect email thresholds.
            </p>

            {/* Displaying Currently Hovered/Selected Agent Details */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm min-h-[220px] flex flex-col justify-between">
              {/* Corner ambient glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 blur-xl rounded-full" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeAgent.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
                      {activeAgent.icon}
                    </div>
                    <div>
                      <h4 className="heading-font font-bold text-white text-lg flex items-center gap-x-1.5">
                        {activeAgent.name}
                        {activeAgent.id === "master" && <Sparkles size={14} className="fill-cyan-400 text-cyan-400" />}
                      </h4>
                      <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">{activeAgent.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {activeAgent.desc}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="text-[10px] text-zinc-500 font-mono mt-4 border-t border-zinc-800/80 pt-3 flex justify-between">
                <span>Agent Status: Idle / Ready</span>
                <span>Click a node to inspect</span>
              </div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE NODE GRAPH */}
          <div className="lg:col-span-7 flex justify-center items-center">
            <div className="relative w-full aspect-square max-w-[480px] bg-zinc-900/20 border border-zinc-900/60 rounded-[32px] overflow-hidden p-8 flex justify-center items-center shadow-2xl">
              {/* Outer orbit lines */}
              <div className="absolute w-[80%] h-[80%] rounded-full border border-zinc-900/40 animate-[spin_60s_linear_infinite]" />
              <div className="absolute w-[50%] h-[50%] rounded-full border border-zinc-900/60 border-dashed animate-[spin_40s_linear_infinite_reverse]" />

              {/* Connecting lines from Master to other nodes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {agents.map((agent) => {
                  if (agent.id === "master") return null;
                  return (
                    <line
                      key={`line-${agent.id}`}
                      x1="50%"
                      y1="50%"
                      x2={`${agent.coordinates.x}%`}
                      y2={`${agent.coordinates.y}%`}
                      stroke={selectedAgent === agent.id ? "rgba(34, 211, 238, 0.4)" : "rgba(63, 63, 70, 0.15)"}
                      strokeWidth={selectedAgent === agent.id ? "2" : "1"}
                      strokeDasharray={agent.id === "sending" || agent.id === "security" ? "4 4" : "0"}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {agents.map((agent) => {
                const isSelected = selectedAgent === agent.id;
                const isMaster = agent.id === "master";

                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer group focus:outline-none"
                    style={{
                      left: `${agent.coordinates.x}%`,
                      top: `${agent.coordinates.y}%`
                    }}
                  >
                    <div className="relative">
                      {/* Selection pulse effect */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            layoutId="node-pulse"
                            className="absolute -inset-3.5 bg-cyan-400/10 rounded-full blur-sm"
                            transition={{ type: "spring", stiffness: 200 }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Button capsule */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                          isSelected
                            ? "bg-zinc-900 border-cyan-400 shadow-lg shadow-cyan-400/10 scale-110"
                            : isMaster
                            ? "bg-zinc-950 border-zinc-800 hover:border-cyan-400 hover:scale-105"
                            : "bg-zinc-950 border-zinc-900 hover:border-zinc-800 hover:scale-105"
                        }`}
                      >
                        {isMaster ? <Bot className="text-cyan-400" size={24} /> : agent.icon}
                      </div>

                      {/* Tooltip Label */}
                      <span className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-medium font-mono text-zinc-400 group-hover:text-white transition-colors whitespace-nowrap z-20 ${isSelected ? "text-cyan-400 border-cyan-400/30" : ""}`}>
                        {agent.name.split(" ")[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
