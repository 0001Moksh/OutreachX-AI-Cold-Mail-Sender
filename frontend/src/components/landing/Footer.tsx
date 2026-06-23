"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 pt-20 pb-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Upper Column Rows */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-16 border-b border-zinc-900">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-x-2.5">
              <Image
                src="/logo1.png"
                alt="OutreachX Logo"
                width={36}
                height={36}
                className="h-8 w-auto"
              />
              <span className="heading-font text-lg font-bold text-white tracking-tight">OutreachX</span>
              <span className="px-2 py-0.5 text-[9px] bg-cyan-400 text-zinc-950 rounded-full font-bold">AI</span>
            </Link>
            <p className="text-zinc-500 text-xs leading-relaxed max-w-sm">
              OutreachX is an AI Operating System for Outreach. Deploy autonomous agents to discover leads, verify email mailboxes, and compose hyper-personalized templates safely.
            </p>
          </div>

          {/* Platform Links */}
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px] text-zinc-500">Platform</h4>
            <ul className="space-y-2.5">
              <li><a href="#deva" className="text-zinc-400 hover:text-cyan-400 transition-colors">Meet Deva AI</a></li>
              <li><a href="#workflow" className="text-zinc-400 hover:text-cyan-400 transition-colors">Workflow Loop</a></li>
              <li><a href="#features" className="text-zinc-400 hover:text-cyan-400 transition-colors">OS Features</a></li>
              <li><a href="#showcase" className="text-zinc-400 hover:text-cyan-400 transition-colors">Workspace Demo</a></li>
            </ul>
          </div>

          {/* Trust & Security */}
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px] text-zinc-500">Trust Layer</h4>
            <ul className="space-y-2.5">
              <li><a href="#security" className="text-zinc-400 hover:text-cyan-400 transition-colors">Data Security</a></li>
              <li><a href="#security" className="text-zinc-400 hover:text-cyan-400 transition-colors">OAuth Integration</a></li>
              <li><a href="#security" className="text-zinc-400 hover:text-cyan-400 transition-colors">AES Encryption</a></li>
              <li><a href="#faq" className="text-zinc-400 hover:text-cyan-400 transition-colors">FAQ accordion</a></li>
            </ul>
          </div>

          {/* Legal / Company */}
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px] text-zinc-500">Resource</h4>
            <ul className="space-y-2.5">
              <li><Link href="/login" className="text-zinc-400 hover:text-cyan-400 transition-colors">Log In Console</Link></li>
              <li><Link href="/signup" className="text-zinc-400 hover:text-cyan-400 transition-colors">Register Free</Link></li>
              <li><a href="#pricing" className="text-zinc-400 hover:text-cyan-400 transition-colors">Beta Tiers</a></li>
            </ul>
          </div>

        </div>

        {/* Lower Row (Credits, Live Status Lights, Copyright) */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-y-4 text-[10px] text-zinc-500 font-mono">
          
          {/* Status Lights */}
          <div className="flex items-center gap-x-4">
            <div className="flex items-center gap-x-1.5 bg-zinc-900/50 px-2.5 py-1 rounded-md border border-zinc-900">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span>Deva Core: Operational</span>
            </div>
            <div className="flex items-center gap-x-1.5 bg-zinc-900/50 px-2.5 py-1 rounded-md border border-zinc-900">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span>SMTP Queue: Idle / OK</span>
            </div>
          </div>

          {/* Copyright */}
          <div>
            &copy; {new Date().getFullYear()} OutreachX AI. All rights reserved.
          </div>

          {/* Credit */}
          <div className="flex items-center gap-x-1 text-zinc-650 hover:text-zinc-400 transition-colors">
            <span>Made for value-first outreach with</span>
            <Heart size={10} className="text-rose-500 fill-rose-500" />
          </div>

        </div>

      </div>
    </footer>
  );
}
