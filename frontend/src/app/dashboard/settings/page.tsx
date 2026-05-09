"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import { 
  User, 
  Lock, 
  Mail, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Settings
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const apiUrl = getApiUrl();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'email'>('profile');

  // Profile State
  const [profile, setProfile] = useState({
    full_name: "",
    role: "",
    email: "",
    app_password_verified: false
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Security State
  const [passwordFlow, setPasswordFlow] = useState<'idle' | 'otp_sent' | 'success'>('idle');
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [secError, setSecError] = useState("");

  // Email Config State
  const [appPassword, setAppPassword] = useState("");
  const [provider, setProvider] = useState("gmail");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState("");

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${apiUrl}/settings/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfile(prev => ({
            ...prev,
            full_name: data.data.full_name || "",
            role: data.data.role || "",
            email: data.data.email || prev.email,
            app_password_verified: data.data.app_password_verified || false
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSession(session);
        setProfile(prev => ({ ...prev, email: session.user.email || "" }));
        fetchProfile(session.access_token);
      }
    });
  }, [fetchProfile, router]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${apiUrl}/settings/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          full_name: profile.full_name,
          role: profile.role
        })
      });
      if (res.ok) {
        alert("Profile updated successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordRequest = async () => {
    if (newPassword !== confirmPassword) {
      setSecError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setSecError("Password must be at least 6 characters");
      return;
    }
    setSecError("");
    setSavingPassword(true);
    try {
      const res = await fetch(`${apiUrl}/settings/change-password/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        setPasswordFlow('otp_sent');
      } else {
        setSecError("Failed to request OTP. Try again later.");
      }
    } catch {
      setSecError("Network error.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePasswordVerify = async () => {
    if (!otp) return;
    setSavingPassword(true);
    try {
      const res = await fetch(`${apiUrl}/settings/change-password/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          otp,
          new_password: newPassword
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordFlow('success');
      } else {
        setSecError(data.detail || "Invalid or expired OTP");
      }
    } catch {
      setSecError("Network error.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAppPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appPassword) return;
    
    setVerifyingEmail(true);
    setEmailStatus('idle');
    setEmailError("");
    
    try {
      const res = await fetch(`${apiUrl}/settings/app-password/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          app_password: appPassword,
          provider
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatus('success');
        setProfile(prev => ({ ...prev, app_password_verified: true }));
        setAppPassword("");
      } else {
        setEmailStatus('error');
        setEmailError(data.detail || "Verification failed. Check credentials.");
      }
    } catch {
      setEmailStatus('error');
      setEmailError("Network error during verification.");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex-1 overflow-y-auto bg-[#050505] p-4 text-zinc-200 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:86px_86px] opacity-[0.04]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        
        <div className="mb-8 rounded-[32px] border border-white/[0.08] bg-white/[0.035] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                <Settings size={13} />
                Account control room
              </div>
              <h1 className="heading-font text-4xl font-semibold tracking-tight text-white">
                Settings
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                Manage profile identity, security, and sending account readiness
                from one clean workspace.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/15 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/15"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/[0.06] bg-black/25 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Profile</p>
              <p className="mt-3 truncate text-lg font-semibold text-white">
                {profile.full_name || "Not set"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/[0.06] bg-black/25 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Email</p>
              <p className="mt-3 truncate text-lg font-semibold text-white">
                {profile.email || "Not connected"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/[0.06] bg-black/25 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">Sending</p>
              <p className={`mt-3 text-lg font-semibold ${profile.app_password_verified ? "text-emerald-300" : "text-amber-300"}`}>
                {profile.app_password_verified ? "Verified" : "Setup needed"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-72 space-y-2 rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-3 self-start">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${activeTab === 'profile' ? 'bg-cyan-400 text-black' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'}`}
            >
              <User size={18} /> Profile
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${activeTab === 'security' ? 'bg-cyan-400 text-black' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'}`}
            >
              <Lock size={18} /> Security
            </button>
            <button 
              onClick={() => setActiveTab('email')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${activeTab === 'email' ? 'bg-cyan-400 text-black' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'}`}
            >
              <Mail size={18} /> Email Config
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="bg-white/[0.035] border border-white/[0.08] rounded-[32px] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
                <form onSubmit={handleProfileSave} className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      value={profile.email} 
                      disabled
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-500 rounded-xl px-4 py-3 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.full_name} 
                      onChange={e => setProfile({...profile, full_name: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Role / Designation</label>
                    <input 
                      type="text" 
                      value={profile.role} 
                      onChange={e => setProfile({...profile, role: e.target.value})}
                      placeholder="e.g. Sales Executive"
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={savingProfile}
                    className="mt-4 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="bg-white/[0.035] border border-white/[0.08] rounded-[32px] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-xl font-semibold text-white mb-6">Change Password</h2>
                
                {passwordFlow === 'success' ? (
                  <div className="bg-emerald-400/10 border border-emerald-400/20 p-6 rounded-2xl flex items-start gap-4">
                    <CheckCircle2 className="text-emerald-400 mt-0.5" size={24} />
                    <div>
                      <h3 className="text-emerald-400 font-medium text-lg">Password Updated</h3>
                      <p className="text-emerald-400/80 text-sm mt-1">Your password has been successfully changed.</p>
                      <button onClick={() => {setPasswordFlow('idle'); setNewPassword(""); setConfirmPassword("");}} className="mt-4 text-emerald-400 text-sm font-medium hover:underline">
                        Change again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 max-w-md">
                    {secError && (
                      <div className="bg-red-400/10 border border-red-400/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                        <AlertCircle size={16} /> {secError}
                      </div>
                    )}
                    
                    <div className={passwordFlow === 'otp_sent' ? 'opacity-50 pointer-events-none' : ''}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1.5">New Password</label>
                          <input 
                            type="password" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirm Password</label>
                          <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        {passwordFlow === 'idle' && (
                          <button 
                            onClick={handlePasswordRequest}
                            disabled={savingPassword || !newPassword || !confirmPassword}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                          >
                            {savingPassword ? <Loader2 className="animate-spin" size={18} /> : null}
                            Request OTP
                          </button>
                        )}
                      </div>
                    </div>

                    {passwordFlow === 'otp_sent' && (
                      <div className="p-5 border border-cyan-400/30 bg-cyan-400/5 rounded-2xl animate-in fade-in">
                        <label className="block text-sm font-medium text-cyan-400 mb-1.5">Enter OTP sent to your email</label>
                        <input 
                          type="text" 
                          value={otp}
                          onChange={e => setOtp(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full bg-zinc-950 border border-zinc-800 text-white text-center tracking-[0.5em] text-xl rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 mb-4"
                        />
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setPasswordFlow('idle')}
                            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium px-4 py-2.5 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handlePasswordVerify}
                            disabled={savingPassword || otp.length < 6}
                            className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                          >
                            {savingPassword ? <Loader2 className="animate-spin" size={18} /> : "Verify & Change"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* EMAIL CONFIG TAB */}
            {activeTab === 'email' && (
              <div className="bg-white/[0.035] border border-white/[0.08] rounded-[32px] p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">App Password Verification</h2>
                    <p className="text-sm text-zinc-400 mt-1">Connect your inbox securely via SMTP & IMAP.</p>
                  </div>
                  {profile.app_password_verified ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-400/10 text-emerald-400 rounded-full text-sm font-medium">
                      <ShieldCheck size={16} /> Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-full text-sm font-medium">
                      Not Verified
                    </div>
                  )}
                </div>

                <div className="bg-black/20 p-6 rounded-2xl border border-zinc-800/50 mb-8 max-w-2xl">
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">How this works:</h3>
                  <ul className="text-sm text-zinc-500 space-y-2 list-disc list-inside">
                    <li>We will use your App Password to send a test email via SMTP.</li>
                    <li>We will connect to your Inbox via IMAP to read the test email.</li>
                    <li>If successful, your App Password is AES-256 encrypted and stored.</li>
                    <li>We never store your raw password.</li>
                  </ul>
                </div>

                <form onSubmit={handleAppPasswordVerify} className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Provider</label>
                    <select 
                      value={provider}
                      onChange={e => setProvider(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="gmail">Gmail</option>
                      <option value="outlook">Outlook / Office365</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">App Password</label>
                    <input 
                      type="password" 
                      value={appPassword}
                      onChange={e => setAppPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 font-mono tracking-widest"
                    />
                    <p className="text-xs text-zinc-600 mt-2">Create an App Password in your Google/Microsoft account settings.</p>
                  </div>

                  {emailError && (
                    <div className="bg-red-400/10 border border-red-400/20 text-red-400 px-4 py-3 rounded-xl flex items-start gap-2 text-sm">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" /> 
                      <span className="break-words">{emailError}</span>
                    </div>
                  )}

                  {emailStatus === 'success' && (
                    <div className="bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                      <CheckCircle2 size={16} /> SMTP/IMAP verification successful!
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={verifyingEmail || !appPassword}
                    className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold px-4 py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-3 relative overflow-hidden"
                  >
                    {verifyingEmail ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        Verifying Connection...
                      </>
                    ) : (
                      "Verify & Securely Store"
                    )}
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
