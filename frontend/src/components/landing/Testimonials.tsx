"use client";

import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Quote } from "lucide-react";

export default function Testimonials() {
  const reviews = [
    {
      name: "Siddharth Verma",
      role: "Founder",
      company: "Aether AI",
      quote: "Using Deva we built a list of 250 European CTOs and sent highly personalized letters. Within 2 weeks we booked 18 calls and closed 3 contracts.",
      avatar: "SV"
    },
    {
      name: "Clara Becker",
      role: "Lead Recruiter",
      company: "Voxel Labs",
      quote: "Recruiting frontend roles is hyper-competitive. OutreachX let us reach decision makers directly with parsed portfolio details. The reply rate was 42%!",
      avatar: "CB"
    },
    {
      name: "Jason Wright",
      role: "Growth Manager",
      company: "FlowGen",
      quote: "We previously got flagged by Google's spam filters using bulk mail tools. OutreachX's sending delay jitter completely resolved that. Zero bans since.",
      avatar: "JW"
    },
    {
      name: "Meera Nair",
      role: "CEO",
      company: "Cyberlabs",
      quote: "Bank-grade OAuth and AES encryption were mandatory for our security reviews. OutreachX passed with ease. A game changer for ethical outreach.",
      avatar: "MN"
    }
  ];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900 overflow-hidden relative" id="testimonials">
      {/* Background radial highlight */}
      <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-indigo-950/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <MessageSquare size={12} /> USER REVIEWS
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Loved by Modern Growth Teams
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Read what other founders, recruiters, and marketers say about automating campaigns safely with OutreachX.
          </p>
        </div>

        {/* Testimonials Infinite Marquee */}
        <div className="relative w-full overflow-hidden before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-24 before:bg-gradient-to-r before:from-zinc-950 before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-24 after:bg-gradient-to-l after:from-zinc-950 after:to-transparent py-4">
          <div className="flex w-[200%] gap-x-6 animate-[marquee_25s_linear_infinite]">
            {/* Sequence 1 */}
            <div className="flex justify-around items-center w-1/2 gap-6">
              {reviews.map((rev, index) => (
                <div
                  key={index}
                  className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl w-[320px] h-[220px] flex flex-col justify-between hover:border-zinc-700 transition-colors backdrop-blur-md relative"
                >
                  <Quote size={24} className="text-cyan-500/10 absolute top-4 right-4" />
                  <p className="text-zinc-350 text-xs leading-relaxed italic">
                    "{rev.quote}"
                  </p>
                  <div className="flex items-center gap-3 mt-4 border-t border-zinc-900 pt-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-xs text-cyan-400">
                      {rev.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs">{rev.name}</div>
                      <div className="text-[10px] text-zinc-500">{rev.role} at {rev.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sequence 2 (duplicate) */}
            <div className="flex justify-around items-center w-1/2 gap-6">
              {reviews.map((rev, index) => (
                <div
                  key={`dup-${index}`}
                  className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl w-[320px] h-[220px] flex flex-col justify-between hover:border-zinc-700 transition-colors backdrop-blur-md relative"
                >
                  <Quote size={24} className="text-cyan-500/10 absolute top-4 right-4" />
                  <p className="text-zinc-350 text-xs leading-relaxed italic">
                    "{rev.quote}"
                  </p>
                  <div className="flex items-center gap-3 mt-4 border-t border-zinc-900 pt-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-xs text-cyan-400">
                      {rev.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs">{rev.name}</div>
                      <div className="text-[10px] text-zinc-500">{rev.role} at {rev.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
