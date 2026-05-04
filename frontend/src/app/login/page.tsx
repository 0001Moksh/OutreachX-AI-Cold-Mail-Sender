"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot";
type SignupStep = "email" | "otp";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [message, setMessage] = useState<string | null>(null);
  
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to send OTP");
      }
      
      setMessage(data.message);
      setSignupStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // 1. Verify OTP with Backend
      const res = await fetch("http://127.0.0.1:8000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Invalid OTP");
      }

      // 2. OTP Verified. Now sign up with Supabase.
      // MUST ENSURE 'Confirm email' is DISABLED in Supabase settings for this to instantly log them in.
      const { data: supaData, error: supaError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (supaError) {
        throw new Error(supaError.message);
      }
      
      setMessage("Account created successfully!");
      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Password reset link sent to your email.");
      }
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-10 rounded-3xl relative z-10 shadow-2xl border border-zinc-800/50">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="OutreachX Logo" width={48} height={48} className="rounded-xl shadow-lg shadow-cyan-500/30" />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold heading-font tracking-tight mb-2">
            {mode === "login" && "Welcome to OutreachX"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Reset Password"}
          </h1>
          <p className="text-zinc-400 text-sm">
            {mode === "login" && "Sign in to launch your campaign."}
            {mode === "signup" && signupStep === "email" && "Enter your email to verify your identity."}
            {mode === "signup" && signupStep === "otp" && "Enter the OTP sent to your email."}
            {mode === "forgot" && "Enter your email to receive a reset link."}
          </p>
        </div>

        <form onSubmit={mode === "signup" ? (signupStep === "email" ? handleSendOTP : handleVerifyAndSignup) : handleAuth} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
              {message}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300 ml-1">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={mode === "signup" && signupStep === "otp"}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-zinc-200 placeholder:text-zinc-600 disabled:opacity-50"
                placeholder="chief@outreachx.io"
              />
            </div>
          </div>

          {mode === "signup" && signupStep === "otp" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300 ml-1">6-Digit OTP</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-zinc-200 placeholder:text-zinc-600"
                  placeholder="123456"
                />
              </div>
            </div>
          )}

          {(mode === "login" || (mode === "signup" && signupStep === "otp")) && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-zinc-300">Password</label>
                {mode === "login" && (
                  <button 
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-zinc-200 placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && "Processing..."}
            {!loading && mode === "login" && "Continue to Dashboard"}
            {!loading && mode === "signup" && signupStep === "email" && "Send OTP"}
            {!loading && mode === "signup" && signupStep === "otp" && "Verify & Sign Up"}
            {!loading && mode === "forgot" && "Send Reset Link"}
            
            {!loading && <ArrowRight size={18} />}
          </button>
          
          <div className="pt-2 text-center text-sm">
            {mode === "login" && (
              <p className="text-zinc-400">
                Don't have an account?{" "}
                <button type="button" onClick={() => { setMode("signup"); setSignupStep("email"); setError(null); setMessage(null); }} className="text-cyan-400 hover:underline">
                  Sign Up
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p className="text-zinc-400">
                Already have an account?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(null); setMessage(null); }} className="text-cyan-400 hover:underline">
                  Log In
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button 
                type="button"
                onClick={() => { setMode("login"); setError(null); setMessage(null); }}
                className="text-zinc-400 hover:text-zinc-200 py-2 flex justify-center items-center gap-2 transition-colors mx-auto"
              >
                <ArrowLeft size={14} /> Back to login
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
