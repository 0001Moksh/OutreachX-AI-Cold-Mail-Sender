"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Database, Mail, Paperclip, FileText, Bot, CheckCircle, Plus, Search, Trash2, Cpu } from "lucide-react";

type TabId = "leads" | "campaigns" | "assets" | "templates" | "deva";

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>("leads");

  const tabs = [
    { id: "leads", label: "Leads", icon: <Database size={16} /> },
    { id: "campaigns", label: "Campaigns", icon: <Mail size={16} /> },
    { id: "assets", label: "Assets", icon: <Paperclip size={16} /> },
    { id: "templates", label: "Templates", icon: <FileText size={16} /> },
    { id: "deva", label: "Deva AI", icon: <Bot size={16} /> }
  ];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900" id="showcase">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles size={12} className="fill-cyan-400" /> INTERACTIVE WORKSPACE
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            The OutreachX Dashboard Workspace
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Click through the tabs below to explore the exact interfaces and agent screens you'll access when deploying campaigns on OutreachX.
          </p>
        </div>

        {/* Tab Selection Row */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-900 max-w-2xl mx-auto backdrop-blur-md">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`relative px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-x-2 transition-colors cursor-pointer ${
                  isSelected ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-showcase-tab"
                    className="absolute inset-0 bg-white rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panel Content Box */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md min-h-[420px] relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="p-8"
            >
              {/* LEADS PANEL */}
              {activeTab === "leads" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h3 className="heading-font font-bold text-white text-xl">Lead Database & Smart Filters</h3>
                      <p className="text-zinc-500 text-xs mt-1">Manage scraped contacts, trigger real-time MX records validation checkups.</p>
                    </div>
                    <div className="flex gap-x-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input
                          type="text"
                          placeholder="Search leads..."
                          className="w-full bg-zinc-950 border border-zinc-850 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                          disabled
                        />
                      </div>
                      <button className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1">
                        <Plus size={14} /> Add Lead
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-850 rounded-xl bg-zinc-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-850 bg-zinc-950/60 text-zinc-500 font-semibold uppercase tracking-wider">
                          <th className="p-4">Contact</th>
                          <th className="p-4">Company</th>
                          <th className="p-4">Verification</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850/60">
                        {[
                          { name: "Priya Sharma", role: "VP Engineering", company: "Zomato", mail: "priya@zomato.com", status: "Verified", date: "2 mins ago" },
                          { name: "Devon Lane", role: "CEO", company: "Linear Tech", mail: "devon@linear.co", status: "Verified", date: "10 mins ago" },
                          { name: "Kathryn Murphy", role: "Talent Acquisition", company: "Notion AI", mail: "kathryn@notion.so", status: "Verifying", date: "Just now" },
                          { name: "Arjun Mehta", role: "Founder", company: "FlowOps", mail: "arjun@flowops.in", status: "Verified", date: "1 hour ago" }
                        ].map((lead, i) => (
                          <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-white">{lead.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{lead.mail}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-white">{lead.company}</div>
                              <div className="text-[10px] text-zinc-500">{lead.role}</div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                lead.status === "Verified"
                                  ? "bg-emerald-950/50 border-emerald-900 text-emerald-400"
                                  : "bg-amber-950/50 border-amber-900 text-amber-400 animate-pulse"
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${lead.status === "Verified" ? "bg-emerald-400" : "bg-amber-400"}`} />
                                {lead.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button className="text-zinc-500 hover:text-rose-400 transition-colors p-1" disabled>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CAMPAIGNS PANEL */}
              {activeTab === "campaigns" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="heading-font font-bold text-white text-xl">Campaign Sequence & Delivery Jitter</h3>
                      <p className="text-zinc-500 text-xs mt-1">Configure automated steps and multi-recipient scheduler parameters.</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Drip sequence node visual */}
                    <div className="md:col-span-2 space-y-4">
                      {[
                        { step: "Step 1: AI Email", detail: "Personalized subject line and body variant generated in 0.8s", timing: "Send: Instant with 30s jitter" },
                        { step: "Step 2: Followup", detail: "If no reply in 3 days, trigger second AI followup emphasizing value hook", timing: "Wait: 3 Days" },
                        { step: "Step 3: Connect Check", detail: "Verify delivery log, mark target status completed in database", timing: "Wait: 2 Days" }
                      ].map((seq, i) => (
                        <div key={i} className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-900 flex items-center justify-center font-mono font-bold text-cyan-400 text-xs">
                            0{i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold text-sm text-white">{seq.step}</h4>
                              <span className="text-[10px] text-zinc-500 font-mono">{seq.timing}</span>
                            </div>
                            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{seq.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Campaign limits configuration */}
                    <div className="bg-zinc-950/30 p-6 rounded-2xl border border-zinc-850 space-y-4 text-xs">
                      <h4 className="font-bold text-white uppercase tracking-wider text-[10px] text-zinc-500 border-b border-zinc-900 pb-2">Scheduler Config</h4>
                      
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[10px] font-semibold">Gmail Safe limit (Max 500/day)</label>
                        <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 text-zinc-300 font-mono text-[11px]">50 emails/hour</div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[10px] font-semibold">Random Send Jitter (Mimic Human)</label>
                        <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 text-zinc-300 font-mono text-[11px]">30 - 90 seconds delay</div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[10px] font-semibold">Decryption Key Protection</label>
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-medium">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          AES-256 Enabled
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ASSETS PANEL */}
              {activeTab === "assets" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="heading-font font-bold text-white text-xl">Asset Intelligence & Resume Reader</h3>
                    <p className="text-zinc-500 text-xs mt-1">Upload resumes, brochures, or portfolios. Deva automatically parses skills and case accomplishments.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Simulated File upload container */}
                    <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-center text-zinc-500 mb-4">
                        <Paperclip size={20} />
                      </div>
                      <h4 className="text-sm font-semibold text-white">resume_priya_sharma.pdf</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">File size: 142 KB • PDF document format</p>
                      <span className="mt-4 px-3 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900 rounded-full text-[10px] font-semibold">Parsed Success</span>
                    </div>

                    {/* AI extracted outputs */}
                    <div className="bg-zinc-950/20 border border-zinc-850 p-6 rounded-2xl space-y-4 text-xs">
                      <h4 className="font-bold text-white uppercase tracking-wider text-[10px] text-zinc-500 border-b border-zinc-900 pb-2">AI Extracted Context</h4>
                      
                      <div className="space-y-2">
                        <div className="font-semibold text-zinc-300">Core Accomplishments</div>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-400 text-[11px] leading-relaxed">
                          <li>Scaled Zomato React web apps rendering 4M requests/sec</li>
                          <li>Optimized frontend render cycles by 24% using Webpack lazy bundles</li>
                          <li>Supervised a core unit of 12 junior React engineers</li>
                        </ul>
                      </div>

                      <div className="pt-2">
                        <div className="font-semibold text-zinc-300 mb-1.5">Value Statement Hook</div>
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 text-cyan-400 font-mono text-[10px] leading-relaxed">
                          "I saw you scaled react layouts by 24% at Zomato. We build something similar and thought..."
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TEMPLATES PANEL */}
              {activeTab === "templates" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="heading-font font-bold text-white text-xl">Dynamic AI Template Writer</h3>
                    <p className="text-zinc-500 text-xs mt-1">Write high-converting copy injecting dynamic recipient values: name, company, and customized hooks.</p>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl space-y-4">
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-zinc-900 text-xs text-zinc-500 font-mono">
                      <span>Insert Tokens:</span>
                      <span className="text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded cursor-default border border-cyan-900/30">{"{{name}}"}</span>
                      <span className="text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded cursor-default border border-purple-900/30">{"{{company}}"}</span>
                      <span className="text-pink-400 bg-pink-950/40 px-2 py-0.5 rounded cursor-default border border-pink-900/30">{"{{personalized_hook}}"}</span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <span className="text-zinc-500">Subject:</span>
                        <span className="text-white ml-2">Quick query regarding React scaling at {"{{company}}"}</span>
                      </div>
                      <div className="h-px bg-zinc-900" />
                      <div className="text-zinc-350 leading-relaxed space-y-2">
                        <p>Hi {"{{name}}"},</p>
                        <p>I noticed you lead engineering efforts at {"{{company}}"}. {"{{personalized_hook}}"}</p>
                        <p>We're launching an outreach optimization engine and wanted to ask if you had 10 mins this Wednesday for a quick feedback chat?</p>
                        <p>Best regards,<br />Siddharth</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DEVA AI PANEL */}
              {activeTab === "deva" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="heading-font font-bold text-white text-xl">Deva AI Agent Monitor</h3>
                    <p className="text-zinc-500 text-xs mt-1">Observe running nodes, active CPU performance, and decrypted SMTP token safe loads.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Active agents checklist */}
                    <div className="md:col-span-2 space-y-3">
                      {[
                        { name: "Master Agent (The Brain)", task: "Mapping outreach campaign target checklist", status: "Active", color: "bg-cyan-400" },
                        { name: "Personalization Agent", task: "Generating semantic email variance configurations", status: "Active", color: "bg-cyan-400" },
                        { name: "Sending Agent", task: "Staggering delivery queue under safe limit safety check", status: "Idle / Waiting", color: "bg-zinc-600" },
                        { name: "Security Agent", task: "AES-256 ENV lock verified. Decrypted SMTP key cache safe", status: "Success", color: "bg-emerald-400" }
                      ].map((agent, i) => (
                        <div key={i} className="bg-zinc-950/40 border border-zinc-850 p-3.5 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center text-zinc-500">
                              <Cpu size={14} className={agent.status === "Active" ? "text-cyan-400 animate-pulse" : "text-zinc-400"} />
                            </div>
                            <div>
                              <div className="font-semibold text-white">{agent.name}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{agent.task}</div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-zinc-300 border border-zinc-800`}>
                            <span className={`w-1 h-1 rounded-full ${agent.color}`} />
                            {agent.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Node statistics */}
                    <div className="bg-zinc-950/30 p-6 rounded-2xl border border-zinc-850 space-y-4 text-xs">
                      <h4 className="font-bold text-white uppercase tracking-wider text-[10px] text-zinc-500 border-b border-zinc-900 pb-2">Agent Statistics</h4>
                      <div className="space-y-3 font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Total Run Cycles:</span>
                          <span className="text-zinc-350">1,248 loops</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Avg LLM Delay:</span>
                          <span className="text-zinc-350">0.82 seconds</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Cache Hits:</span>
                          <span className="text-zinc-350">92.4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Decryption Keys:</span>
                          <span className="text-emerald-400 font-semibold">Locked</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
