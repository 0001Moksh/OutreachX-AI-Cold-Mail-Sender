"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  FileText,
  Database,
  Upload,
  Globe,
  ClipboardPaste,
  FileBox,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ExternalLink,
  Trash2,
} from "lucide-react";

type Asset = {
  id: string;
  name: string;
  asset_type: string;
  source_type?: string;
  description?: string;
  file_url?: string;
  content?: string;
  status?: string;
  is_verified?: boolean;
  created_at: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export default function Assets() {
  const router = useRouter();
  const apiUrl = getApiUrl();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [sourceUrl, setSourceUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const getAssetStatus = (asset: Asset) => {
    const normalized = (asset.status || "").toLowerCase();

    if (["valid", "verified", "success", "active", "completed"].includes(normalized)) {
      return {
        label: "Valid",
        tone: "text-emerald-300 bg-emerald-400/10 border-emerald-400/15",
        icon: CheckCircle2,
      };
    }

    if (["pending", "processing", "queued"].includes(normalized)) {
      return {
        label: "Processing",
        tone: "text-amber-300 bg-amber-400/10 border-amber-400/15",
        icon: Clock3,
      };
    }

    if (["error", "failed", "rejected", "invalid"].includes(normalized)) {
      return {
        label: "Needs Review",
        tone: "text-red-300 bg-red-400/10 border-red-400/15",
        icon: AlertCircle,
      };
    }

    return asset.is_verified
      ? {
          label: "Valid",
          tone: "text-emerald-300 bg-emerald-400/10 border-emerald-400/15",
          icon: CheckCircle2,
        }
      : {
          label: "Needs Review",
          tone: "text-amber-300 bg-amber-400/10 border-amber-400/15",
          icon: AlertCircle,
        };
  };

  const summary = useMemo(() => {
    return assets.reduce(
      (acc, asset) => {
        const status = getAssetStatus(asset).label;
        acc.total += 1;
        if (status === "Valid") acc.valid += 1;
        if (status === "Processing") acc.processing += 1;
        if (status === "Needs Review") acc.needsReview += 1;
        return acc;
      },
      { total: 0, valid: 0, processing: 0, needsReview: 0 }
    );
  }, [assets]);

  const fetchAssets = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${apiUrl}/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAssets(Array.isArray(data.data) ? data.data : []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch assets", err);
    }
  }, [apiUrl]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSession(session);
        fetchAssets(session.access_token);
        setLoading(false);
      }
    });
  }, [fetchAssets, router]);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl.trim()) return;
    
    // 1. Validate if it's a URL
    try {
      new URL(sourceUrl);
    } catch {
      alert("Please enter a valid URL.");
      return;
    }

    const assetType = sourceUrl.includes("github.com") ? "github" : "link";
    
    // 2. Optimistically add to list as "pending"
    const tempId = "temp-" + Date.now();
    const newAsset = {
      id: tempId,
      name: sourceUrl,
      asset_type: assetType,
      status: "pending",
      created_at: new Date().toISOString()
    };
    
    setAssets(prev => [newAsset, ...prev]);
    setSourceUrl("");
    setUploading(true);
    
    // 3. Call API
    try {
      const res = await fetch(`${apiUrl}/assets`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ 
          asset_type: assetType,
          name: newAsset.name,
          file_url: newAsset.name
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setAssets(prev => prev.map(a => 
          a.id === tempId
            ? { ...a, id: data.data.asset_id || data.data.id, status: data.data.status || "processing" }
            : a
        ));
        await fetchAssets(session?.access_token || "");
      } else {
        setAssets(prev => prev.map(a => 
          a.id === tempId ? { ...a, status: "error" } : a
        ));
        alert("Failed to upload URL. Backend returned an error.");
      }
    } catch (error) {
      console.error("Error uploading URL:", error);
      setAssets(prev => prev.map(a => 
        a.id === tempId ? { ...a, status: "error" } : a
      ));
      alert("Failed to upload URL. Network error.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Optimistic UI
    const tempId = "temp-" + Date.now();
    const newAsset = {
      id: tempId,
      name: file.name,
      asset_type: "document",
      status: "pending",
      created_at: new Date().toISOString()
    };
    
    setAssets(prev => [newAsset, ...prev]);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch(`${apiUrl}/assets/upload`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setAssets(prev => prev.map(a => 
          a.id === tempId
            ? { ...a, id: data.data.asset_id, status: data.data.status || "processing" }
            : a
        ));
        await fetchAssets(session?.access_token || "");
      } else {
        setAssets(prev => prev.map(a => 
          a.id === tempId ? { ...a, status: "error" } : a
        ));
        alert("Failed to upload file. Endpoint returned an error.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setAssets(prev => prev.map(a => 
        a.id === tempId ? { ...a, status: "error" } : a
      ));
      alert("Failed to upload file. Network error.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const handleTextPaste = async () => {
    if (!pastedText.trim()) return;
    
    setUploading(true);
    try {
      const res = await fetch(`${apiUrl}/assets`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ 
          asset_type: "custom",
          name: "Pasted Text " + new Date().toLocaleDateString(),
          content: pastedText
        })
      });
      
      if (res.ok) {
        alert("Text uploaded successfully!");
        setPastedText("");
        setShowPasteModal(false);
        if (session?.access_token) await fetchAssets(session.access_token);
      } else {
        alert("Failed to upload text.");
      }
    } catch (error) {
      console.error("Error uploading text:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleViewAsset = async (asset: Asset) => {
    setViewingAsset(asset);

    if (asset.content) return;

    setLoadingAsset(true);
    try {
      const res = await fetch(`${apiUrl}/assets/${asset.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setViewingAsset(data.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch asset", err);
    } finally {
      setLoadingAsset(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      const res = await fetch(`${apiUrl}/assets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        setSelectedAssetIds((prev) => prev.filter((v) => v !== id));
      } else {
        alert("Failed to delete asset.");
      }
    } catch (err) {
      console.error("Failed to delete asset", err);
      alert("Error deleting asset.");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAssetIds(assets.map(a => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(prev => [...prev, id]);
    } else {
      setSelectedAssetIds(prev => prev.filter(v => v !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedAssetIds.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedAssetIds.length} assets?`)) return;
    
    try {
      const res = await fetch(`${apiUrl}/assets/bulk`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ ids: selectedAssetIds })
      });
      if (res.ok) {
        setAssets(prev => prev.filter(a => !selectedAssetIds.includes(a.id)));
        setSelectedAssetIds([]);
      } else {
        alert("Failed to delete multiple assets.");
      }
    } catch (err) {
      console.error("Failed to bulk delete assets", err);
      alert("Error deleting multiple assets.");
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  return (
  <div className="relative flex-1 overflow-hidden bg-[#050505] text-white">

    {/* Ambient Background */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[-10%] top-[10%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.04] blur-[140px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/[0.03] blur-[160px]" />
    </div>

    <div className="relative z-10 h-full overflow-y-auto px-6 py-8 md:px-10 scrollbar-none">

      <div className="mx-auto flex w-full max-w-6xl flex-col">

        {/* Heading */}
        <div className="mb-10">

          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Assets Workspace
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-500">
            Upload repositories, documents, websites, and custom knowledge
            sources so Deva and your outreach modules can answer with your
            actual business context.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Total Sources", summary.total, "text-cyan-300"],
            ["Valid", summary.valid, "text-emerald-300"],
            ["Processing", summary.processing, "text-amber-300"],
            ["Needs Review", summary.needsReview, "text-red-300"],
          ].map(([label, value, tone]) => (
            <div
              key={String(label)}
              className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                {label}
              </p>
              <p className={`mt-3 text-3xl font-semibold ${tone}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* URL Input */}
        <form
          onSubmit={handleUrlSubmit}
          className="relative mb-8"
        >
          <div
            className="
              relative
              overflow-hidden
              rounded-[28px]
              border
              border-white/[0.06]
              bg-white/[0.03]
              backdrop-blur-xl
              shadow-[0_10px_50px_rgba(0,0,0,0.35)]
            "
          >

            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

            <Globe
              className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-300"
              size={20}
            />

            <input
              type="text"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="Paste GitHub repository or website URL..."
              className="
                h-[72px]
                w-full
                bg-transparent
                pl-14
                pr-36
                text-[15px]
                text-zinc-100
                placeholder:text-zinc-500
                focus:outline-none
              "
            />

            <button
              type="submit"
              disabled={uploading || !sourceUrl.trim()}
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                rounded-2xl
                bg-cyan-400
                px-5
                py-2.5
                text-sm
                font-medium
                text-black
                transition-all
                hover:bg-cyan-300
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Add Source
            </button>
          </div>
        </form>

        {/* Upload Zone */}
        <div
          className="
            relative
            overflow-hidden
            rounded-[34px]
            border
            border-white/[0.06]
            bg-white/[0.02]
            p-10
            backdrop-blur-xl
            shadow-[0_20px_80px_rgba(0,0,0,0.35)]
          "
        >

          {/* Ambient */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[10%] top-[20%] h-40 w-40 rounded-full bg-cyan-500/[0.04] blur-[80px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center">

            <div
              className="
                mb-6
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-3xl
                border
                border-cyan-400/10
                bg-cyan-400/[0.05]
              "
            >
              <Upload
                size={26}
                className="text-cyan-300"
              />
            </div>

            <h2 className="text-2xl font-semibold text-white">
              Upload Knowledge Sources
            </h2>

            <p className="mt-3 max-w-xl text-center text-[15px] leading-7 text-zinc-500">
              Drag and drop files, upload repositories, paste copied content,
              or connect websites to power AI-generated outreach workflows.
            </p>

            {/* Actions */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">

              {/* Upload */}
              <label
                className="
                  flex
                  cursor-pointer
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-white/[0.08]
                  bg-white/[0.03]
                  px-5
                  py-3
                  transition-all
                  hover:bg-white/[0.06]
                "
              >
                <Upload
                  size={18}
                  className="text-cyan-300"
                />

                <span className="text-sm text-zinc-200">
                  Upload Files
                </span>

                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.htm,.txt,image/*,audio/*"
                />
              </label>

              {/* Websites */}
              <button
                onClick={() =>
                  (
                    document.querySelector(
                      "input[type='text']"
                    ) as HTMLInputElement
                  )?.focus()
                }
                className="
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-white/[0.08]
                  bg-white/[0.03]
                  px-5
                  py-3
                  transition-all
                  hover:bg-white/[0.06]
                "
              >
                <Globe
                  size={18}
                  className="text-blue-300"
                />

                <span className="text-sm text-zinc-200">
                  Websites
                </span>
              </button>

              {/* Paste */}
              <button
                onClick={() => setShowPasteModal(true)}
                className="
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-white/[0.08]
                  bg-white/[0.03]
                  px-5
                  py-3
                  transition-all
                  hover:bg-white/[0.06]
                "
              >
                <ClipboardPaste
                  size={18}
                  className="text-emerald-300"
                />

                <span className="text-sm text-zinc-200">
                  Copied Text
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Assets Table */}
        {assets.length > 0 && (
          <div className="mt-10">

            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database
                  size={18}
                  className="text-cyan-300"
                />

                <h3 className="text-lg font-medium text-zinc-200">
                  Knowledge Sources
                </h3>
              </div>
              
              {selectedAssetIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={16} />
                  Delete Selected ({selectedAssetIds.length})
                </button>
              )}
            </div>

            <div
              className="
                overflow-hidden
                rounded-[30px]
                border
                border-white/[0.06]
                bg-white/[0.03]
                backdrop-blur-xl
                shadow-[0_20px_60px_rgba(0,0,0,0.30)]
              "
            >

              <table className="w-full text-left">

                <thead className="border-b border-white/[0.06] bg-white/[0.02] text-zinc-500">
                  <tr>
                    <th className="w-12 px-6 py-5">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-cyan-400 focus:ring-cyan-400 focus:ring-offset-zinc-950 cursor-pointer"
                        checked={assets.length > 0 && selectedAssetIds.length === assets.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-5 text-xs font-medium uppercase tracking-[0.2em]">
                      Source
                    </th>

                    <th className="px-6 py-5 text-xs font-medium uppercase tracking-[0.2em]">
                      Type
                    </th>

                    <th className="px-6 py-5 text-xs font-medium uppercase tracking-[0.2em]">
                      Status
                    </th>

                    <th className="px-6 py-5 text-right text-xs font-medium uppercase tracking-[0.2em]">
                      Created
                    </th>

                    <th className="px-6 py-5 text-right text-xs font-medium uppercase tracking-[0.2em]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assets.map((asset) => {
                    const status = getAssetStatus(asset);
                    const StatusIcon = status.icon;

                    return (
                      <tr
                        key={asset.id}
                        className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] ${selectedAssetIds.includes(asset.id) ? 'bg-cyan-500/[0.02]' : ''}`}
                      >
                        <td className="w-12 px-6 py-5">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-cyan-400 focus:ring-cyan-400 focus:ring-offset-zinc-950 cursor-pointer"
                            checked={selectedAssetIds.includes(asset.id)}
                            onChange={(e) => handleSelectOne(asset.id, e.target.checked)}
                          />
                        </td>
                      {/* Name */}
                      <td className="px-6 py-5">

                        <div className="flex items-center gap-4">

                          <div
                            className="
                              flex
                              h-11
                              w-11
                              items-center
                              justify-center
                              rounded-2xl
                              border
                              border-white/[0.06]
                              bg-white/[0.03]
                            "
                          >
                            {asset.asset_type === "github" ? (
                              <Globe
                                size={16}
                                className="text-cyan-300"
                              />
                            ) : asset.asset_type === "document" ? (
                              <FileText
                                size={16}
                                className="text-emerald-300"
                              />
                            ) : (
                              <FileBox
                                size={16}
                                className="text-indigo-300"
                              />
                            )}
                          </div>

                          <div>
                            <p className="max-w-[420px] truncate text-sm font-medium text-zinc-100">
                              {asset.name}
                            </p>
                            {asset.file_url && (
                              <p className="mt-1 max-w-[420px] truncate text-xs text-zinc-600">
                                {asset.file_url}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-5">
                        <span
                          className="
                            rounded-xl
                            border
                            border-white/[0.06]
                            bg-white/[0.03]
                            px-3
                            py-1.5
                            text-xs
                            text-zinc-300
                          "
                        >
                          {asset.asset_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${status.tone}`}
                        >
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-5 text-right text-sm text-zinc-500">
                        {new Date(
                          asset.created_at
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewAsset(asset)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 hover:border-cyan-400/30 hover:text-cyan-300"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 hover:border-red-400/30 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Asset Viewer */}
    {viewingAsset && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
        <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#080808] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
          <div className="flex items-start justify-between gap-5 border-b border-white/[0.06] px-6 py-5">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                {(() => {
                  const status = getAssetStatus(viewingAsset);
                  const StatusIcon = status.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-xs ${status.tone}`}
                    >
                      <StatusIcon size={13} />
                      {status.label}
                    </span>
                  );
                })()}
                <span className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
                  {viewingAsset.asset_type}
                </span>
              </div>
              <h2 className="truncate text-2xl font-semibold text-white">
                {viewingAsset.name}
              </h2>
              {viewingAsset.file_url && (
                <a
                  href={viewingAsset.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex max-w-full items-center gap-2 truncate text-sm text-cyan-300 hover:text-cyan-200"
                >
                  <ExternalLink size={14} />
                  <span className="truncate">{viewingAsset.file_url}</span>
                </a>
              )}
            </div>

            <button
              onClick={() => setViewingAsset(null)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {loadingAsset ? (
              <div className="flex h-80 items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              </div>
            ) : viewingAsset.content ? (
              <pre className="whitespace-pre-wrap break-words rounded-3xl border border-white/[0.06] bg-black/40 p-6 text-sm leading-7 text-zinc-300">
                {viewingAsset.content}
              </pre>
            ) : (
              <div className="rounded-3xl border border-amber-400/15 bg-amber-400/5 p-8 text-amber-200">
                <div className="mb-3 flex items-center gap-2 font-medium">
                  <AlertCircle size={18} />
                  No extracted content available
                </div>
                <p className="text-sm leading-7 text-amber-100/70">
                  This source may still be processing, may have failed parsing,
                  or may need a valid URL/file so Deva can use it as context.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Paste Modal */}
    {showPasteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">

        <div
          className="
            relative
            w-full
            max-w-3xl
            overflow-hidden
            rounded-[32px]
            border
            border-white/[0.08]
            bg-[#0A0A0A]
            shadow-[0_30px_120px_rgba(0,0,0,0.6)]
          "
        >

          <div className="border-b border-white/[0.06] px-7 py-5">

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-cyan-400/10
                  bg-cyan-400/[0.05]
                "
              >
                <ClipboardPaste
                  size={18}
                  className="text-cyan-300"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Paste Knowledge Source
                </h2>

                <p className="text-sm text-zinc-500">
                  Add custom text content for AI retrieval.
                </p>
              </div>
            </div>
          </div>

          <div className="p-7">

            <textarea
              value={pastedText}
              onChange={(e) =>
                setPastedText(e.target.value)
              }
              placeholder="Paste your source content here..."
              className="
                h-[320px]
                w-full
                resize-none
                rounded-2xl
                border
                border-white/[0.06]
                bg-white/[0.02]
                p-5
                text-[15px]
                leading-7
                text-zinc-200
                placeholder:text-zinc-500
                focus:outline-none
                focus:border-cyan-400/20
              "
            />

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowPasteModal(false)
                }
                className="
                  rounded-2xl
                  border
                  border-white/[0.08]
                  bg-white/[0.03]
                  px-5
                  py-2.5
                  text-sm
                  text-zinc-300
                  transition-all
                  hover:bg-white/[0.06]
                "
              >
                Cancel
              </button>

              <button
                onClick={handleTextPaste}
                disabled={
                  !pastedText.trim() || uploading
                }
                className="
                  rounded-2xl
                  bg-cyan-400
                  px-6
                  py-2.5
                  text-sm
                  font-medium
                  text-black
                  transition-all
                  hover:bg-cyan-300
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                {uploading
                  ? "Saving..."
                  : "Save Source"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
