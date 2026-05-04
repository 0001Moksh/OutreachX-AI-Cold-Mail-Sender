"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Mail,
  Users,
  Settings,
  Bell,
  Search,
  PlusCircle,
  Activity,
  ArrowUpRight,
  Upload,
  Play,
  X,
  Bot,
  FileText,
  Database
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    total_emails_sent: 0,
    average_open_rate: "0%",
    active_campaigns: 0,
    total_replies: 0 // Mocked in UI
  });
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  // Modals state
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  
  // SMTP credentials state
  const [emailAddress, setEmailAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  
  // CSV file state
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSession(session);
        fetchDashboardData(session.access_token);
      }
    });
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    try {
      const statsRes = await fetch("http://127.0.0.1:8000/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(prev => ({ ...prev, ...statsData }));
      }
      
      const campaignsRes = await fetch("http://127.0.0.1:8000/api/campaigns", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/campaigns", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ name: newCampaignName })
      });
      
      if (res.ok) {
        setShowNewCampaign(false);
        setNewCampaignName("");
        fetchDashboardData(session.access_token);
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };

  const handleSaveSMTP = async () => {
    if (!emailAddress || !appPassword) return;
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/credentials", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ email_address: emailAddress, app_password: appPassword })
      });
      
      if (res.ok) {
        alert("SMTP Credentials Saved Successfully!");
        setEmailAddress("");
        setAppPassword("");
      } else {
        alert("Failed to save credentials.");
      }
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  const handleUploadCSV = async () => {
    if (!csvFile || !selectedCampaign) return;
    
    const formData = new FormData();
    formData.append("file", csvFile);
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/campaigns/${selectedCampaign.id}/leads`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${session.access_token}` 
        },
        body: formData
      });
      
      if (res.ok) {
        alert("Leads uploaded successfully!");
        setCsvFile(null);
        fetchDashboardData(session.access_token);
      } else {
        alert("Failed to upload leads.");
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!selectedCampaign) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/campaigns/${selectedCampaign.id}/send`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${session.access_token}` 
        }
      });
      
      if (res.ok) {
        alert("Campaign launched successfully in the background!");
        setSelectedCampaign(null);
        fetchDashboardData(session.access_token);
      } else {
        const errorData = await res.json();
        alert(`Failed to launch campaign: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Error launching campaign:", error);
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold heading-font tracking-tight">Welcome back, Chief</h2>
          <p className="text-zinc-400 mt-1">Here is what is happening with your outreach today.</p>
        </div>
        <button 
          onClick={() => setShowNewCampaign(true)}
          className="bg-cyan-400 hover:bg-cyan-300 text-zinc-950 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
        >
          <PlusCircle size={18} />
          New Campaign
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-zinc-900 rounded-xl text-cyan-400">
              <Mail size={24} />
            </div>
            <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-400/10 px-2 py-1 rounded-lg">
              <ArrowUpRight size={14} /> 12%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Emails Sent</h3>
          <p className="text-3xl font-bold mt-1">{stats.total_emails_sent}</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-zinc-900 rounded-xl text-indigo-400">
              <Activity size={24} />
            </div>
            <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-400/10 px-2 py-1 rounded-lg">
              <ArrowUpRight size={14} /> 4.2%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Average Open Rate</h3>
          <p className="text-3xl font-bold mt-1">{stats.average_open_rate}</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-zinc-900 rounded-xl text-emerald-400">
              <Users size={24} />
            </div>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium relative z-10">Total Replies (Mocked)</h3>
          <p className="text-3xl font-bold mt-1 relative z-10">1,204</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
        <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Your Campaigns</h3>
        </div>
        <div className="p-0">
          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No campaigns yet. Click "New Campaign" to get started.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Campaign Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Progress</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-200">{camp.name}</p>
                      <p className="text-xs text-zinc-500 mt-1">ID: {camp.id.substring(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                        ${camp.status === 'running' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 
                          camp.status === 'paused' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 
                          camp.status === 'completed' ? 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20' : 
                          'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full 
                          ${camp.status === 'running' ? 'bg-emerald-400' : 
                            camp.status === 'paused' ? 'bg-amber-400' : 
                            camp.status === 'completed' ? 'bg-indigo-400' : 
                            'bg-zinc-500'}`}></span>
                        {camp.status.charAt(0).toUpperCase() + camp.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[200px]">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400">{camp.sent_count || 0} / {camp.total_leads || 0}</span>
                          <span className="text-cyan-400">{camp.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${camp.progress || 0}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedCampaign(camp)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* New Campaign Modal */}
      {showNewCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowNewCampaign(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-semibold mb-6">Create Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Campaign Name</label>
                <input 
                  type="text" 
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                  placeholder="e.g. Q4 Engineers Outreach"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <button 
                onClick={handleCreateCampaign}
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Management Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedCampaign(null)}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-semibold mb-2">Manage: {selectedCampaign.name}</h2>
            <p className="text-zinc-400 mb-8">Upload leads, configure SMTP, and launch your sequence.</p>

            <div className="space-y-8">
              {/* 1. Upload Leads */}
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2"><Users size={18} className="text-cyan-400"/> 1. Upload Leads (CSV)</h3>
                <div className="flex gap-3">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={e => setCsvFile(e.target.files ? e.target.files[0] : null)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-400/10 file:text-cyan-400 hover:file:bg-cyan-400/20"
                  />
                  <button 
                    onClick={handleUploadCSV}
                    disabled={!csvFile}
                    className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Upload size={16} /> Upload
                  </button>
                </div>
                {selectedCampaign.total_leads > 0 && (
                  <p className="text-xs text-emerald-400 mt-2">✓ {selectedCampaign.total_leads} leads currently loaded.</p>
                )}
              </div>

              {/* 2. SMTP Setup */}
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2"><Mail size={18} className="text-cyan-400"/> 2. Sending Account (SMTP)</h3>
                <p className="text-xs text-zinc-500 mb-4">You only need to do this once. Credentials are AES encrypted.</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={emailAddress}
                      onChange={e => setEmailAddress(e.target.value)}
                      placeholder="you@gmail.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">App Password</label>
                    <input 
                      type="password" 
                      value={appPassword}
                      onChange={e => setAppPassword(e.target.value)}
                      placeholder="16-digit password"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveSMTP}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium w-full"
                >
                  Save Credentials
                </button>
              </div>

              {/* 3. Launch */}
              <div className="bg-cyan-400/5 p-5 rounded-xl border border-cyan-400/20 text-center">
                <h3 className="text-lg font-medium mb-2">Ready to Go?</h3>
                <p className="text-sm text-zinc-400 mb-6">This will start sending emails in the background with jitter applied to avoid spam filters.</p>
                <button 
                  onClick={handleLaunchCampaign}
                  className="bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold py-3 px-8 rounded-xl flex items-center gap-2 mx-auto shadow-lg shadow-cyan-400/20"
                >
                  <Play size={18} fill="currentColor" />
                  Launch Sequence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
