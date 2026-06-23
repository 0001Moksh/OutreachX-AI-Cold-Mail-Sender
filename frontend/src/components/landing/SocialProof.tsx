"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Mail, Users, Percent, ShieldCheck } from "lucide-react";

// CountUp helper component
function CountUpNumber({ value, suffix = "", duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const isInView = useInView(elementRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = value;
    const totalSteps = 60;
    const stepTime = duration / totalSteps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.floor((end * step) / totalSteps);
      setCount(current);

      if (step >= totalSteps) {
        setCount(end);
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return (
    <span ref={elementRef} className="font-mono font-bold tracking-tight">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function SocialProof() {
  const logos = ["Vercel", "Supabase", "Linear", "Stripe", "Retool", "Deel", "Cursor", "Notion"];

  return (
    <section className="bg-zinc-950 border-t border-zinc-900 py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* LOGO MARQUEE TITLE */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Trusted by Builders & Growth Teams at High-Growth Companies
          </p>
        </div>

        {/* LOGO INFINITE MARQUEE */}
        <div className="relative w-full overflow-hidden mb-24 before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-20 before:bg-gradient-to-r before:from-zinc-950 before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-20 after:bg-gradient-to-l after:from-zinc-950 after:to-transparent">
          <div className="flex w-[200%] gap-x-12 animate-[marquee_30s_linear_infinite]">
            {/* First sequence */}
            <div className="flex justify-around items-center w-1/2 text-lg font-bold text-zinc-600 tracking-wider">
              {logos.map((logo, index) => (
                <span key={index} className="hover:text-zinc-400 transition-colors cursor-default select-none">
                  {logo}
                </span>
              ))}
            </div>
            {/* Second sequence (for loop repeat) */}
            <div className="flex justify-around items-center w-1/2 text-lg font-bold text-zinc-600 tracking-wider">
              {logos.map((logo, index) => (
                <span key={`dup-${index}`} className="hover:text-zinc-400 transition-colors cursor-default select-none">
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* METRICS / STATISTICS SECTION */}
        <div className="grid md:grid-cols-4 gap-8">
          {/* Card 1: Emails Sent */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0 }}
            className="relative bg-zinc-900/40 border border-zinc-900 p-8 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-colors group"
          >
            <div className="absolute top-4 right-4 text-cyan-400/20 group-hover:text-cyan-400/40 transition-colors">
              <Mail size={32} />
            </div>
            <div>
              <div className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Emails Sent</div>
              <div className="text-4xl md:text-5xl font-extrabold text-white">
                <CountUpNumber value={10000} suffix="+" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              Delivered safely leveraging SMTP/IMAP multi-agent queues with randomized jitter.
            </p>
          </motion.div>

          {/* Card 2: Early Users */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative bg-zinc-900/40 border border-zinc-900 p-8 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-colors group"
          >
            <div className="absolute top-4 right-4 text-cyan-400/20 group-hover:text-cyan-400/40 transition-colors">
              <Users size={32} />
            </div>
            <div>
              <div className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2">Early Beta Users</div>
              <div className="text-4xl md:text-5xl font-extrabold text-white">
                <CountUpNumber value={500} suffix="+" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              Founders, developers, and recruiters executing cold campaigns every day.
            </p>
          </motion.div>

          {/* Card 3: Average Open Rate */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative bg-zinc-900/40 border border-zinc-900 p-8 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-colors group"
          >
            <div className="absolute top-4 right-4 text-cyan-400/20 group-hover:text-cyan-400/40 transition-colors">
              <Percent size={32} />
            </div>
            <div>
              <div className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2">Average Open Rate</div>
              <div className="text-4xl md:text-5xl font-extrabold text-cyan-400">
                <CountUpNumber value={68} suffix="%" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              Achieved through Deva's personalized template rewriting and semantic variation.
            </p>
          </motion.div>

          {/* Card 4: Email Verification Accuracy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative bg-zinc-900/40 border border-zinc-900 p-8 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-colors group"
          >
            <div className="absolute top-4 right-4 text-cyan-400/20 group-hover:text-cyan-400/40 transition-colors">
              <ShieldCheck size={32} />
            </div>
            <div>
              <div className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2">Verification Accuracy</div>
              <div className="text-4xl md:text-5xl font-extrabold text-emerald-400">
                <CountUpNumber value={95} suffix="%" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              Minimizing domain bounces with MX record checks and structural regex validations.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Styled marquee animation directly in component since Tailwind v4 uses standard CSS */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
