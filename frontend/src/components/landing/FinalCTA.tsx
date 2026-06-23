"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Send, Sparkles } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900 overflow-hidden relative">
      {/* Background glow triggers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.05),transparent_60%)] pointer-events-none" />
      
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 border border-zinc-800/80 rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl backdrop-blur-md"
        >
          {/* Internal design glows */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/10 blur-[90px] rounded-full pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3 py-1.5 rounded-full mx-auto select-none">
              <Sparkles size={12} className="fill-cyan-400" /> 3 MINUTES TO FIRST EMAIL
            </div>

            <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Ready to Run Your First Intelligent Campaign?
            </h2>

            <p className="text-zinc-450 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
              Scrape targets, verify deliverability structures, and draft personalized templates securely with Deva today.
            </p>

            <div className="pt-6">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-x-3 px-10 py-5 bg-white text-zinc-950 hover:bg-cyan-400 hover:text-white text-base font-bold rounded-2xl transition-all shadow-xl shadow-cyan-500/10 hover:shadow-cyan-500/25 hover:scale-102"
              >
                <Send size={18} />
                Launch OutreachX Now
                <ArrowRight size={18} />
              </Link>
            </div>

            <p className="text-[10px] text-zinc-500 font-mono pt-4">
              Free forever for the first 500 emails • Zero password risks via OAuth • No credit card required
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
