"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Database,
  Users,
  Mail,
  Settings,
  Search,
  Bell
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState<string>("User Profile");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchProfile = async (token: string) => {
      try {
        const res = await fetch("http://127.0.0.1:8000/settings/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.full_name) {
            setUserName(data.data.full_name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
      } else {
        setSession(session);
        if (session.user?.user_metadata?.full_name) {
          setUserName(session.user.user_metadata.full_name);
        }
        await fetchProfile(session.access_token);
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          router.replace("/login");
        } else {
          setSession(session);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true;
    if (path !== '/dashboard' && pathname.startsWith(path)) return true;
    return false;
  };

  const navItemClass = (path: string) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
    isActive(path) 
      ? 'bg-cyan-400/10 text-cyan-400 font-medium' 
      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
  }`;

  return (
    <div className="flex w-full h-screen overflow-hidden bg-zinc-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center text-zinc-950 shadow-lg shadow-cyan-500/20">
            🚀
          </div>
          <h1 className="text-2xl font-semibold tracking-tight heading-font">OutreachX</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <Link href="/dashboard" className={navItemClass('/dashboard')}>
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link href="/dashboard/devaai" className={navItemClass('/dashboard/devaai')}>
            <Bot size={20} />
            Deva AI Agent
          </Link>
          <Link href="/dashboard/templates" className={navItemClass('/dashboard/templates')}>
            <FileText size={20} />
            Templates
          </Link>
          <Link href="/dashboard/assets" className={navItemClass('/dashboard/assets')}>
            <Database size={20} />
            Assets
          </Link>
          <Link href="/dashboard/leads" className={navItemClass('/dashboard/leads')}>
            <Users size={20} />
            Leads
          </Link>
          <Link href="/dashboard/campaigns" className={navItemClass('/dashboard/campaigns')}>
            <Mail size={20} />
            Campaigns
          </Link>
        </nav>

        <div className="p-4 mt-auto">
          <Link href="/dashboard/settings" className={navItemClass('/dashboard/settings')}>
            <Settings size={20} />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Top Header */}
        <header className="h-20 border-b border-zinc-800 px-8 flex items-center justify-between glass-panel z-10 sticky top-0 bg-zinc-950/80 backdrop-blur-md">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-zinc-200 placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="text-zinc-400 hover:text-white transition-colors relative">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-3 border-l border-zinc-800 pl-6">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-sm font-semibold shadow-lg shadow-cyan-500/20">
                {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-sm">
                <p className="font-medium text-zinc-200">{userName}</p>
                <p className="text-zinc-500 text-xs">{session?.user?.email || 'user@outreachx.io'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
