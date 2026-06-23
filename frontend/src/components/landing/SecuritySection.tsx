"use client";

import { motion } from "framer-motion";
import { Lock, ShieldAlert, KeyRound, EyeOff, FileKey, ShieldCheck, Sparkles } from "lucide-react";

export default function SecuritySection() {
  const securityItems = [
    {
      icon: <Lock className="text-cyan-400" size={20} />,
      title: "OAuth Authentication",
      desc: "Connect directly with Google Workspace or Microsoft accounts. Authenticate securely without OutreachX ever handling or viewing your passwords."
    },
    {
      icon: <KeyRound className="text-indigo-400" size={20} />,
      title: "AES-256 Encryption",
      desc: "Any app password configuration is immediately encrypted at rest using server-side AES-256 cryptography before entering our database."
    },
    {
      icon: <FileKey className="text-emerald-400" size={20} />,
      title: "Decryption Logic in ENV",
      desc: "To prevent leaks, our decryption logic keys reside in protected server Environment Variables, completely isolated from public repository code."
    },
    {
      icon: <EyeOff className="text-purple-400" size={20} />,
      title: "Zero Password Exposure",
      desc: "OutreachX never stores raw passwords. We read security tokens directly and authenticate loops via secure challenge-response validation."
    },
    {
      icon: <ShieldAlert className="text-rose-400" size={20} />,
      title: "Protected SMTP/IMAP Logs",
      desc: "All SMTP connection streams are executed over TLS/SSL protocols, ensuring intercept protection between server nodes."
    },
    {
      icon: <ShieldCheck className="text-sky-400" size={20} />,
      title: "Decoupled Credential Cleansing",
      desc: "Opt to clear all encrypted session records immediately after a campaign finishes. You maintain absolute control over your digital credentials."
    }
  ];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900 relative overflow-hidden" id="security">
      {/* Background cyber ambient highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[40%] bg-indigo-950/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <ShieldCheck size={12} /> BANK-GRADE INFRASTRUCTURE
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Zero-Trust Security Framework
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Your sender reputation and domain health are your most valuable digital assets. OutreachX treats data security with the rigor of a financial application.
          </p>
        </div>

        {/* Security Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="bg-zinc-900/10 border border-zinc-900 hover:border-zinc-800 p-8 rounded-2xl flex flex-col justify-between hover:bg-zinc-900/30 transition-all duration-300 group hover:-translate-y-0.5"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center group-hover:scale-105 group-hover:border-cyan-500/20 transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="heading-font font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
