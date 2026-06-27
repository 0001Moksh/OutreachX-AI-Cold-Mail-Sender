"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, DollarSign, Activity, Zap, Cpu, ServerCrash } from "lucide-react";

type CostRecord = {
  id: string;
  api_provider: string;
  tokens_used: number;
  duration_ms: number;
  estimated_cost: number;
  created_at: string;
};

export function CostPanel({ isOpen, onClose, userId }: { isOpen: boolean; onClose: () => void; userId: string }) {
  const [records, setRecords] = useState<CostRecord[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  useEffect(() => {
    if (isOpen && userId) {
      fetchCosts();
    }
  }, [isOpen, userId]);

  const fetchCosts = async () => {
    const { data, error } = await supabase
      .from("cost_tracking")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setRecords(data);
      const cost = data.reduce((acc, r) => acc + (r.estimated_cost || 0), 0);
      const tokens = data.reduce((acc, r) => acc + (r.tokens_used || 0), 0);
      setTotalCost(cost);
      setTotalTokens(tokens);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-100">Usage & Cost Metrics</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 gap-4 border-b border-zinc-800/60 p-6">
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Est. Cost</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100">${totalCost.toFixed(4)}</div>
          </div>
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium">Tokens</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100">{totalTokens.toLocaleString()}</div>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Recent API Calls</h3>
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="flex flex-col gap-1.5 rounded-lg border border-zinc-800/40 bg-zinc-900/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.api_provider.toLowerCase().includes("fallback") ? (
                      <ServerCrash className="h-3.5 w-3.5 text-orange-400" />
                    ) : (
                      <Cpu className="h-3.5 w-3.5 text-blue-400" />
                    )}
                    <span className="text-xs font-medium text-zinc-300">{r.api_provider}</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">${r.estimated_cost?.toFixed(5)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{new Date(r.created_at).toLocaleTimeString()}</span>
                  <span>{r.tokens_used} tokens • {r.duration_ms}ms</span>
                </div>
              </div>
            ))}
            
            {records.length === 0 && (
              <div className="text-center py-8 text-sm text-zinc-500">
                No API calls recorded yet. Start chatting with Deva to see metrics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
