"use client";

import { motion } from "framer-motion";
import { Search, ShieldCheck, Mail, Paperclip, Brain, FileText, Globe, Bot, BarChart3, MessageSquare, Server, Layers, Sparkles } from "lucide-react";

export default function FeatureGrid() {
  const features = [
    {
      icon: <Search className="text-cyan-400" size={22} />,
      title: "AI Lead Discovery",
      desc: "Autonomously parse LinkedIn directories, Google Maps, and local search parameters to identify ideal prospects."
    },
    {
      icon: <ShieldCheck className="text-emerald-400" size={22} />,
      title: "Email Verification",
      desc: "Perform real-time MX records validation and mailbox handshakes to reduce bounce rates below 2%."
    },
    {
      icon: <Mail className="text-purple-400" size={22} />,
      title: "Campaign Automation",
      desc: "Schedule multi-step sequences with automated conditional logic based on recipient open or reply states."
    },
    {
      icon: <Paperclip className="text-orange-400" size={22} />,
      title: "Asset Intelligence",
      desc: "Extract key metrics from resumes, case studies, or slide decks to automatically frame your email hooks."
    },
    {
      icon: <Brain className="text-amber-400" size={22} />,
      title: "Memory Engine",
      desc: "Decisions, settings, and conversation histories are indexed, allowing Deva to learn your brand voice over time."
    },
    {
      icon: <FileText className="text-pink-400" size={22} />,
      title: "Template Generation",
      desc: "Auto-compile high-converting cold email body drafts and subject lines tailored for direct scheduling."
    },
    {
      icon: <Globe className="text-blue-400" size={22} />,
      title: "RAG Search Integration",
      desc: "Verify facts, company news, and prospect backgrounds in real-time using retrieval-augmented web queries."
    },
    {
      icon: <Bot className="text-indigo-400" size={22} />,
      title: "Multi-Agent System",
      desc: "Coordinated mini-agents operate specialized tasks under a central orchestrating Master Brain."
    },
    {
      icon: <BarChart3 className="text-red-400" size={22} />,
      title: "Granular Analytics",
      desc: "Track real-time delivery performance, open metrics, clicks, replies, and unsubscribe requests on a clear graph."
    },
    {
      icon: <MessageSquare className="text-yellow-400" size={22} />,
      title: "Reply Tracking",
      desc: "Leverage natural language parsing to categorize reply sentiment (positive booking, referral, or unsubscribe)."
    },
    {
      icon: <Server className="text-teal-400" size={22} />,
      title: "SMTP/IMAP Management",
      desc: "Easily authenticate custom inboxes. Decoupled sender loops support Google Workspace, Outlook, and Custom servers."
    },
    {
      icon: <Layers className="text-sky-400" size={22} />,
      title: "AI Operating System",
      desc: "One central system managing databases, scrapers, writing models, and send queues. Zero subscription fatigue."
    }
  ];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900" id="features">
      {/* Background radial highlight */}
      <div className="absolute top-[50%] right-[10%] w-[35%] h-[35%] bg-cyan-950/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles size={12} className="fill-cyan-400" /> COMPLETE CAPABILITIES
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Engineered for Precision Outreach
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            OutreachX bundles the tools you traditionally pay separately for, delivering a seamless AI-driven operating system.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800 p-6 rounded-2xl flex flex-col justify-between hover:bg-zinc-900/40 transition-all duration-300 group hover:-translate-y-1"
            >
              <div>
                {/* Icon Container */}
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:border-cyan-500/20 transition-all duration-300 shadow-inner">
                  {feature.icon}
                </div>
                
                {/* Title */}
                <h3 className="heading-font font-bold text-white text-base mb-2 group-hover:text-cyan-300 transition-colors">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {feature.desc}
                </p>
              </div>

              {/* Card Footer Accent */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent mt-6 group-hover:via-cyan-500/30 transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
