"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Lock, CheckCircle, Users, Send, PlayCircle, ShieldHalf, Globe, Server, EyeOff, Sparkles } from "lucide-react";

export default function LandingPage() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      {/* NAVBAR */}
      <nav className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <div className="w-9 h-9 bg-cyan-400 rounded-2xl flex items-center justify-center text-zinc-950 text-2xl shadow-inner">
              🚀
            </div>
            <h1 className="heading-font text-3xl tracking-tight">OutreachX</h1>
            <span className="px-3 py-1 text-xs font-medium bg-cyan-400 text-zinc-950 rounded-3xl">AI</span>
          </div>

          <div className="hidden md:flex items-center gap-x-8 text-sm font-medium">
            <a href="#how" className="hover:text-cyan-400">How it Works</a>
            <a href="#workflow" className="hover:text-cyan-400">Workflow</a>
            <a href="#security" className="hover:text-cyan-400">Security</a>
          </div>

          <div className="flex items-center gap-x-4">
            {session ? (
              <Link href="/dashboard" className="px-8 py-2.5 bg-white text-zinc-950 hover:bg-cyan-400 hover:text-white font-semibold rounded-3xl flex items-center gap-x-2 shadow-lg shadow-cyan-500/30">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-6 py-2.5 text-sm font-medium border border-white/30 hover:border-white/70 rounded-3xl flex items-center gap-x-2">
                  Log in
                </Link>
                <Link href="/login" className="px-8 py-2.5 bg-white text-zinc-950 hover:bg-cyan-400 hover:text-white font-semibold rounded-3xl flex items-center gap-x-2 shadow-lg shadow-cyan-500/30">
                  Start Campaign Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="bg-gradient-to-r from-[#0a0a0a] to-[#1a1a2e] pt-16 pb-24">
        <div className="max-w-screen-2xl mx-auto px-8 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-x-2 bg-white/10 text-cyan-300 text-sm font-medium px-5 py-2 rounded-3xl mb-6 backdrop-blur-md border border-white/5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
              </span>
              NOW IN BETA — 100% FREE FOR FIRST 500 USERS
            </div>
            
            <h1 className="heading-font text-6xl md:text-7xl leading-none tracking-tight mb-6">
              Your AI-Powered<br/>Cold Outreach<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-white">Operating System</span>
            </h1>
            
            <p className="text-xl text-zinc-400 max-w-lg mb-10">
              Secure email verification • Smart lead collection • Hyper-personalized AI emails • Bulk delivery with safety limits.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="px-10 py-6 bg-white text-zinc-950 text-xl font-semibold rounded-3xl flex items-center justify-center gap-x-3 hover:scale-105 transition-transform shadow-lg shadow-cyan-500/20">
                <Send size={24} />
                Start Your First Campaign
              </Link>
              <button className="px-8 py-6 border border-white/30 hover:border-cyan-400 rounded-3xl flex items-center justify-center gap-x-3 text-lg transition-colors">
                <PlayCircle size={24} />
                Watch 2-minute demo
              </button>
            </div>
            
            <div className="flex items-center gap-x-8 mt-12 text-sm">
              <div className="flex items-center gap-x-2">
                <Lock className="text-cyan-400" size={18} />
                <div>
                  <div className="font-medium">OAuth + AES encrypted</div>
                  <div className="text-zinc-500">Zero password risk</div>
                </div>
              </div>
              <div className="h-8 w-px bg-white/20"></div>
              <div className="flex items-center gap-x-2">
                <CheckCircle className="text-emerald-400" size={18} />
                <div>
                  <div className="font-medium">Gmail safe limits respected</div>
                  <div className="text-zinc-500">Never get flagged</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-5 relative">
            <div className="bg-zinc-900/70 backdrop-blur-3xl border border-white/10 rounded-3xl p-3 shadow-2xl">
              <div className="bg-gradient-to-br from-zinc-800 to-black rounded-3xl p-8 relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-x-3">
                    <div className="w-8 h-8 bg-cyan-400 rounded-2xl flex items-center justify-center text-xl">📧</div>
                    <div>
                      <div className="font-semibold">Campaign: "Frontend Roles"</div>
                      <div className="text-xs text-emerald-400">• 347 sent • 42 replies</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-semibold text-cyan-300">68%</div>
                    <div className="text-xs -mt-1 text-zinc-400">Open rate</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-x-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="text-cyan-400">👋</div>
                    <div className="flex-1">
                      <div className="flex justify-between"><span className="font-medium text-sm">Hi Priya, your React skills...</span></div>
                      <div className="text-xs text-zinc-400 mt-1">priya@zomato.com • 3m ago</div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-cyan-400 to-indigo-500 text-zinc-950 text-xs font-bold px-6 py-2 rounded-3xl flex items-center gap-x-2 shadow-xl rotate-12">
                  <Sparkles size={14} />
                  AI PERSONALIZED
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FINAL CTA */}
      <div className="max-w-screen-2xl mx-auto px-8 py-24 text-center border-t border-white/10">
        <h2 className="heading-font text-5xl">Ready to run your first intelligent campaign?</h2>
        <p className="text-2xl text-zinc-400 mt-4">Takes 3 minutes. Zero risk.</p>
        <Link href="/login" className="mt-10 px-14 py-7 text-2xl bg-gradient-to-r from-cyan-400 to-white text-zinc-950 font-semibold rounded-3xl inline-flex items-center gap-x-4 hover:shadow-2xl hover:shadow-cyan-400/40 transition-shadow">
          <span>Launch OutreachX</span>
          <ArrowRight />
        </Link>
        <p className="text-xs text-zinc-500 mt-8">Free forever for first 500 emails • No credit card needed</p>
      </div>
    </div>
  );
}
