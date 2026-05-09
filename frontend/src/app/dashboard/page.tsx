"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileText,
  Mail,
  MousePointerClick,
  Plus,
  Radio,
  Reply,
  Settings,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  status?: string;
  total_leads?: number;
  sent_count?: number;
  opened_count?: number;
  clicked_count?: number;
  replied_count?: number;
  failed_count?: number;
  created_at?: string;
};

type Profile = {
  full_name?: string;
  app_password_verified?: boolean;
};

type TemplateSummary = {
  id: string;
  name?: string;
};

type LeadFileSummary = {
  id: string;
  file_name?: string;
};

type AssetSummary = {
  id: string;
  name?: string;
  asset_type?: string;
  status?: string;
  is_verified?: boolean;
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: index * 0.05 },
  }),
};

const compactNumber = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(value || 0);

export default function Dashboard() {
  const apiUrl = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [leadFiles, setLeadFiles] = useState<LeadFileSummary[]>([]);
  const [assets, setAssets] = useState<AssetSummary[]>([]);

  useEffect(() => {
    const fetchJson = async (url: string, token: string) => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        return res.json();
      } catch (err) {
        // Silently handle fetch errors if backend is not available
        return null;
      }
    };

    const hydrateDashboard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      try {
        const token = session.access_token;
        const [profileRes, campaignsRes, templatesRes, leadsRes, assetsRes] =
          await Promise.all([
            fetchJson(`${apiUrl}/settings/profile`, token),
            fetchJson(`${apiUrl}/campaigns`, token),
            fetchJson(`${apiUrl}/templates`, token),
            fetchJson(`${apiUrl}/leads`, token),
            fetchJson(`${apiUrl}/assets`, token),
          ]);

        setProfile({
          full_name:
            profileRes?.data?.full_name ||
            session.user?.user_metadata?.full_name ||
            "Chief",
          app_password_verified: Boolean(
            profileRes?.data?.app_password_verified
          ),
        });
        setCampaigns(campaignsRes?.data || campaignsRes || []);
        setTemplates(templatesRes?.data || []);
        setLeadFiles(leadsRes?.data || []);
        setAssets(assetsRes?.data || []);
      } catch (error) {
        // Silently handle fetch errors if backend is not available
      } finally {
        setLoading(false);
      }
    };

    hydrateDashboard();
  }, [apiUrl]);

  const analytics = useMemo(() => {
    const totals = campaigns.reduce(
      (acc, campaign) => {
        acc.leads += campaign.total_leads || 0;
        acc.sent += campaign.sent_count || 0;
        acc.opened += campaign.opened_count || 0;
        acc.clicked += campaign.clicked_count || 0;
        acc.replied += campaign.replied_count || 0;
        acc.failed += campaign.failed_count || 0;
        if (campaign.status === "running") acc.running += 1;
        if (campaign.status === "draft") acc.draft += 1;
        return acc;
      },
      {
        leads: 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        failed: 0,
        running: 0,
        draft: 0,
      }
    );

    const rate = (part: number, whole: number) =>
      whole > 0 ? Math.round((part / whole) * 100) : 0;

    return {
      ...totals,
      openRate: rate(totals.opened, totals.sent),
      replyRate: rate(totals.replied, totals.sent),
      clickRate: rate(totals.clicked, totals.sent),
      deliveryHealth: rate(totals.sent - totals.failed, totals.sent),
    };
  }, [campaigns]);

  const firstName = profile.full_name?.split(" ")?.[0] || "Chief";
  const validAssets = assets.filter((asset) => {
    const status = (asset.status || "").toLowerCase();
    return (
      asset.is_verified ||
      ["valid", "verified", "success", "active", "completed"].includes(status)
    );
  }).length;

  const modules = [
    {
      title: "Deva",
      href: "/dashboard/devaai",
      icon: Bot,
      stat: "AI command layer",
      detail: "Generate strategy, workflows, and campaign operations.",
      accent: "text-cyan-300",
    },
    {
      title: "Assets",
      href: "/dashboard/assets",
      icon: BrainCircuit,
      stat: `${compactNumber(validAssets)} / ${compactNumber(assets.length)} valid sources`,
      detail: "Uploaded links, documents, and text used as AI context.",
      accent: "text-indigo-300",
    },
    {
      title: "Templates",
      href: "/dashboard/templates",
      icon: FileText,
      stat: `${compactNumber(templates.length)} templates`,
      detail: "Personalized email bodies, variables, and previews.",
      accent: "text-emerald-300",
    },
    {
      title: "Leads",
      href: "/dashboard/leads",
      icon: Users,
      stat: `${compactNumber(leadFiles.length)} lead files`,
      detail: "CSV and Excel datasets ready for campaigns.",
      accent: "text-sky-300",
    },
    {
      title: "Campaigns",
      href: "/dashboard/campaigns",
      icon: Mail,
      stat: `${compactNumber(campaigns.length)} campaigns`,
      detail: `${analytics.running} running, ${analytics.draft} in draft.`,
      accent: "text-rose-300",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      stat: profile.app_password_verified ? "Email verified" : "Needs setup",
      detail: "Profile, security, SMTP, and account access.",
      accent: profile.app_password_verified ? "text-emerald-300" : "text-orange-300",
    },
  ];

  const statCards = [
    {
      label: "Emails Sent",
      value: compactNumber(analytics.sent),
      icon: Mail,
      helper: `${analytics.deliveryHealth}% delivery health`,
    },
    {
      label: "Open Rate",
      value: `${analytics.openRate}%`,
      icon: BarChart3,
      helper: `${compactNumber(analytics.opened)} opened`,
    },
    {
      label: "Reply Rate",
      value: `${analytics.replyRate}%`,
      icon: Reply,
      helper: `${compactNumber(analytics.replied)} replies`,
    },
    {
      label: "Active Campaigns",
      value: compactNumber(analytics.running),
      icon: Radio,
      helper: `${compactNumber(analytics.leads)} leads in motion`,
    },
  ];

  const funnel = [
    { label: "Sent", value: analytics.sent, color: "bg-cyan-400" },
    { label: "Opened", value: analytics.opened, color: "bg-emerald-400" },
    { label: "Clicked", value: analytics.clicked, color: "bg-indigo-400" },
    { label: "Replied", value: analytics.replied, color: "bg-amber-400" },
  ];

  const maxFunnel = Math.max(...funnel.map((item) => item.value), 1);
  const recentCampaigns = campaigns.slice(0, 4);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-[#050505] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:88px_88px] opacity-[0.05]" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-8">
        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6 shadow-2xl shadow-black/30 sm:p-8"
          >
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                <Workflow size={13} />
                Outreach ecosystem live
              </div>

              <h1 className="heading-font max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                Your Deva, Assets, Templates, Leads, Campaigns, and Settings
                now sit in one command view with the signals that matter most.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/campaigns"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-black hover:bg-cyan-300"
                >
                  <Plus size={17} />
                  New Campaign
                </Link>
                <Link
                  href="/dashboard/devaai"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-medium text-zinc-100 hover:border-cyan-400/30"
                >
                  Ask Deva
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-zinc-900 to-black p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">System Readiness</p>
                <h2 className="mt-1 text-2xl font-semibold">Launch score</h2>
              </div>
              <CheckCircle2 className="text-emerald-300" size={28} />
            </div>

            <div className="mt-7 space-y-4">
              {[
                ["Lead data", leadFiles.length > 0],
                ["Valid assets", validAssets > 0],
                ["Templates", templates.length > 0],
                ["Email config", profile.app_password_verified],
                ["Campaign flow", campaigns.length > 0],
              ].map(([label, ready]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{label}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      ready
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {ready ? "Ready" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="rounded-[24px] border border-white/[0.07] bg-white/[0.035] p-5 hover:border-cyan-400/25"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-2xl bg-white/[0.05] p-3 text-cyan-300">
                    <Icon size={21} />
                  </div>
                  <TrendingUp size={18} className="text-emerald-300" />
                </div>
                <p className="mt-5 text-sm text-zinc-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-semibold">{stat.value}</p>
                <p className="mt-2 text-xs text-zinc-500">{stat.helper}</p>
              </motion.div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Analytics</h2>
                <p className="mt-1 text-sm text-zinc-500">Campaign funnel performance</p>
              </div>
              <BarChart3 className="text-cyan-300" />
            </div>

            <div className="mt-7 space-y-5">
              {funnel.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className="font-medium">{compactNumber(item.value)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-900">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max((item.value / maxFunnel) * 100, item.value ? 8 : 0)}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {[
                ["Open", `${analytics.openRate}%`],
                ["Click", `${analytics.clickRate}%`],
                ["Reply", `${analytics.replyRate}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-black/30 p-4 text-center">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Connected Modules</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Jump directly into any part of your outreach stack.
                </p>
              </div>
              <MousePointerClick className="text-cyan-300" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {modules.map((module, index) => {
                const Icon = module.icon;
                return (
                  <motion.div
                    key={module.title}
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Link
                      href={module.href}
                      className="group flex h-full items-start gap-4 rounded-2xl border border-white/[0.06] bg-black/25 p-4 hover:border-cyan-400/25 hover:bg-white/[0.05]"
                    >
                      <div className={`rounded-2xl bg-white/[0.05] p-3 ${module.accent}`}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-white">{module.title}</h3>
                          <ArrowRight
                            size={16}
                            className="shrink-0 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-cyan-300"
                          />
                        </div>
                        <p className={`mt-1 text-sm font-medium ${module.accent}`}>
                          {module.stat}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          {module.detail}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Recent Campaigns</h2>
                <p className="mt-1 text-sm text-zinc-500">Latest campaign health snapshot</p>
              </div>
              <Link href="/dashboard/campaigns" className="text-sm text-cyan-300">
                View all
              </Link>
            </div>

            {recentCampaigns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
                No campaigns yet. Create one when your leads and templates are ready.
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign) => {
                  const total = campaign.total_leads || 0;
                  const processed =
                    (campaign.sent_count || 0) + (campaign.failed_count || 0);
                  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

                  return (
                    <Link
                      key={campaign.id}
                      href="/dashboard/campaigns"
                      className="block rounded-2xl border border-white/[0.06] bg-black/25 p-4 hover:border-cyan-400/25"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate font-medium text-white">{campaign.name}</h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            {compactNumber(processed)} of {compactNumber(total)} processed
                          </p>
                        </div>
                        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                          {campaign.status || "draft"}
                        </span>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-900">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-zinc-900 to-black p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300">
                <Database size={22} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Next Best Actions</h2>
                <p className="mt-1 text-sm text-zinc-500">Fast path to a launch-ready stack</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                {
                  label: "Upload lead data",
                  done: leadFiles.length > 0,
                  href: "/dashboard/leads",
                },
                {
                  label: "Create or refine a template",
                  done: templates.length > 0,
                  href: "/dashboard/templates",
                },
                {
                  label: "Verify sending account",
                  done: profile.app_password_verified,
                  href: "/dashboard/settings",
                },
                {
                  label: "Launch a campaign",
                  done: analytics.running > 0,
                  href: "/dashboard/campaigns",
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 hover:border-cyan-400/25"
                >
                  <span className="text-sm text-zinc-200">{item.label}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      item.done
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-cyan-400/10 text-cyan-300"
                    }`}
                  >
                    {item.done ? "Done" : "Open"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
