"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import {
  Bot,
  BrainCircuit,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  Mail,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Deva", href: "/dashboard/devaai", icon: Bot },
  { label: "Assets", href: "/dashboard/assets", icon: BrainCircuit },
  { label: "Templates", href: "/dashboard/templates", icon: FileText },
  { label: "Leads", href: "/dashboard/leads", icon: Users },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: Mail },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("Chief");
  const [userEmail, setUserEmail] = useState("");

  const router = useRouter();
  const pathname = usePathname();
  const apiUrl = getApiUrl();

  useEffect(() => {
    const fetchProfile = async (token: string) => {
      try {
        const res = await fetch(`${apiUrl}/settings/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUserName(data.data.full_name || "Chief");
            setUserEmail(data.data.email || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setUserName(session.user?.user_metadata?.full_name || "Chief");
      setUserEmail(session.user?.email || "");
      await fetchProfile(session.access_token);
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          router.replace("/login");
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, [apiUrl, router]);

  const activeTitle = useMemo(() => {
    if (pathname === "/dashboard/settings") return "Settings";
    const current = navItems.find((item) => {
      if (item.href === "/dashboard") return pathname === "/dashboard";
      return pathname.startsWith(item.href);
    });
    return current?.label || "Dashboard";
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarWidth = sidebarOpen ? "lg:w-72" : "lg:w-24";

  const renderSidebar = (mobile = false) => (
    <motion.aside
      initial={mobile ? { x: -320 } : false}
      animate={{ x: 0 }}
      exit={mobile ? { x: -320 } : undefined}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`${
        mobile ? "fixed inset-y-0 left-0 z-50 w-80" : `hidden ${sidebarWidth} lg:flex`
      } flex-col border-r border-white/[0.07] bg-[#070707]/95 text-white backdrop-blur-2xl transition-all duration-300`}
    >
      <div
        className={`relative flex h-20 items-center px-5 ${
          sidebarOpen || mobile ? "justify-between" : "justify-center"
        }`}
      >
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          {(sidebarOpen || mobile) && (
            <>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-sm font-black text-black shadow-lg shadow-cyan-400/20">
                OX
              </div>
              <div className="min-w-0">
                <h1 className="heading-font text-xl font-semibold tracking-tight">
                  OutreachX
                </h1>
                <p className="truncate text-xs text-zinc-500">Deva command center</p>
              </div>
            </>
          )}
        </Link>

        {mobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-zinc-300"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={() => setSidebarOpen((value) => !value)}
            className={`hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-zinc-300 hover:border-cyan-400/30 hover:text-cyan-300 lg:flex ${
              sidebarOpen ? "" : "absolute -right-5 top-5 bg-[#0a0a0a]"
            }`}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              size={18}
              className={`transition-transform duration-300 ${
                sidebarOpen ? "" : "rotate-180"
              }`}
            />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2 px-4 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              onClick={() => mobile && setMobileOpen(false)}
              title={!sidebarOpen && !mobile ? item.label : undefined}
              className={`group relative flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-cyan-400 text-black shadow-lg shadow-cyan-400/10"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
              }`}
            >
              <Icon size={19} className="shrink-0" />
              {(sidebarOpen || mobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 p-4">
        <Link
          href="/dashboard/settings"
          onClick={() => mobile && setMobileOpen(false)}
          className={`flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium ${
            pathname.startsWith("/dashboard/settings")
              ? "bg-white text-black"
              : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
          }`}
        >
          <Settings size={19} />
          {(sidebarOpen || mobile) && <span>Settings</span>}
        </Link>
      </div>
    </motion.aside>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-white">
      {renderSidebar()}

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            {renderSidebar(true)}
          </>
        )}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#050505]/85 px-4 backdrop-blur-2xl lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-zinc-300 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
                {activeTitle}
              </p>
              <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
                Welcome back, {userName?.split(" ")?.[0] || "Chief"}
              </h2>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="text-right">
              <p className="truncate text-sm font-medium text-zinc-200">
                {userName || "Chief"}
              </p>
              <p className="max-w-[150px] truncate text-xs text-zinc-500">
                {userEmail}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-sm font-bold text-cyan-300">
              {(userName || "C").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
