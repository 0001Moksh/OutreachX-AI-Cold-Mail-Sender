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
  Eye,
  RefreshCw,
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
  bounced_count?: number;
  failed_count?: number;
  lead_files?: string[];
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

  const [uploadingLeads, setUploadingLeads] = useState(false);
  const [showInlineTemplateForm, setShowInlineTemplateForm] = useState(false);
  const [inlineTemplateData, setInlineTemplateData] = useState({
    name: '',
    description: '',
    subject_line: '',
    text_content: '',
  });
  const [savingTemplateInline, setSavingTemplateInline] = useState(false);

  const [analyticsModal, setAnalyticsModal] = useState<{
    isOpen: boolean;
    campaignId: string | null;
    status: 'sent' | 'replied' | 'failed' | null;
    data: any[];
    loading: boolean;
  }>({ isOpen: false, campaignId: null, status: null, data: [], loading: false });

  const [refreshingAction, setRefreshingAction] = useState<string | null>(null);
  
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [campaignLeads, setCampaignLeads] = useState<{isOpen: boolean; data: any[]; loading: boolean}>({ isOpen: false, data: [], loading: false });
  const [isRemovingFailed, setIsRemovingFailed] = useState(false);

  const handleViewAnalytics = async (campaignId: string, status: 'sent' | 'replied' | 'failed') => {
    setAnalyticsModal({ isOpen: true, campaignId, status, data: [], loading: true });
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${apiUrl}/campaigns/${campaignId}/analytics/details?status_filter=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAnalyticsModal(prev => ({ ...prev, data: data.data, loading: false }));
      } else {
        setAnalyticsModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRefreshAnalytics = async (campaignId: string, type: 'replies' | 'failed') => {
    setRefreshingAction(`${campaignId}-${type}`);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${apiUrl}/campaigns/${campaignId}/refresh-${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchCampaigns();
        alert(data.message);
      } else {
        alert(data.detail || data.message || 'Failed to refresh');
      }
    } catch (error) {
      console.error('Error refreshing:', error);
      alert('Error refreshing analytics data');
    } finally {
      setRefreshingAction(null);
    }
  };

  const handleViewLeads = async (campaignId: string) => {
    setCampaignLeads({ isOpen: true, data: [], loading: true });
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${apiUrl}/campaigns/${campaignId}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCampaignLeads({ isOpen: true, data: data.data, loading: false });
      } else {
        setCampaignLeads(prev => ({ ...prev, loading: false }));
      }
    } catch (e) {
      console.error(e);
      setCampaignLeads(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRemoveFailedLeads = async (campaignId: string) => {
    if (!confirm("Are you sure you want to remove all failed emails from the original lead lists? This cannot be undone.")) return;
    setIsRemovingFailed(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${apiUrl}/campaigns/${campaignId}/remove-failed-leads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchCampaigns();
        handleViewAnalytics(campaignId, 'failed');
        if (viewingCampaign && viewingCampaign.id === campaignId) {
            setViewingCampaign(null); // Simple way to force refresh if they go back
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to remove emails.");
    } finally {
      setIsRemovingFailed(false);
    }
  };

  const handleLeadFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLeads(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiUrl}/leads/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Reload lead files list
        await fetchLeadFiles();
        // Automatically select the uploaded lead file
        const newLeadId = data.data?.lead_id || data.data?.id;
        if (newLeadId) {
          setSelectedLeadFiles((prev) => [...prev, newLeadId]);
        }
      } else {
        alert("Failed to upload lead file.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading lead file.");
    } finally {
      setUploadingLeads(false);
      e.target.value = "";
    }
  };

  const handleSaveTemplateInline = async () => {
    if (!inlineTemplateData.name || !inlineTemplateData.subject_line) {
      alert("Template name and subject line are required.");
      return;
    }

    setSavingTemplateInline(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      const payload = {
        name: inlineTemplateData.name,
        description: inlineTemplateData.description,
        subject_line: inlineTemplateData.subject_line,
        text_content: inlineTemplateData.text_content,
        html_content: `<p>${inlineTemplateData.text_content.replace(/\n/g, '<br/>')}</p>`,
        tags: ["inline"],
        variables: {},
      };

      const res = await fetch(`${apiUrl}/templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        // Refresh templates list
        await fetchTemplates();
        // Automatically select newly created template
        const newTemplateId = data.data?.template_id || data.data?.id;
        if (newTemplateId) {
          setSelectedTemplate(newTemplateId);
        }
        setShowInlineTemplateForm(false);
        setInlineTemplateData({ name: '', description: '', subject_line: '', text_content: '' });
      } else {
        alert("Failed to create template.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving template.");
    } finally {
      setSavingTemplateInline(false);
    }
  };

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

    // Optimistic UI Update
    setCampaigns(prev => prev.filter(c => c.id !== id));

    const token = (
      await supabase.auth.getSession()
    ).data.session?.access_token;

    try {
      const res = await fetch(`${apiUrl}/campaigns/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        alert('Failed to delete campaign from backend.');
        fetchCampaigns(); // Revert
      }
    } catch (err) {
      alert('Error deleting campaign.');
      fetchCampaigns(); // Revert
    }
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
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">Select Lead List</h3>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium cursor-pointer transition">
                      <Plus size={14} />
                      Upload New
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleLeadFileUpload}
                        accept=".csv,.xls,.xlsx"
                        disabled={uploadingLeads}
                      />
                    </label>
                  </div>

                  {uploadingLeads && (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 flex items-center gap-2.5 text-cyan-300 text-xs">
                      <div className="w-4 h-4 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin" />
                      Uploading and parsing lead file...
                    </div>
                  )}

                  {leadFiles.length === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 p-10 text-center">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                        <Plus size={20} className="text-cyan-400" />
                      </div>
                      <h4 className="text-sm font-semibold mb-1">No Leads Available</h4>
                      <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-6">
                        Upload a CSV or Excel lead list to select prospects for this campaign.
                      </p>
                      <label className="inline-flex items-center gap-2 bg-white hover:bg-cyan-300 text-black px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition">
                        <Plus size={14} />
                        Upload Lead File
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleLeadFileUpload}
                          accept=".csv,.xls,.xlsx"
                          disabled={uploadingLeads}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-5">
                      {leadFiles.map((lf) => {
                        const selected = selectedLeadFiles.includes(lf.id);

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
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">
                      {showInlineTemplateForm ? 'Create New Template' : 'Select Template'}
                    </h3>
                    {!showInlineTemplateForm && (
                      <button
                        onClick={() => setShowInlineTemplateForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition"
                      >
                        <Plus size={14} />
                        Create New
                      </button>
                    )}
                  </div>

                  {showInlineTemplateForm ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-2">Template Name</label>
                          <input
                            type="text"
                            placeholder="Welcome Email"
                            value={inlineTemplateData.name}
                            onChange={(e) => setInlineTemplateData({ ...inlineTemplateData, name: e.target.value })}
                            className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-2">Description</label>
                          <input
                            type="text"
                            placeholder="Sent to new prospects"
                            value={inlineTemplateData.description}
                            onChange={(e) => setInlineTemplateData({ ...inlineTemplateData, description: e.target.value })}
                            className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-2">Subject Line</label>
                        <input
                          type="text"
                          placeholder="Quick question for {{first_name}}"
                          value={inlineTemplateData.subject_line}
                          onChange={(e) => setInlineTemplateData({ ...inlineTemplateData, subject_line: e.target.value })}
                          className="w-full rounded-xl border border-zinc-800 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-2">Email Body Content</label>
                        <textarea
                          placeholder="Hi {{first_name}},\n\nI wanted to reach out regarding..."
                          value={inlineTemplateData.text_content}
                          onChange={(e) => setInlineTemplateData({ ...inlineTemplateData, text_content: e.target.value })}
                          className="w-full h-36 rounded-xl border border-zinc-800 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowInlineTemplateForm(false);
                            setInlineTemplateData({ name: '', description: '', subject_line: '', text_content: '' });
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingTemplateInline || !inlineTemplateData.name || !inlineTemplateData.subject_line}
                          onClick={handleSaveTemplateInline}
                          className="flex items-center gap-1.5 bg-cyan-400 hover:bg-cyan-300 text-black px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                          {savingTemplateInline ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Save & Select
                        </button>
                      </div>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 p-10 text-center">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                        <Plus size={20} className="text-cyan-400" />
                      </div>
                      <h4 className="text-sm font-semibold mb-1">No Templates Available</h4>
                      <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-6">
                        Create an email template containing variables to personalize your campaign outreach.
                      </p>
                      <button
                        onClick={() => setShowInlineTemplateForm(true)}
                        className="bg-white hover:bg-cyan-300 text-black px-4 py-2 rounded-xl text-xs font-semibold transition"
                      >
                        <Plus size={14} />
                        Create Template
                      </button>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-5">
                      {templates.map((t) => {
                        const selected = selectedTemplate === t.id;

                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTemplate(t.id)}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur-sm relative group">
                          <p className="text-xs text-zinc-500 uppercase">
                            Sent
                          </p>
                          <p className="text-2xl font-bold mt-2 text-white">
                            {sent}
                          </p>
                          <button
                            onClick={() => handleViewAnalytics(campaign.id, 'sent')}
                            className="absolute top-4 right-4 text-xs bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur-sm relative group">
                          <p className="text-xs text-zinc-500 uppercase">
                            Replied
                          </p>
                          <p className="text-2xl font-bold mt-2 text-purple-400">
                            {campaign.replied_count || 0}
                          </p>
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button
                              onClick={() => handleRefreshAnalytics(campaign.id, 'replies')}
                              disabled={refreshingAction === `${campaign.id}-replies`}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded transition disabled:opacity-50"
                              title="Refresh"
                            >
                              <RefreshCw size={16} className={refreshingAction === `${campaign.id}-replies` ? "animate-spin" : ""} />
                            </button>
                            <button
                              onClick={() => handleViewAnalytics(campaign.id, 'replied')}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded transition"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 backdrop-blur-sm relative group">
                          <p className="text-xs text-zinc-500 uppercase">
                            Failed
                          </p>
                          <p className="text-2xl font-bold mt-2 text-red-400">
                            {failed}
                          </p>
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button
                              onClick={() => handleRefreshAnalytics(campaign.id, 'failed')}
                              disabled={refreshingAction === `${campaign.id}-failed`}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded transition disabled:opacity-50"
                              title="Refresh"
                            >
                              <RefreshCw size={16} className={refreshingAction === `${campaign.id}-failed` ? "animate-spin" : ""} />
                            </button>
                            <button
                              onClick={() => handleViewAnalytics(campaign.id, 'failed')}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded transition"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
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
              {/* CARD 1: Lead Details */}
              <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800 relative">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-cyan-400 font-semibold">Lead Details</h3>
                  <button onClick={() => handleViewLeads(viewingCampaign.id)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-2">
                    <Eye size={14} /> View Leads
                  </button>
                </div>
                {viewingCampaign.lead_files && viewingCampaign.lead_files.length > 0 && (
                  <div className="text-sm mb-3">
                    <span className="text-zinc-400">Attached Files:</span>
                    <ul className="list-disc ml-5 mt-1 text-zinc-300 font-medium">
                      {viewingCampaign.lead_files.map((file, idx) => (
                        <li key={idx}>{file}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-zinc-400 text-sm">Total Leads: <span className="font-medium text-white">{viewingCampaign.total_leads || 0}</span></p>
              </div>
              
              {/* CARD 2: Template Details */}
              <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800 relative">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-cyan-400 font-semibold">Template Details</h3>
                  <button onClick={() => setPreviewTemplate(templates.find(t => t.id === viewingCampaign.template_id) || null)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-2">
                    <Eye size={14} /> View Template
                  </button>
                </div>
                <p className="text-zinc-300 text-sm mb-4">Template Name: <span className="font-medium text-white">{templates.find(t => t.id === viewingCampaign.template_id)?.name || viewingCampaign.template_id || 'None'}</span></p>
                
                {viewingCampaign.variable_mapping && Object.keys(viewingCampaign.variable_mapping).length > 0 && (
                  <div>
                    <h4 className="text-zinc-500 text-xs uppercase mb-2">Template Variables</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(viewingCampaign.variable_mapping).map((k) => (
                        <span key={k} className="bg-black/50 text-cyan-300 px-2 py-1 rounded text-xs border border-zinc-800">
                          {'{{'}{k}{'}}'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: Variable Mapping */}
              {viewingCampaign.variable_mapping && Object.keys(viewingCampaign.variable_mapping).length > 0 && (
                <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800">
                  <h3 className="text-cyan-400 font-semibold mb-3">Variable Mapping</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-zinc-300 border-collapse">
                      <thead className="text-xs text-zinc-500 uppercase bg-black/40 border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-3 font-medium">Template Variable</th>
                          <th className="px-4 py-3 font-medium">Mapped Column</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(viewingCampaign.variable_mapping).map(([k, v]) => (
                          <tr key={k} className="border-b border-zinc-800/50">
                            <td className="px-4 py-3 text-cyan-300 font-mono text-xs">{'{{'}{k}{'}}'}</td>
                            <td className="px-4 py-3">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS MODAL */}
      {analyticsModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#080808] shadow-[0_30px_120px_rgba(0,0,0,0.65)] p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 capitalize">{analyticsModal.status} Emails</h2>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-zinc-400 text-sm">List of emails for this campaign</p>
                  {analyticsModal.status === 'failed' && analyticsModal.campaignId && (
                    <button 
                      onClick={() => handleRemoveFailedLeads(analyticsModal.campaignId!)}
                      disabled={isRemovingFailed || analyticsModal.data.length === 0}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg border border-red-500/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {isRemovingFailed ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Remove from attached leads
                    </button>
                  )}
                </div>
              </div>
              <button onClick={() => setAnalyticsModal({ isOpen: false, campaignId: null, status: null, data: [], loading: false })} className="text-zinc-500 hover:text-white transition">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {analyticsModal.loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="animate-spin text-cyan-400" size={32} />
                </div>
              ) : analyticsModal.data.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  No records found
                </div>
              ) : (
                <div className="space-y-2">
                  {analyticsModal.data.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                      <div>
                        <p className="text-white font-medium">{item.email}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {item.sent_at ? new Date(item.sent_at).toLocaleString() : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded capitalize ${item.status === 'sent' ? 'bg-blue-500/10 text-blue-400' : item.status === 'replied' ? 'bg-purple-500/10 text-purple-400' : 'bg-red-500/10 text-red-400'}`}>
                          {item.status}
                        </span>
                        {item.error && (
                          <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={item.error}>{item.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LEAD PREVIEW MODAL */}
      {campaignLeads.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#080808] shadow-[0_30px_120px_rgba(0,0,0,0.65)] p-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Attached Leads</h2>
              <button onClick={() => setCampaignLeads({ isOpen: false, data: [], loading: false })} className="text-zinc-500 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 bg-black/50">
              {campaignLeads.loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="animate-spin text-cyan-400" size={32} />
                </div>
              ) : campaignLeads.data.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  No leads found.
                </div>
              ) : (
                <table className="w-full text-sm text-left text-zinc-300">
                  <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50 border-b border-zinc-800 sticky top-0">
                    <tr>
                      {Object.keys(campaignLeads.data[0]).map((key) => (
                        <th key={key} className="px-4 py-3 font-medium whitespace-nowrap">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaignLeads.data.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-4 py-3 truncate max-w-[200px]" title={String(val)}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#080808] shadow-[0_30px_120px_rgba(0,0,0,0.65)] p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Template Preview</h2>
                <p className="text-zinc-400 text-sm">{previewTemplate.name}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-zinc-500 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-white rounded-xl p-6 shadow-inner text-black">
              {previewTemplate.html_content ? (
                <div dangerouslySetInnerHTML={{ __html: previewTemplate.html_content }} />
              ) : (
                <pre className="whitespace-pre-wrap font-sans">{previewTemplate.text_content}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}