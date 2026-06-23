"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export default function PricingPreview() {
  const betaFeatures = [
    "First 500 emails sent 100% free",
    "Deva AI agent sequence creation",
    "Scrape 200 leads from LinkedIn",
    "Smart SMTP/IMAP owner validation",
    "Jitter rate deliverability protection",
    "Basic dashboard report logs"
  ];

  const proFeatures = [
    "Everything in Beta, plus:",
    "Unlimited lead scraping nodes",
    "Decoupled multi-sender inboxes",
    "Smart RAG internet researcher checks",
    "AI attachment parsed hook templates",
    "Custom HTML designs and editor",
    "Sentiment-based automated followups"
  ];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900 relative" id="pricing">
      {/* Background glow overlay */}
      <div className="absolute top-[30%] right-[-10%] w-[35%] h-[35%] bg-cyan-950/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles size={12} /> SECURE AN EARLY SLOT
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Transparent, Value-First Pricing
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            Get started for free during our early beta phase. No credit card required. Lock in your credentials securely.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card 1: Free Beta */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl flex flex-col justify-between hover:border-zinc-700 transition-all backdrop-blur-md relative overflow-hidden"
          >
            {/* Ambient tag */}
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-cyan-400 to-indigo-500 text-zinc-950 text-[10px] font-extrabold px-4 py-1.5 rounded-full rotate-12">
              ACTIVE BETA
            </div>

            <div>
              <h3 className="heading-font font-bold text-white text-xl">Early Beta</h3>
              <p className="text-zinc-500 text-xs mt-1">Test Deva's multi-agent sequencing with zero risk.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white font-mono">$0</span>
                <span className="text-zinc-500 text-xs ml-2">/ month (Free Forever)</span>
              </div>

              <div className="h-px bg-zinc-850/80 mb-6" />

              <ul className="space-y-3.5 text-xs text-zinc-350">
                {betaFeatures.map((feat, i) => (
                  <li key={i} className="flex items-center gap-x-2">
                    <Check size={14} className="text-cyan-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/login"
              className="mt-8 w-full py-3.5 text-center bg-white hover:bg-cyan-400 hover:text-white text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-white/5 hover:shadow-cyan-500/10"
            >
              Start Free Campaign
            </Link>
          </motion.div>

          {/* Card 2: Professional Expansion */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-900/10 border border-zinc-900 p-8 rounded-3xl flex flex-col justify-between hover:border-zinc-800 transition-all relative"
          >
            <div>
              <h3 className="heading-font font-bold text-white text-xl">Pro Tier</h3>
              <p className="text-zinc-500 text-xs mt-1">For scale-focused recruitment & sales operations.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold text-zinc-400 font-mono">$39</span>
                <span className="text-zinc-500 text-xs ml-2">/ month (Coming Soon)</span>
              </div>

              <div className="h-px bg-zinc-850/20 mb-6" />

              <ul className="space-y-3.5 text-xs text-zinc-450">
                {proFeatures.map((feat, i) => (
                  <li key={i} className="flex items-center gap-x-2">
                    <Check size={14} className="text-cyan-400/50 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="mt-8 w-full py-3.5 text-center border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-not-allowed"
              disabled
            >
              Coming Soon
            </button>
          </motion.div>
        </div>

        <div className="text-center text-[10px] text-zinc-600 mt-12 font-mono">
          * Decoupled sender loops support all standard SMTP and Gmail APIs.
        </div>
      </div>
    </section>
  );
}
