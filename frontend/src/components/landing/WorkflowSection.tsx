"use client";

import { motion } from "framer-motion";
import { Upload, GraduationCap, Search, Mail, Rocket, Activity, CheckCircle, ChevronRight, Sparkles } from "lucide-react";

export default function WorkflowSection() {
  const steps = [
    {
      icon: <Upload className="text-cyan-400" size={20} />,
      title: "Upload Profile",
      desc: "Upload your resume, portfolio, or product brochure to bootstrap context."
    },
    {
      icon: <GraduationCap className="text-purple-400" size={20} />,
      title: "Deva Learns Context",
      desc: "Deva extracts key accomplishments, tone parameters, and unique value offers."
    },
    {
      icon: <Search className="text-blue-400" size={20} />,
      title: "Generate Leads",
      desc: "Discover targeted decision makers on LinkedIn & local directories in seconds."
    },
    {
      icon: <Mail className="text-pink-400" size={20} />,
      title: "Create Templates",
      desc: "Draft hyper-personalized email templates with semantic text variations."
    },
    {
      icon: <Rocket className="text-red-400" size={20} />,
      title: "Launch Campaign",
      desc: "Configure safe rate limits, safety queues, and click launch."
    },
    {
      icon: <Activity className="text-yellow-400" size={20} />,
      title: "Track Replies",
      desc: "Watch real-time opens, deliveries, bounces, and response metrics."
    },
    {
      icon: <CheckCircle className="text-emerald-400" size={20} />,
      title: "Get Interviews",
      desc: "Respond directly to prospects who reply to your tailored sequences."
    }
  ];

  return (
    <section className="bg-zinc-950 py-28 relative border-t border-zinc-900" id="workflow">
      {/* Background overlay grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles size={12} className="fill-cyan-400" /> THE OUTREACH LIFECYCLE
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            The Definitive Strategic Workflow
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed text-sm md:text-base">
            From landing page setup to securing responses. Witness how Deva automates complex operational steps in under three minutes.
          </p>
        </div>

        {/* Timeline Horizontal Line / Visual Nodes (Responsive) */}
        <div className="relative">
          {/* Vertical line for mobile, horizontal path for large screens */}
          <div className="absolute left-8 lg:left-0 lg:right-0 top-0 bottom-0 lg:top-1/2 lg:h-0.5 bg-gradient-to-r lg:from-cyan-950 lg:via-cyan-500/30 lg:to-zinc-900 w-0.5 lg:w-full z-0" />

          <div className="grid lg:grid-cols-7 gap-12 lg:gap-6 relative z-10">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.08 }}
                className="flex lg:flex-col items-start lg:items-center text-left lg:text-center group"
              >
                {/* Timeline dot */}
                <div className="flex-shrink-0 mr-6 lg:mr-0 lg:mb-6 relative">
                  {/* Glowing aura */}
                  <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-md group-hover:bg-cyan-500/35 transition-colors" />
                  
                  {/* Outer circle */}
                  <div className="relative w-16 h-16 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center group-hover:border-cyan-400 group-hover:scale-105 transition-all duration-300 shadow-xl">
                    {step.icon}
                  </div>

                  {/* Step counter badge */}
                  <span className="absolute -top-1.5 -right-1.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 font-bold font-mono px-2 py-0.5 rounded-full select-none">
                    0{idx + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="heading-font text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center lg:justify-center gap-1.5">
                    {step.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
