"use client";

import { motion } from "framer-motion";
import { Check, X, Sparkles } from "lucide-react";

export default function ComparisonSection() {
  const points = [
    {
      feature: "Lead Finding",
      traditional: "Hours copy-pasting contacts off directories into CSVs.",
      outreachx: "Deva discovers verified contacts in 30 seconds.",
      check: true
    },
    {
      feature: "Personalization",
      traditional: "Generic mass templates with simple name brackets, getting flagged.",
      outreachx: "Dynamic semantic variance rewritten in 0.8 seconds per lead.",
      check: true
    },
    {
      feature: "Subscription fatigue",
      traditional: "Paying for ZoomInfo, Apollo, Hunter, Mailshake, and CSV checkers.",
      outreachx: "One unified AI Operating System managing the entire workspace.",
      check: true
    },
    {
      feature: "Campaign Scaling",
      traditional: "Burst sending triggering heuristic filters, risking domain ban.",
      outreachx: "Automatic sending queues with random delay jitter and limits.",
      check: true
    },
    {
      feature: "Credential Safety",
      traditional: "Entering raw email account passwords on third party sites.",
      outreachx: "OAuth2 authentication and AES-256 environment-locked encryption.",
      check: true
    }
  ];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900" id="comparison">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles size={12} /> THE CHOICE IS CLEAR
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Traditional Outreach vs OutreachX
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            See how an integrated, AI-driven operating system elevates your reply rates while cutting tool subscription fees.
          </p>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-hidden border border-zinc-850 rounded-3xl bg-zinc-900/10 backdrop-blur-md shadow-2xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-850 bg-zinc-950/60 font-semibold text-zinc-400 uppercase tracking-wider text-xs">
                <th className="p-6 w-1/4">Aspect</th>
                <th className="p-6 w-3/8">Traditional Outreach</th>
                <th className="p-6 w-3/8 text-cyan-400">OutreachX AI OS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/60">
              {points.map((pt, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/20 transition-colors">
                  <td className="p-6 font-bold text-white heading-font">{pt.feature}</td>
                  <td className="p-6 text-zinc-400 flex items-start gap-2">
                    <X size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <span>{pt.traditional}</span>
                  </td>
                  <td className="p-6 text-zinc-200 font-medium">
                    <div className="flex items-start gap-2 text-cyan-300">
                      <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>{pt.outreachx}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden space-y-6">
          {points.map((pt, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-4"
            >
              <h3 className="heading-font font-bold text-white text-base border-b border-zinc-850 pb-2">{pt.feature}</h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2 text-zinc-500">
                  <X size={14} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-zinc-400 block mb-0.5">Traditional:</span>
                    {pt.traditional}
                  </div>
                </div>
                
                <div className="flex items-start gap-2 text-cyan-300">
                  <Check size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-cyan-400 block mb-0.5">OutreachX:</span>
                    {pt.outreachx}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
