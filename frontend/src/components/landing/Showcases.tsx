"use client";

import { motion } from "framer-motion";
import { Search, ShieldCheck, Mail, Sliders, Paperclip, CheckCircle, ArrowRight, Sparkles, Terminal } from "lucide-react";

export default function Showcases() {
  return (
    <section className="bg-zinc-950 py-24 space-y-36 overflow-hidden border-t border-zinc-900">
      
      {/* 1. LEAD GENERATION SHOWCASE */}
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="md:col-span-6 space-y-6"
        >
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3 py-1.5 rounded-full">
            <Search size={12} /> HARVEST TARGETS
          </div>
          <h3 className="heading-font text-3xl md:text-4xl font-bold text-white tracking-tight">
            AI Lead Discovery & verification
          </h3>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Stop copy-pasting contacts manually. OutreachX integrates scraper scripts that harvest targets across directories and LinkedIn. The Data Agent normalizes column layouts, while the Verification Agent executes IMAP mailbox handshakes to purge fake addresses.
          </p>
          <ul className="space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> MX Record lookup and syntax validation
            </li>
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> LinkedIn scraping with browser extension helper
            </li>
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> Automatic duplicates merging & parsing
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="md:col-span-6 relative"
        >
          <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-3xl" />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs border-b border-zinc-800 pb-3">
              <span className="font-mono text-zinc-500">Query: AI Founders in Germany</span>
              <span className="text-cyan-400 font-bold">247 Found</span>
            </div>
            
            <div className="space-y-3">
              {[
                { name: "Johanna Weber", role: "CTO", company: "Aether AI", status: "Verified" },
                { name: "Max Schmidt", role: "CEO", company: "NeuraLog", status: "Verified" }
              ].map((item, i) => (
                <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">{item.name}</div>
                    <div className="text-[10px] text-zinc-500">{item.role} at {item.company}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full" /> {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 2. CAMPAIGN BUILDER SHOWCASE */}
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="md:col-span-6 order-2 md:order-1 relative"
        >
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-3xl" />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs border-b border-zinc-800 pb-3">
              <span className="font-mono text-zinc-500">Scheduler Configuration</span>
              <span className="text-emerald-400 font-bold">Safe Limits Active</span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 space-y-2">
                <div className="font-semibold text-zinc-400">Random Send Offset (Jitter)</div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 w-2/3 h-full rounded-full" />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>Min: 30s delay</span>
                  <span className="text-cyan-400 font-bold">Active: ~45s jitter</span>
                  <span>Max: 90s delay</span>
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-zinc-400">Format Mode</span>
                  <span className="text-cyan-400 font-semibold">Decrypted Token Safe</span>
                </div>
                <div className="flex gap-2">
                  <span className="flex-1 py-1.5 text-center bg-zinc-900 rounded border border-zinc-800 font-semibold">Plain Text</span>
                  <span className="flex-1 py-1.5 text-center bg-zinc-900 border border-zinc-800 rounded text-zinc-500">Custom HTML</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="md:col-span-6 order-1 md:order-2 space-y-6"
        >
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3 py-1.5 rounded-full">
            <Mail size={12} /> SEQUENCE BUILDER
          </div>
          <h3 className="heading-font text-3xl md:text-4xl font-bold text-white tracking-tight">
            Campaign Builder with Jitter Limits
          </h3>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Plan your sequence drip cycles, set precise delay timing, and control delivery cadences. OutreachX enforces strict safe-limits (50 emails/hour) alongside randomized sending jitter. This mimics manual execution patterns, ensuring Gmail and Outlook heuristics never flag your sender domain.
          </p>
          <ul className="space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> Safety checks verifying SMTP configuration on launch
            </li>
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> Plain-text optimization for highest delivery success
            </li>
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> Automated retries handling server temporary flags
            </li>
          </ul>
        </motion.div>
      </div>

      {/* 3. ASSET MANAGEMENT SHOWCASE */}
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="md:col-span-6 space-y-6"
        >
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3 py-1.5 rounded-full">
            <Paperclip size={12} /> ASSET INTELLIGENCE
          </div>
          <h3 className="heading-font text-3xl md:text-4xl font-bold text-white tracking-tight">
            Asset Intelligence & Context Extraction
          </h3>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Feed Deva your background context. Upload your CV, products list, or business deck. The Attachment Agent parses achievements and product features, formatting them into short, punchy value statements that are dynamically woven into your email sequences.
          </p>
          <ul className="space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> Smart parsing of PDF portfolios and case files
            </li>
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> Tone analysis replicating your professional style
            </li>
            <li className="flex items-center gap-x-2">
              <CheckCircle size={16} className="text-cyan-400" /> Dynamic variables replacement mapping custom hooks
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="md:col-span-6 relative"
        >
          <div className="absolute inset-0 bg-purple-500/10 blur-3xl rounded-3xl" />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs border-b border-zinc-800 pb-3">
              <span className="font-mono text-zinc-500">Asset: pitch_deck_v2.pdf</span>
              <span className="text-emerald-400 font-bold">Analysis Complete</span>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 font-mono text-[10px] text-zinc-400 space-y-3">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Terminal size={12} />
                <span>Deva Context Extraction Log</span>
              </div>
              <div className="h-px bg-zinc-900" />
              <div className="space-y-1.5">
                <div>&gt; Identified Product: B2B API Optimizer</div>
                <div>&gt; Found Core stat: Reduces API responses by 40%</div>
                <div>&gt; Formulating hook variants for CEO:</div>
                <div className="bg-zinc-900 p-2.5 rounded text-[9px] text-zinc-500 mt-1 leading-relaxed">
                  "I noticed you lead Linear Tech. Since we optimize B2B API response timings by 40%, I thought..."
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </section>
  );
}
