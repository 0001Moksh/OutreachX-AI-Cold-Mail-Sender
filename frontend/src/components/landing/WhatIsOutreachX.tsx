"use client";

import { motion } from "framer-motion";
import { Cpu, Server, Shield, Activity, Sparkles, Layers } from "lucide-react";

export default function WhatIsOutreachX() {
  const pillars = [
    {
      icon: <Layers className="text-cyan-400" size={24} />,
      title: "All-in-One AI OS",
      description: "Replace subscription fatigue. Lead discovery, email validation, copy creation, sending queue, and metrics dashboard unified under a single operating system."
    },
    {
      icon: <Cpu className="text-purple-400" size={24} />,
      title: "Multi-Agent Coordination",
      description: "Specialized agents handle security, targeting, templates, verification, and analytics. Led by a Master Brain agent translating goals into execution."
    },
    {
      icon: <Shield className="text-emerald-400" size={24} />,
      title: "Bank-Grade Encryption",
      description: "Rest easy with SOC 2 readiness. Credentials use AES-256 server-side encryption with ENV keys, OAuth2 verification, and zero password exposure."
    },
    {
      icon: <Activity className="text-rose-400" size={24} />,
      title: "Deliverability Jitter",
      description: "Protect sender reputation. Natural sending offsets (random micro-delays) prevent algorithmic spam triggers, keeping your inbox safe."
    }
  ];

  return (
    <section className="bg-zinc-950 py-24 relative" id="about">
      {/* Glow effect behind header */}
      <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[30%] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4"
          >
            <Sparkles size={12} className="fill-cyan-400" /> THE NEW PARADIGM
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="heading-font text-4xl md:text-5xl font-bold mb-6 tracking-tight"
          >
            An AI Operating System for Outreach
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base text-zinc-400 leading-relaxed"
          >
            Traditional outreach tools treat emailing as a volume game—blasting template lists until your domain gets banned. OutreachX is built on a reputation-first architecture, leveraging coordinated artificial agents to balance speed with high-relevance personalization.
          </motion.p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((pillar, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-zinc-900/30 border border-zinc-900/80 p-8 rounded-2xl flex flex-col items-start hover:border-zinc-800 hover:bg-zinc-900/50 transition-all duration-300 group"
            >
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                {pillar.icon}
              </div>
              <h3 className="heading-font text-lg font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                {pillar.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
