'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/api';

import {
  Plus,
  Pause,
  Trash2,
  Loader,
  ChevronRight,
  CheckCircle2,
  ChevronLeft,
  Send,
  Check,
  Sparkles,
  X,
} from 'lucide-react';

interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status:
    | 'draft'
    | 'scheduled'
    | 'running'
    | 'paused'
    | 'completed'
    | 'failed';
  template_id?: string;
  variable_mapping?: Record<string, string>;
  lead_ids?: string[];
  total_leads?: number;
  sent_count?: number;
  opened_count?: number;
  clicked_count?: number;
  replied_count?: number;
  bounced_count?: number;
  failed_count?: number;
  created_at: string;
  updated_at?: string;
}

interface LeadFile {
  id: string;
  file_name: string;
  columns: string[];
}

interface Template {
  id: string;
  name: string;
  subject_line: string;
  html_content?: string;
  text_content?: string;
  description?: string;
  is_ai_generated?: boolean;
  tags?: string[];
  variables?: Record<string, any> | string[];
  created_at?: string;
  updated_at?: string;
}

export default function CampaignsPage() {
  const apiUrl = getApiUrl();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    description: string;
  }>({
    name: '',
    description: '',
  });

  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([]);
  const [selectedLeadFiles, setSelectedLeadFiles] = useState<string[]>([]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [mapping, setMapping] = useState<Record<string, string>>({});

  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);

  const handleEdit = (campaign: Campaign) => {
    setFormData({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description || '',
    });
    setSelectedTemplate(campaign.template_id || '');
    setSelectedLeadFiles(campaign.lead_ids || []);
    setMapping(campaign.variable_mapping || {});
    setStep(1);
    setShowWizard(true);
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      const token = (
        await supabase.auth.getSession()
      ).data.session?.access_token;

      const response = await fetch(`${apiUrl}/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch campaigns');

      const data = await response.json();

      setCampaigns(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchCampaigns();

    const interval = setInterval(fetchCampaigns, 10000);

    return () => clearInterval(interval);
  }, [fetchCampaigns]);

  useEffect(() => {
    if (showWizard && step === 2 && leadFiles.length === 0) {
      fetchLeadFiles();
    }

    if (showWizard && step === 3 && templates.length === 0) {
      fetchTemplates();
    }
  }, [showWizard, step]);

  const fetchLeadFiles = async () => {
    const token = (
      await supabase.auth.getSession()
    ).data.session?.access_token;

    const res = await fetch(`${apiUrl}/leads`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      setLeadFiles(data.data || []);
    }
  };

  const fetchTemplates = async () => {
    const token = (
      await supabase.auth.getSession()
    ).data.session?.access_token;

    const res = await fetch(`${apiUrl}/templates`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      setTemplates(data.data || []);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !formData.name) {
      alert('Please enter campaign name');
      return;
    }

    if (step === 2 && selectedLeadFiles.length === 0) {
      alert('Please select leads');
      return;
    }

    if (step === 3 && !selectedTemplate) {
      alert('Please select template');
      return;
    }

    setStep((s) => s + 1);
  };

  const handleCreateCampaign = async () => {
    try {
      setCreating(true);

      const token = (
        await supabase.auth.getSession()
      ).data.session?.access_token;

      const isEditing = !!formData.id;

      const url = isEditing
        ? `${apiUrl}/campaigns/${formData.id}`
        : `${apiUrl}/campaigns`;

      const payload = {
        name: formData.name,
        description: formData.description,
        template_id: selectedTemplate,
        lead_ids: selectedLeadFiles,
      };

      const createRes = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) throw new Error('Failed to save campaign');

      const createData = await createRes.json();

      const campaignId = createData.data.campaign_id;

      await fetch(`${apiUrl}/campaigns/${campaignId}/mapping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mapping }),
      });

      setShowWizard(false);
      setStep(1);

      setFormData({
        name: '',
        description: '',
      });

      setSelectedLeadFiles([]);
      setSelectedTemplate('');
      setMapping({});

      await fetchCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete campaign?')) return;

    const token = (
      await supabase.auth.getSession()
    ).data.session?.access_token;

    await fetch(`${apiUrl}/campaigns/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    fetchCampaigns();
  };

  const handlePause = async (id: string) => {
    const token = (
      await supabase.auth.getSession()
    ).data.session?.access_token;

    await fetch(`${apiUrl}/campaigns/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'paused',
      }),
    });

    fetchCampaigns();
  };

  const handleTestEmail = async (campaignId: string) => {
    if (!testEmail) {
      alert('Enter test email');
      return;
    }

    try {
      setTesting(true);

      const token = (
        await supabase.auth.getSession()
      ).data.session?.access_token;

      const res = await fetch(`${apiUrl}/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          test_email: testEmail,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      alert('Test email sent');
    } catch {
      alert('Error sending test');
    } finally {
      setTesting(false);
    }
  };

  const verifyAppPasswordAndLaunch = async (campaignId: string) => {
    try {
      setLaunchingId(campaignId);
      setVerifying(true);

      const token = (
        await supabase.auth.getSession()
      ).data.session?.access_token;

      const res = await fetch(`${apiUrl}/campaigns/${campaignId}/launch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();

        throw new Error(
          errData.detail || errData.message || 'Launch failed'
        );
      }

      alert('Campaign launched');

      fetchCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setLaunchingId(null);
      setVerifying(false);
    }
  };

  const normalizeTemplateVariables = (
    variables?: Record<string, any> | string[]
  ) => {
    if (!variables) return [];

    if (Array.isArray(variables)) {
      return variables
        .filter(Boolean)
        .map((v) => String(v).trim())
        .filter(Boolean);
    }

    if (typeof variables === 'object') {
      return Object.keys(variables)
        .filter(Boolean)
        .map((v) => v.trim())
        .filter(Boolean);
    }

    return [];
  };

  const getTemplateVariables = () => {
    const t = templates.find((x) => x.id === selectedTemplate);

    if (!t) return [];

    const extract = (text: string) => {
      const regex = /\{\{([^}]+)\}\}/g;

      const matches = Array.from((text || '').matchAll(regex));

      return matches.map((m) => m[1].trim());
    };

    const fromHtml = extract(t.html_content || '');
    const fromText = extract(t.text_content || '');
    const fromSubject = extract(t.subject_line || '');

    const allVars = new Set([
      ...fromHtml,
      ...fromText,
      ...fromSubject,
    ]);

    normalizeTemplateVariables(t.variables).forEach((v) =>
      allVars.add(v)
    );

    return Array.from(allVars);
  };

  const getAvailableLeadColumns = () => {
    const cols = new Set<string>();

    leadFiles
      .filter((lf) => selectedLeadFiles.includes(lf.id))
      .forEach((lf) => {
        lf.columns?.forEach((c) => cols.add(c));
      });

    return Array.from(cols);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="animate-spin text-cyan-400" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen overflow-y-auto bg-[#070707] text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.08),transparent_35%)] pointer-events-none" />

      <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
        {showWizard ? (
          <div className="max-w-5xl mx-auto rounded-[32px] border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black p-8 shadow-[0_0_80px_rgba(0,255,255,0.08)]">
            <div className="flex justify-between items-center mb-10">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 mb-3">
                  <Sparkles size={18} />
                  <span className="text-sm">
                    Outreach Campaign Builder
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowWizard(false)}
                className="text-zinc-500 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* STEPPER */}
            <div className="mb-12">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-5 left-0 w-full h-[2px] bg-zinc-800" />

                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className="relative z-10 flex flex-col items-center gap-3"
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-semibold border transition-all duration-300
                      ${
                        step >= s
                          ? 'bg-cyan-400 text-black border-cyan-400 shadow-lg shadow-cyan-400/30'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {s}
                    </div>

                    <span className="text-xs text-zinc-500">
                      {s === 1
                        ? 'Info'
                        : s === 2
                        ? 'Leads'
                        : s === 3
                        ? 'Template'
                        : 'Mapping'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* STEP CONTENT */}
            <div className="min-h-[320px]">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-3">
                      Campaign Name
                    </label>

                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
                      }
                      placeholder="Q1 Outreach Campaign"
                      className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-4 text-white backdrop-blur-sm transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-3">
                      Description
                    </label>

                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe your campaign"
                      className="w-full h-40 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-4 text-white backdrop-blur-sm transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid md:grid-cols-2 gap-5">
                  {leadFiles.map((lf) => {
                    const selected =
                      selectedLeadFiles.includes(lf.id);

                    return (
                      <div
                        key={lf.id}
                        onClick={() =>
                          setSelectedLeadFiles((prev) =>
                            selected
                              ? prev.filter((id) => id !== lf.id)
                              : [...prev, lf.id]
                          )
                        }
                        className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-300
                        ${
                          selected
                            ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:-translate-y-1'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">
                              {lf.file_name}
                            </h3>

                            <p className="text-xs text-zinc-500 mt-2">
                              {lf.columns.slice(0, 4).join(', ')}
                            </p>
                          </div>

                          {selected && (
                            <CheckCircle2 className="text-cyan-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 3 && (
                <div className="grid md:grid-cols-2 gap-5">
                  {templates.map((t) => {
                    const selected =
                      selectedTemplate === t.id;

                    return (
                      <div
                        key={t.id}
                        onClick={() =>
                          setSelectedTemplate(t.id)
                        }
                        className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-300
                        ${
                          selected
                            ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:-translate-y-1'
                        }`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-semibold text-white">
                              {t.name}
                            </h3>

                            <p className="text-sm text-zinc-400 mt-2">
                              {t.subject_line}
                            </p>
                          </div>

                          {selected && (
                            <CheckCircle2 className="text-cyan-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  {getTemplateVariables().map((v) => (
                    <div
                      key={v}
                      className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                    >
                      <div className="w-1/3 text-cyan-400 font-mono">
                        {'{{'}
                        {v}
                        {'}}'}
                      </div>

                      <ChevronRight className="text-zinc-600" />

                      <select
                        value={mapping[v] || ''}
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            [v]: e.target.value,
                          })
                        }
                        className="flex-1 rounded-xl border border-zinc-800 bg-black px-4 py-3 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">
                          Select column
                        </option>

                        {getAvailableLeadColumns().map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="flex justify-between mt-10 border-zinc-800">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 1}
                className="flex items-center gap-2 text-zinc-400 hover:text-white disabled:opacity-0"
              >
                <ChevronLeft size={18} />
                Back
              </button>

              {step < 4 ? (
                <button
                  onClick={handleNextStep}
                  className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl font-semibold hover:bg-cyan-300 transition"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleCreateCampaign}
                  disabled={creating}
                  className="flex items-center gap-2 bg-cyan-400 text-black px-6 py-3 rounded-2xl font-semibold hover:bg-cyan-300 transition disabled:opacity-50"
                >
                  {creating ? (
                    <Loader
                      className="animate-spin"
                      size={18}
                    />
                  ) : (
                    <Check size={18} />
                  )}

                  Finish & Create
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-xs mb-4">
                  Outreach Automation
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-white">
                  Campaign Dashboard
                </h1>

                <p className="text-zinc-400 mt-3 max-w-2xl leading-relaxed">
                  Manage automated cold outreach campaigns with
                  real-time analytics.
                </p>
              </div>

              <button
                onClick={() => {
                  setStep(1);
                  setShowWizard(true);
                }}
                className="group flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-2xl font-semibold hover:bg-cyan-300 transition-all duration-300 shadow-lg shadow-cyan-500/10"
              >
                <Plus size={18} />
                New Campaign
              </button>
            </div>

            {/* EMPTY */}
            {campaigns.length === 0 ? (
              <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-16 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.12),transparent_35%)]" />

                <div className="relative z-10">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-500/10 border border-cyan-500/20">
                    <Send
                      className="text-cyan-400"
                      size={36}
                    />
                  </div>

                  <h2 className="text-2xl font-semibold text-white mb-3">
                    No Campaigns Yet
                  </h2>

                  <p className="text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
                    Start your first outreach campaign and
                    automate your lead engagement pipeline.
                  </p>

                  <button
                    onClick={() => {
                      setStep(1);
                      setShowWizard(true);
                    }}
                    className="bg-white text-black px-6 py-3 rounded-2xl font-medium hover:bg-cyan-300 transition"
                  >
                    Create First Campaign
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {campaigns.map((campaign) => {
                  const total =
                    campaign.total_leads || 0;

                  const sent =
                    campaign.sent_count || 0;

                  const failed =
                    campaign.failed_count || 0;

                  const processed = sent + failed;

                  const progress =
                    total > 0
                      ? (processed / total) * 100
                      : 0;

                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.3,
                      }}
                      className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/5"
                    >
                      {/* TOP */}
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-2xl font-semibold text-white">
                            {campaign.name}
                          </h3>

                          <p className="text-zinc-400 mt-2">
                            {campaign.description}
                          </p>
                          <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                            <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                            {campaign.updated_at && (
                              <span>Modified: {new Date(campaign.updated_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span
                            className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-medium
                          ${
                            campaign.status === 'running'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : campaign.status ===
                                'paused'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : campaign.status ===
                                'completed'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                          >
                            {campaign.status}
                          </span>

                          <button
                            onClick={() =>
                              handleDelete(campaign.id)
                            }
                            className="text-zinc-500 hover:text-red-400 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* PROGRESS */}
                      <div className="mb-8">
                        <div className="flex justify-between mb-3">
                          <span className="text-sm text-zinc-400">
                            Campaign Progress
                          </span>

                          <span className="text-sm font-medium text-cyan-400">
                            {Math.round(progress)}%
                          </span>
                        </div>

                        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 text-xs text-zinc-500">
                          {processed} processed out of{' '}
                          {total} leads
                        </div>
                      </div>

                      {/* STATS */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur-sm">
                          <p className="text-xs text-zinc-500 uppercase">
                            Sent
                          </p>

                          <p className="text-2xl font-bold mt-2 text-white">
                            {sent}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur-sm">
                          <p className="text-xs text-zinc-500 uppercase">
                            Opened
                          </p>

                          <p className="text-2xl font-bold mt-2 text-green-400">
                            {campaign.opened_count || 0}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur-sm">
                          <p className="text-xs text-zinc-500 uppercase">
                            Replied
                          </p>

                          <p className="text-2xl font-bold mt-2 text-purple-400">
                            {campaign.replied_count || 0}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur-sm">
                          <p className="text-xs text-zinc-500 uppercase">
                            Failed
                          </p>

                          <p className="text-2xl font-bold mt-2 text-red-400">
                            {failed}
                          </p>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-zinc-800 bg-black/30 p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          {campaign.status === 'draft' && (
                            <>
                              <input
                                type="text"
                                value={testEmail}
                                onChange={(e) =>
                                  setTestEmail(
                                    e.target.value
                                  )
                                }
                                placeholder="Test email"
                                className="rounded-xl border border-zinc-800 bg-black px-4 py-2 focus:outline-none focus:border-cyan-500"
                              />

                              <button
                                onClick={() =>
                                  handleTestEmail(
                                    campaign.id
                                  )
                                }
                                disabled={testing}
                                className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm"
                              >
                                {testing
                                  ? 'Sending...'
                                  : 'Send Test'}
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setViewingCampaign(campaign)}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl transition text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(campaign)}
                            className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-xl transition text-sm"
                          >
                            Edit
                          </button>
                          {(campaign.status === 'draft' ||
                            campaign.status ===
                              'paused') && (
                            <button
                              onClick={() =>
                                verifyAppPasswordAndLaunch(
                                  campaign.id
                                )
                              }
                              disabled={
                                launchingId ===
                                campaign.id
                              }
                              className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-xl font-medium hover:bg-cyan-300 transition"
                            >
                              {launchingId ===
                              campaign.id ? (
                                <Loader
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Send size={16} />
                              )}

                              {launchingId ===
                              campaign.id
                                ? verifying
                                  ? 'Verifying...'
                                  : 'Launching...'
                                : 'Launch'}
                            </button>
                          )}

                          {campaign.status ===
                            'running' && (
                            <button
                              onClick={() =>
                                handlePause(
                                  campaign.id
                                )
                              }
                              className="flex items-center gap-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-5 py-2 rounded-xl"
                            >
                              <Pause size={16} />
                              Pause
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* VIEW MODAL */}
      {viewingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#080808] shadow-[0_30px_120px_rgba(0,0,0,0.65)] p-8 overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{viewingCampaign.name}</h2>
                <p className="text-zinc-400 text-sm">{viewingCampaign.description || 'No description provided'}</p>
              </div>
              <button onClick={() => setViewingCampaign(null)} className="text-zinc-500 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800">
                <h3 className="text-cyan-400 font-semibold mb-3">Leads Details</h3>
                <p className="text-zinc-300 text-sm">Total Leads: <span className="font-medium text-white">{viewingCampaign.total_leads || 0}</span></p>
              </div>
              
              <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800">
                <h3 className="text-cyan-400 font-semibold mb-3">Template Details</h3>
                <p className="text-zinc-300 text-sm">Template ID: <span className="font-medium text-white">{viewingCampaign.template_id || 'None'}</span></p>
                {viewingCampaign.variable_mapping && Object.keys(viewingCampaign.variable_mapping).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-zinc-400 text-xs uppercase mb-2">Variable Mapping</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(viewingCampaign.variable_mapping).map(([k, v]) => (
                        <div key={k} className="flex justify-between bg-black/40 rounded-lg p-2 border border-zinc-800">
                          <span className="text-cyan-300">{'{{'}{k}{'}}'}</span>
                          <span className="text-zinc-300">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}