"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  X,
  Plus,
  Trash2,
  Eye,
  Users,
  UploadCloud,
  Sparkles,
  Database,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";

export default function Leads() {
  const router = useRouter();
  const apiUrl = getApiUrl();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingLeads, setFetchingLeads] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [leadFiles, setLeadFiles] = useState<any[]>([]);

  const [viewingFile, setViewingFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        setLoading(false);
        setFetchingLeads(false);
      } else {
        setSession(session);

        // Serve cached data instantly to avoid blank screen on module switch
        const cached = window.localStorage.getItem("cached_leads");
        if (cached) {
          try {
            setLeadFiles(JSON.parse(cached));
            setFetchingLeads(false); // show cached data immediately
          } catch (e) {
            console.error("Failed to parse cached leads", e);
          }
        }

        // Background refresh from API
        fetchLeadFiles(session.access_token).finally(() => {
          setFetchingLeads(false);
        });
      }

      setLoading(false);
    });
  }, [router]);

  const fetchLeadFiles = async (token: string) => {
    try {
      const res = await fetch(`${apiUrl}/leads`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();

        if (data.success) {
          const formatted = data.data.map((a: any) => ({
            ...a,
            // Keep server status as-is (ready / failed / processing)
          }));

          setLeadFiles(formatted);
          window.localStorage.setItem("cached_leads", JSON.stringify(formatted));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    retryFileId?: string
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (retryFileId) {
      // Optimistically remove the old failed card before uploading the new one
      handleDelete(retryFileId, true);
    }

    // Client-side size guard (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(`File too large (${Math.round(file.size / (1024 * 1024))}MB). Maximum is 10MB.`);
      e.target.value = "";
      return;
    }

    const tempId = "temp-" + Date.now();

    const newFile = {
      id: tempId,
      file_name: file.name,
      status: "pending",
      created_at: new Date().toISOString(),
      columns: [],
      row_count: 0,
    };

    setLeadFiles((prev) => [newFile, ...prev]);

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const res = await fetch(`${apiUrl}/leads/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();

        setLeadFiles((prev) => {
          const updated = prev.map((a) =>
            a.id === tempId
              ? {
                ...a,
                id: data.data.lead_id,
                file_name: data.data.file_name,
                status: data.data.status || "ready",
                columns: data.data.columns,
                row_count: data.data.row_count || 0,
              }
              : a
          );
          window.localStorage.setItem("cached_leads", JSON.stringify(updated));
          return updated;
        });
      } else {
        // Server returned error — but might have persisted a failed record
        // Re-fetch to get the actual state from DB
        if (session?.access_token) {
          await fetchLeadFiles(session.access_token);
        } else {
          setLeadFiles((prev) =>
            prev.map((a) =>
              a.id === tempId
                ? {
                  ...a,
                  status: "failed",
                  error_message: "Upload failed. Please try again.",
                }
                : a
            )
          );
        }
      }
    } catch (err) {
      console.error(err);

      setLeadFiles((prev) =>
        prev.map((a) =>
          a.id === tempId
            ? {
              ...a,
              status: "failed",
              error_message: "Network error. Please try again.",
            }
            : a
        )
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string, skipConfirm = false) => {
    if (!skipConfirm) {
      const ok = confirm(
        "Are you sure you want to delete this file?"
      );

      if (!ok) return;
    }

    // Optimistic UI Update + cache
    setLeadFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      window.localStorage.setItem("cached_leads", JSON.stringify(updated));
      return updated;
    });

    try {
      const res = await fetch(`${apiUrl}/leads/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        alert("Failed to delete lead from backend.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting lead.");
    }
  };

  const handleViewData = async (file: any) => {
    setViewingFile(file);
    setLoadingContent(true);

    try {
      const res = await fetch(
        `${apiUrl}/leads/${file.id}/content`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();

        if (data.success) {
          setFileContent(data.data.content || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_30%)] pointer-events-none" />

      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-xs font-medium mb-4">
                <Sparkles size={12} />
                OutreachXDeva Leads
              </div>

              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                Lead Management
              </h1>

              <p className="text-zinc-400 mt-3 max-w-2xl">
                Upload, manage, preview, and use CSV or Excel lead
                files directly inside your AI outreach campaigns.
              </p>
            </div>

            {/* Upload Button */}
            <label className="group relative overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition" />

              <div className="relative flex items-center gap-3 px-6 py-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold shadow-2xl shadow-cyan-500/20 transition-all">
                <UploadCloud size={20} />
                Upload Lead File

                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".csv,.xls,.xlsx"
                  disabled={uploading}
                />
              </div>
            </label>
          </div>

          {/* Uploading */}
          {uploading && (
            <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 flex items-center gap-3 text-cyan-300">
              <div className="w-5 h-5 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin" />
              Processing and analyzing uploaded lead file...
            </div>
          )}

          {/* Skeleton loading state */}
          {fetchingLeads && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl p-6"
                >
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                  <style>{`
                    @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                  `}</style>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 animate-pulse" />
                    <div className="w-5 h-5 rounded-full bg-zinc-800 animate-pulse" />
                  </div>
                  <div className="h-5 w-3/4 rounded-xl bg-zinc-800 animate-pulse mb-3" />
                  <div className="h-3 w-1/3 rounded-xl bg-zinc-800/60 animate-pulse mb-6" />
                  <div className="h-3 w-1/4 rounded-lg bg-zinc-800/40 animate-pulse mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-lg bg-zinc-800 animate-pulse" />
                    <div className="h-6 w-20 rounded-lg bg-zinc-800 animate-pulse" />
                    <div className="h-6 w-12 rounded-lg bg-zinc-800 animate-pulse" />
                  </div>
                  <div className="mt-8 pt-5 border-t border-zinc-800 flex flex-col gap-3">
                    <div className="h-11 w-full rounded-2xl bg-zinc-800 animate-pulse" />
                    <div className="flex gap-3">
                      <div className="h-11 flex-1 rounded-2xl bg-zinc-800/60 animate-pulse" />
                      <div className="h-11 w-12 rounded-2xl bg-zinc-800/60 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!fetchingLeads && leadFiles.length === 0 ? (
            <div className="border border-dashed border-zinc-700 rounded-3xl bg-zinc-900/20 p-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
                <Database
                  size={38}
                  className="text-cyan-400"
                />
              </div>

              <h2 className="text-2xl font-semibold mb-3">
                No Lead Files Uploaded
              </h2>

              <p className="text-zinc-500 max-w-lg mx-auto mb-8">
                Upload CSV or Excel files to start building
                outreach campaigns with dynamic lead data.
              </p>

              <label className="inline-flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-3 rounded-2xl font-semibold cursor-pointer">
                <Plus size={18} />
                Upload First File

                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".csv,.xls,.xlsx"
                />
              </label>
            </div>
          ) : !fetchingLeads ? (
            <>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-zinc-500 text-sm">
                      {leadFiles.length} files available
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {leadFiles.map((file) => {
                  const isFailed = file.status === "failed";
                  const isProcessing = file.status === "processing";
                  const isPending = file.status === "pending";
                  const isReady = file.status === "ready" || file.status === "success";
                  const isDisabled = isFailed || isProcessing || isPending;

                  return (
                  <div
                    key={file.id}
                    className={`group relative overflow-hidden rounded-3xl border bg-zinc-900/40 backdrop-blur-xl p-6 transition-all hover:-translate-y-1 ${
                      isFailed
                        ? "border-red-500/30 hover:border-red-500/50"
                        : "border-zinc-800 hover:border-cyan-500/30"
                    }`}
                  >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition ${
                      isFailed
                        ? "bg-gradient-to-br from-red-500/5 to-red-500/5"
                        : "bg-gradient-to-br from-cyan-500/5 to-emerald-500/5"
                    }`} />

                    <div className="relative z-10">
                      {/* Top — Icon + Status Badge */}
                      <div className="flex items-start justify-between mb-6">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${
                          isFailed
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-emerald-500/10 border-emerald-500/20"
                        }`}>
                          <FileSpreadsheet
                            size={24}
                            className={isFailed ? "text-red-400" : "text-emerald-400"}
                          />
                        </div>

                        {isPending ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                            <span className="text-[11px] font-medium text-amber-300">Uploading</span>
                          </div>
                        ) : isProcessing ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                            <span className="text-[11px] font-medium text-amber-300">Processing</span>
                          </div>
                        ) : isFailed ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-400/10 border border-red-400/20">
                            <XCircle size={13} className="text-red-400" />
                            <span className="text-[11px] font-medium text-red-300">Failed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span className="text-[11px] font-medium text-emerald-300">Ready</span>
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <h3
                        className="text-xl font-semibold line-clamp-1"
                        title={file.file_name}
                      >
                        {file.file_name}
                      </h3>

                      {/* Date + Row Count */}
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-sm text-zinc-500">
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                        {file.row_count > 0 && (
                          <span className="text-xs text-zinc-500 px-2 py-0.5 rounded-md bg-zinc-800/60">
                            {file.row_count.toLocaleString()} rows
                          </span>
                        )}
                      </div>

                      {/* Error Banner (for failed uploads) */}
                      {isFailed && file.error_message && (
                        <div className="mt-4 px-3 py-2.5 rounded-xl border border-red-500/15 bg-red-500/5">
                          <p className="text-xs text-red-300/80 line-clamp-2" title={file.error_message}>
                            {file.error_message}
                          </p>
                        </div>
                      )}

                      {/* Columns (only if not failed) */}
                      {!isFailed && (
                      <div className="mt-6">
                        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                          Detected Columns
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {file.columns?.length > 0 ? (
                            <>
                              {file.columns
                                .slice(0, 5)
                                .map((col: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs"
                                  >
                                    {col}
                                  </span>
                                ))}

                              {file.columns.length > 5 && (
                                <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500 text-xs">
                                  +{file.columns.length - 5}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-zinc-600 text-xs">
                              No columns detected
                            </span>
                          )}
                        </div>
                      </div>
                      )}

                      {/* Actions */}
                      <div className="mt-8 pt-5 border-t border-zinc-800 flex flex-col gap-3">
                        {/* Failed state: show retry + delete */}
                        {isFailed ? (
                          <div className="flex gap-3">
                            <label className="flex-1 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer">
                              <RefreshCw size={16} />
                              Retry Upload
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, file.id)}
                                accept=".csv,.xls,.xlsx"
                              />
                            </label>

                            <button
                              onClick={() =>
                                handleDelete(file.id)
                              }
                              className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition flex items-center justify-center"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleViewData(file)
                              }
                              disabled={isDisabled}
                              className={`w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition ${
                                isDisabled
                                  ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                              }`}
                            >
                              <Eye size={16} />
                              View Data
                            </button>

                            <div className="flex gap-3">
                              <button
                                disabled={isDisabled}
                                className={`flex-1 py-3 rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                                  isDisabled
                                    ? "bg-cyan-500/5 text-cyan-800 cursor-not-allowed"
                                    : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300"
                                }`}
                              >
                                <Plus size={16} />
                                Use in Campaign
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(file.id)
                                }
                                className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition flex items-center justify-center"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          ) : null}

        </div>
      </div>

      {/* Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="w-full max-w-7xl h-[90vh] rounded-3xl border border-zinc-800 bg-[#0b0b0b] overflow-hidden flex flex-col shadow-2xl">

            {/* Header */}
            <div className="px-7 py-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <FileSpreadsheet
                    size={24}
                    className="text-emerald-400"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {viewingFile.file_name}
                  </h3>

                  <p className="text-sm text-zinc-500 mt-1">
                    {fileContent.length} rows loaded
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingFile(null)}
                className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {loadingContent ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                </div>
              ) : fileContent.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500">
                  No content found.
                </div>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-20 bg-zinc-950">
                    <tr>
                      <th className="px-5 py-4 text-center border-b border-zinc-800 text-zinc-500 w-16">
                        #
                      </th>

                      {viewingFile.columns?.map(
                        (col: string, i: number) => (
                          <th
                            key={i}
                            className="px-5 py-4 border-b border-zinc-800 text-left text-zinc-300 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {fileContent.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition"
                      >
                        <td className="px-5 py-4 text-zinc-500 text-center">
                          {i + 1}
                        </td>

                        {viewingFile.columns?.map(
                          (col: string, j: number) => (
                            <td
                              key={j}
                              className="px-5 py-4 text-zinc-300 whitespace-nowrap max-w-[260px] truncate"
                              title={String(row[col] || "")}
                            >
                              {row[col] !== null &&
                                row[col] !== undefined ? (
                                String(row[col])
                              ) : (
                                <span className="text-zinc-700">
                                  -
                                </span>
                              )}
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                AI-ready structured lead dataset
              </div>

              <button
                onClick={() => setViewingFile(null)}
                className="px-5 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center gap-2 text-sm"
              >
                Close
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}