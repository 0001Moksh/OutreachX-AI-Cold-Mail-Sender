'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/api';
import { Plus, Play, Pause, Trash2, Loader, AlertCircle, ChevronRight, CheckCircle2, ChevronLeft, Send, Check } from 'lucide-react';

interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
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
  const [error, setError] = useState<string | null>(null);
  
  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  
  // Step 1: Info
  const [formData, setFormData] = useState<{id?: string, name: string, description: string}>({ name: '', description: '' });
  
  // Step 2: Leads
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([]);
  const [selectedLeadFiles, setSelectedLeadFiles] = useState<string[]>([]);
  
  // Step 3: Template
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Step 4: Mapping
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  // Step 5: Test
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  
  // App Password Verification
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${apiUrl}/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` },
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

  // Load resources for Wizard
  useEffect(() => {
    if (showWizard && step === 2 && leadFiles.length === 0) {
      fetchLeadFiles();
    }
    if (showWizard && step === 3 && templates.length === 0) {
      fetchTemplates();
    }
  }, [showWizard, step]);

  const fetchLeadFiles = async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`${apiUrl}/leads`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setLeadFiles(data.data || []);
    }
  };

  const fetchTemplates = async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`${apiUrl}/templates`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.data || []);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !formData.name) {
      alert("Please enter a campaign name");
      return;
    }
    if (step === 2 && selectedLeadFiles.length === 0) {
      alert("Please select at least one lead file");
      return;
    }
    if (step === 3 && !selectedTemplate) {
      alert("Please select a template");
      return;
    }
    setStep(s => s + 1);
  };

  const handleCreateCampaign = async () => {
    try {
      setCreating(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      const isEditing = !!formData.id;
      const url = isEditing ? `${apiUrl}/campaigns/${formData.id}` : `${apiUrl}/campaigns`;
      const payload = {
        name: formData.name,
        description: formData.description,
        template_id: selectedTemplate,
        lead_ids: selectedLeadFiles
      };

      // 1. Create/Update Campaign
      const createRes = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!createRes.ok) throw new Error('Failed to save campaign');
      const createData = await createRes.json();
      const campaignId = createData.data.campaign_id;
      
      // 2. Save Mapping
      await fetch(`${apiUrl}/campaigns/${campaignId}/mapping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mapping }),
      });
      
      setShowWizard(false);
      setStep(1);
      setFormData({ name: '', description: '' });
      setSelectedLeadFiles([]);
      setSelectedTemplate('');
      setMapping({});
      await fetchCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleTestEmail = async (campaignId: string) => {
    if (!testEmail) { alert("Enter an email"); return; }
    try {
      setTesting(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${apiUrl}/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ test_email: testEmail }),
      });
      if (!res.ok) throw new Error("Test failed");
      alert("Test email sent!");
    } catch (err) {
      alert("Error sending test email");
    } finally {
      setTesting(false);
    }
  };

  const verifyAppPasswordAndLaunch = async (campaignId: string) => {
    try {
      setLaunchingId(campaignId);
      setVerifying(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      // Launch endpoint now runs the same SMTP+IMAP app-password verification flow before starting
      const launchRes = await fetch(`${apiUrl}/campaigns/${campaignId}/launch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!launchRes.ok) {
        const errData = await launchRes.json();
        throw new Error(errData.detail || errData.message || "Launch failed");
      }
      
      alert("Campaign launched successfully!");
      fetchCampaigns();
      
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error launching");
    } finally {
      setLaunchingId(null);
      setVerified(false);
      setVerifying(false);
    }
  };

  const handlePause = async (id: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    await fetch(`${apiUrl}/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: 'paused' }),
    });
    fetchCampaigns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete campaign?')) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    await fetch(`${apiUrl}/campaigns/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchCampaigns();
  };

  const normalizeTemplateVariables = (variables?: Record<string, any> | string[]) => {
    if (!variables) return [];

    if (Array.isArray(variables)) {
      return variables.filter(Boolean).map(variable => String(variable).trim()).filter(Boolean);
    }

    if (typeof variables === 'object') {
      return Object.keys(variables).filter(Boolean).map(variable => variable.trim()).filter(Boolean);
    }

    return [];
  };

  const getTemplateVariables = () => {
    const t = templates.find(x => x.id === selectedTemplate);
    if (!t) return [];
    
    const extract = (text: string) => {
      const regex = /\{\{([^}]+)\}\}/g;
      const matches = Array.from((text || "").matchAll(regex));
      return matches.map(m => m[1].trim());
    };

    const fromHtml = extract(t.html_content || "");
    const fromText = extract((t as any).text_content || "");
    const fromSubject = extract(t.subject_line || "");
    
    const allVars = new Set([...fromHtml, ...fromText, ...fromSubject]);
    
     normalizeTemplateVariables(t.variables).forEach(variable => allVars.add(variable));
    
    return Array.from(allVars);
  };

  const getAvailableLeadColumns = () => {
    const cols = new Set<string>();
    leadFiles.filter(lf => selectedLeadFiles.includes(lf.id)).forEach(lf => {
      if (lf.columns && Array.isArray(lf.columns)) {
        lf.columns.forEach(c => cols.add(c));
      }
    });
    return Array.from(cols);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader className="animate-spin" /></div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a] min-h-screen text-zinc-100">
      
      {/* Wizard Overlay */}
      {showWizard ? (
        <div className="max-w-4xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Campaign Builder
            </h2>
            <button onClick={() => setShowWizard(false)} className="text-zinc-500 hover:text-white">Cancel</button>
          </div>
          
          <div className="flex items-center justify-between mb-8 text-sm font-medium relative">
             <div className="absolute left-0 top-1/2 w-full h-0.5 bg-zinc-800 -z-10 -translate-y-1/2"></div>
             {[1, 2, 3, 4].map(s => (
               <div key={s} className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= s ? 'bg-cyan-500 border-cyan-500 text-black' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                 {s}
               </div>
             ))}
          </div>

          <div className="min-h-[300px]">
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl">Basic Info</h3>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Campaign Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500" placeholder="e.g. Q1 Marketing Outreach"/>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 h-24" placeholder="Optional context"/>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl">Select Leads</h3>
                <div className="grid grid-cols-2 gap-4">
                  {leadFiles.map(lf => (
                    <div key={lf.id} onClick={() => setSelectedLeadFiles(prev => prev.includes(lf.id) ? prev.filter(id => id !== lf.id) : [...prev, lf.id])} 
                         className={`p-4 rounded-xl border cursor-pointer transition ${selectedLeadFiles.includes(lf.id) ? 'bg-cyan-900/20 border-cyan-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                      <div className="flex justify-between">
                        <p className="font-medium text-white">{lf.file_name}</p>
                        {selectedLeadFiles.includes(lf.id) && <CheckCircle2 className="text-cyan-500" size={20}/>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">Columns: {lf.columns.slice(0,3).join(', ')}{lf.columns.length > 3 ? '...' : ''}</p>
                    </div>
                  ))}
                  {leadFiles.length === 0 && <p className="text-zinc-500">No leads found. Please upload leads first.</p>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl">Select Template</h3>
                <div className="grid grid-cols-2 gap-4">
                  {templates.map(t => (
                    <div key={t.id} onClick={() => setSelectedTemplate(t.id)} 
                         className={`p-4 rounded-xl border cursor-pointer transition ${selectedTemplate === t.id ? 'bg-blue-900/20 border-blue-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                      <div className="flex justify-between">
                        <p className="font-medium text-white">{t.name}</p>
                        {selectedTemplate === t.id && <CheckCircle2 className="text-blue-500" size={20}/>}
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{t.subject_line}</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {normalizeTemplateVariables(t.variables).map(v => <span key={v} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">{"{{"}{v}{"}}"}</span>)}
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 && <p className="text-zinc-500">No templates found. Please create one first.</p>}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h3 className="text-xl">Variable Mapping</h3>
                <p className="text-sm text-zinc-400">Map the variables used in your template to the columns in your lead files.</p>
                
                <div className="space-y-4">
                  {getTemplateVariables().map(v => (
                    <div key={v} className="flex items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <div className="w-1/3 font-mono text-cyan-400">{"{{"}{v}{"}}"}</div>
                      <ChevronRight className="text-zinc-600" size={20}/>
                      <select 
                        value={mapping[v] || ''} 
                        onChange={e => setMapping({...mapping, [v]: e.target.value})}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Select column...</option>
                        {getAvailableLeadColumns().map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {getTemplateVariables().length === 0 && <p className="text-zinc-500">No variables found in the selected template.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
            <button 
              onClick={() => setStep(s => s - 1)} 
              disabled={step === 1}
              className="px-6 py-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-0 flex items-center gap-2"
            >
              <ChevronLeft size={18}/> Back
            </button>
            
            {step < 4 ? (
              <button 
                onClick={handleNextStep}
                className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition flex items-center gap-2"
              >
                Next <ChevronRight size={18}/>
              </button>
            ) : (
              <button 
                onClick={handleCreateCampaign}
                disabled={creating}
                className="bg-cyan-500 text-black px-6 py-2 rounded-lg font-medium hover:bg-cyan-400 transition flex items-center gap-2 disabled:opacity-50"
              >
                {creating ? <Loader className="animate-spin" size={18}/> : <Check size={18}/>}
                Finish & Create
              </button>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Campaigns</h1>
              <p className="text-zinc-400 mt-2">Manage your automated email sequences</p>
            </div>
            <button
              onClick={() => { setStep(1); setShowWizard(true); }}
              className="flex items-center gap-2 bg-cyan-500 text-black px-6 py-3 rounded-xl font-medium hover:bg-cyan-400 transition"
            >
              <Plus size={20} />
              New Campaign
            </button>
          </div>

          <div className="grid gap-6">
            {campaigns.length === 0 && (
              <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                <p className="text-zinc-500 mb-4">No campaigns yet. Let's start growing!</p>
              </div>
            )}
            {campaigns.map(campaign => {
              const total = campaign.total_leads || 0;
              const sent = campaign.sent_count || 0;
              const failed = campaign.failed_count || 0;
              const processed = sent + failed;
              const progress = total > 0 ? (processed / total) * 100 : 0;
              
              return (
                <div key={campaign.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{campaign.name}</h3>
                      <p className="text-zinc-400 mt-1 text-sm">{campaign.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                        ${campaign.status === 'draft' ? 'bg-zinc-800 text-zinc-300' :
                          campaign.status === 'running' ? 'bg-green-900/30 text-green-400' :
                          campaign.status === 'paused' ? 'bg-amber-900/30 text-amber-400' :
                          campaign.status === 'completed' ? 'bg-blue-900/30 text-blue-400' :
                          'bg-red-900/30 text-red-400'}`}>
                        {campaign.status}
                      </span>
                      {campaign.status === 'draft' && (
                        <button 
                          onClick={() => {
                            setFormData({ id: campaign.id, name: campaign.name, description: campaign.description || '' });
                            if (campaign.template_id) setSelectedTemplate(campaign.template_id);
                            if (campaign.variable_mapping) setMapping(campaign.variable_mapping);
                            setSelectedLeadFiles(campaign.lead_ids || []);
                            setShowWizard(true);
                            setStep(1);
                          }} 
                          className="text-zinc-500 hover:text-blue-400"
                        >
                          Edit
                        </button>
                      )}
                      <button onClick={() => handleDelete(campaign.id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={18}/></button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-zinc-400 mb-2 font-medium">
                      <span>Progress: {Math.round(progress)}%</span>
                      <span>{processed} / {total} Leads Processed</span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden">
                      <div className="bg-cyan-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                      <p className="text-xs text-zinc-500 uppercase">Sent</p>
                      <p className="text-xl font-medium text-white">{sent}</p>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                      <p className="text-xs text-zinc-500 uppercase">Opened</p>
                      <p className="text-xl font-medium text-green-400">{campaign.opened_count || 0}</p>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                      <p className="text-xs text-zinc-500 uppercase">Replied</p>
                      <p className="text-xl font-medium text-purple-400">{campaign.replied_count || 0}</p>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                      <p className="text-xs text-zinc-500 uppercase">Failed</p>
                      <p className="text-xl font-medium text-red-400">{failed}</p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-between items-center bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-4">
                      {campaign.status === 'draft' && (
                        <div className="flex items-center gap-3">
                          <input 
                            type="text" 
                            placeholder="Test Email Address" 
                            value={testEmail} 
                            onChange={e => setTestEmail(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                          />
                          <button 
                            onClick={() => handleTestEmail(campaign.id)}
                            disabled={testing}
                            className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {testing ? 'Sending...' : 'Send Test'}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      {(campaign.status === 'draft' || campaign.status === 'paused') && (
                        <button 
                          onClick={() => verifyAppPasswordAndLaunch(campaign.id)}
                          disabled={launchingId === campaign.id}
                          className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg font-medium hover:bg-zinc-200 transition text-sm disabled:opacity-50"
                        >
                          {launchingId === campaign.id ? (
                            <Loader size={16} className="animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                          {launchingId === campaign.id ? (verifying ? 'Verifying...' : 'Launching...') : 'Launch'}
                        </button>
                      )}
                      
                      {campaign.status === 'running' && (
                        <button 
                          onClick={() => handlePause(campaign.id)}
                          className="flex items-center gap-2 bg-amber-500/20 text-amber-400 px-5 py-2 rounded-lg font-medium hover:bg-amber-500/30 transition text-sm"
                        >
                          <Pause size={16} /> Pause
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
