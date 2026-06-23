"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "What is OutreachX and how does it protect my email reputation?",
      answer: "OutreachX is an AI-powered operating system for cold outreach. Unlike traditional spammers that blast thousands of emails at once, OutreachX uses localized sending queues with random delays (jitter) and respects strict Gmail/Outlook daily limits (max 50/hour). This mimics natural human behavior, keeping your domain from being flagged."
    },
    {
      question: "What does Deva AI do?",
      answer: "Deva is an autonomous AI agent that orchestrates 10 specialized mini-agents. Deva can scrape decision-maker leads off directories, verify MX records to avoid email bounces, analyze uploaded files (like resumes) to capture context hooks, rewrite subject lines/bodies in under 0.8s, and schedule sender campaigns."
    },
    {
      question: "Is my credential configuration safe?",
      answer: "Absolutely. OutreachX implements SOC 2-aligned bank-grade privacy standards. We highly recommend connecting via Google Workspace OAuth2 (which means we never touch or see your password). For custom SMTP setups, credentials are encrypted using AES-256 with keys stored in isolated server Environment Variables. You can also select to delete all credential caches immediately after your campaign runs."
    },
    {
      question: "What email services are supported?",
      answer: "We support direct Google OAuth authentication, Microsoft Outlook servers, and custom SMTP/IMAP inboxes. Decoupled sender loops allow you to authenticate any custom email server and launch campaigns securely."
    },
    {
      question: "Is the beta really free?",
      answer: "Yes, the early beta is 100% free with no credit card required. You can send your first 500 emails, parse assets, scrape leads, and use Deva AI at zero cost. We want to gather early adoption feedback to refine our multi-agent scheduling logic."
    }
  ];

  return (
    <section className="bg-zinc-950 py-24 border-t border-zinc-900" id="faq">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-900/60 px-3.5 py-1.5 rounded-full mb-4">
            <HelpCircle size={12} /> FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 className="heading-font text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Got Questions? We Have Answers
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            Everything you need to know about setting up SMTP inboxes, targeting, and safe email limits.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;

            return (
              <div
                key={index}
                className="bg-zinc-900/20 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-colors"
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <span className="heading-font font-bold text-white text-base hover:text-cyan-300 transition-colors">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-zinc-500 shrink-0 ml-4"
                  >
                    <ChevronDown size={20} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-zinc-400 text-sm leading-relaxed border-t border-zinc-900/50 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
