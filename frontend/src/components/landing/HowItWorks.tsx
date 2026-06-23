"use client";

import { motion } from "framer-motion";
import { Server, Users, Rocket, Sparkles } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <Server className="text-cyan-400" size={24} />,
      title: "1. Authenticate Sender Mailbox",
      desc: "Connect your Gmail, Outlook, or custom SMTP server using secure OAuth2 protocols. Verify ownership instantly via IMAP with a challenge OTP.",
      details: ["OAuth authorization standard", "AES-256 server encryption", "Zero password exposure risk"]
    },
    {
      icon: <Users className="text-purple-400" size={24} />,
      title: "2. Define Goal & Harvester",
      desc: "Tell Deva what role, industry, or geography you target. Upload a CSV list or command our scraper tool to gather decision-makers' contacts.",
      details: ["Automatic lead deduplication", "Real-time verification checker", "Industry & country filtering"]
    },
    {
      icon: <Rocket className="text-emerald-400" size={24} />,
      title: "3. Launch & Track Responses",
      desc: "Let Deva generate personalized drafts in 0.8s per lead. Set safe hourly limit caps, watch delivery status graphs, and respond directly.",
      details: ["Mimicked sending delay jitter", "Real-time delivery stats feed", "Reply sentiment categorization"]
    }
  ];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900" id="how">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles size={12} /> SIMPLE ONBOARDING
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Get Started in Under 3 Minutes
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Configure, personalize, and fire your first automated campaign following three transparent and secure steps.
          </p>
        </div>

        {/* 3 Step cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800 p-8 rounded-3xl space-y-6 hover:bg-zinc-900/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-850 flex items-center justify-center group-hover:scale-105 transition-transform">
                {step.icon}
              </div>

              <div className="space-y-3">
                <h3 className="heading-font text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-zinc-450 text-xs leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="border-t border-zinc-900/80 pt-4 space-y-2">
                {step.details.map((detail, dIdx) => (
                  <div key={dIdx} className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                    <span className="w-1 h-1 bg-cyan-400 rounded-full" />
                    {detail}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
