"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Key, Save, X, Loader2, CheckCircle2 } from "lucide-react";

export function ApiKeyModal({ isOpen, onClose, userId }: { isOpen: boolean; onClose: () => void; userId: string }) {
  const [keys, setKeys] = useState({
    gemini_key: "",
    groq_key: "",
    openrouter_key: "",
    tavily_key: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadKeys();
    }
  }, [isOpen, userId]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("gemini_key, groq_key, openrouter_key, tavily_key")
        .eq("user_id", userId)
        .single();
        
      if (data) {
        // We only show dummy placeholders if a key exists, to avoid exposing the actual encrypted key from DB
        setKeys({
          gemini_key: data.gemini_key ? "••••••••••••••••" : "",
          groq_key: data.groq_key ? "••••••••••••••••" : "",
          openrouter_key: data.openrouter_key ? "••••••••••••••••" : "",
          tavily_key: data.tavily_key ? "••••••••••••••••" : "",
        });
      }
    } catch (err) {
      console.error("Error loading keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveKeys = async () => {
    setSaving(true);
    try {
      // Filter out unchanged placeholders
      const updates: Record<string, string | undefined> = {};
      if (keys.gemini_key && keys.gemini_key !== "••••••••••••••••") updates.gemini_key = keys.gemini_key;
      if (keys.groq_key && keys.groq_key !== "••••••••••••••••") updates.groq_key = keys.groq_key;
      if (keys.openrouter_key && keys.openrouter_key !== "••••••••••••••••") updates.openrouter_key = keys.openrouter_key;
      if (keys.tavily_key && keys.tavily_key !== "••••••••••••••••") updates.tavily_key = keys.tavily_key;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("api_keys")
          .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
          
        if (error) throw error;
      }
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error saving keys:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">API Keys</h2>
              <p className="text-sm text-zinc-400">Connect your preferred LLMs</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Gemini API Key (Fast/Cheap)</label>
              <input
                type="password"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="AIzaSy..."
                value={keys.gemini_key}
                onChange={(e) => setKeys({ ...keys, gemini_key: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Groq API Key (Llama 3.3)</label>
              <input
                type="password"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="gsk_..."
                value={keys.groq_key}
                onChange={(e) => setKeys({ ...keys, groq_key: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">OpenRouter API Key (Fallback)</label>
              <input
                type="password"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="sk-or-v1-..."
                value={keys.openrouter_key}
                onChange={(e) => setKeys({ ...keys, openrouter_key: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Tavily API Key (Web Research)</label>
              <input
                type="password"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="tvly-..."
                value={keys.tavily_key}
                onChange={(e) => setKeys({ ...keys, tavily_key: e.target.value })}
              />
            </div>

            <button
              onClick={saveKeys}
              disabled={saving || success}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Saved Securely
                </>
              ) : saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Keys
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
