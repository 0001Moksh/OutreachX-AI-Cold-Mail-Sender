"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

interface HeaderProps {
  session: any;
}

export default function Header({ session }: HeaderProps) {
  return (
    <nav className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* LOGO & BRAND */}
        <Link href="/" className="flex items-center gap-x-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/25 blur-md rounded-full group-hover:bg-cyan-500/40 transition-colors" />
            <Image
              src="/logo1.png"
              alt="OutreachX Logo"
              width={48}
              height={48}
              className="h-10 w-auto relative z-10 hover:scale-105 transition-transform duration-300"
            />
          </div>
          <span className="heading-font text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            OutreachX
          </span>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-400 text-zinc-950 rounded-full flex items-center gap-x-0.5">
            AI <Sparkles size={10} className="fill-zinc-950" />
          </span>
        </Link>

        {/* NAVIGATION LINKS */}
        <div className="hidden md:flex items-center gap-x-8 text-sm font-medium text-zinc-400">
          <a href="#deva" className="hover:text-cyan-400 hover:scale-102 transition-all">Meet Deva</a>
          <a href="#workflow" className="hover:text-cyan-400 hover:scale-102 transition-all">Workflow</a>
          <a href="#features" className="hover:text-cyan-400 hover:scale-102 transition-all">Features</a>
          <a href="#showcase" className="hover:text-cyan-400 hover:scale-102 transition-all">Showcase</a>
          <a href="#security" className="hover:text-cyan-400 hover:scale-102 transition-all">Security</a>
          <a href="#pricing" className="hover:text-cyan-400 hover:scale-102 transition-all">Pricing</a>
        </div>

        {/* CTA BUTTONS */}
        <div className="flex items-center gap-x-4">
          {session ? (
            <Link
              href="/dashboard"
              className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-zinc-950 text-sm font-semibold rounded-full flex items-center gap-x-2 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-medium text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-full transition-all"
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="px-6 py-2 bg-white text-zinc-950 hover:bg-cyan-400 hover:text-white text-sm font-semibold rounded-full flex items-center gap-x-2 shadow-lg shadow-white/5 hover:shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
              >
                Start Campaign Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
