"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

export default function Leads() {
  const router = useRouter();
  const apiUrl = getApiUrl();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [leadFiles, setLeadFiles] = useState<any[]>([]);

  const [viewingFile, setViewingFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSession(session);
        fetchLeadFiles(session.access_token);
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
            status: "success",
          }));

          setLeadFiles(formatted);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const tempId = "temp-" + Date.now();

    const newFile = {
      id: tempId,
      file_name: file.name,
      status: "pending",
      created_at: new Date().toISOString(),
      columns: [],
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

        setLeadFiles((prev) =>
          prev.map((a) =>
            a.id === tempId
              ? {
                ...a,
                id: data.data.lead_id,
                file_name: data.data.file_name,
                status: "success",
                columns: data.data.columns,
              }
              : a
          )
        );
      } else {
        setLeadFiles((prev) =>
          prev.map((a) =>
            a.id === tempId
              ? {
                ...a,
                status: "error",
              }
              : a
          )
        );

        alert("Upload failed.");
      }
    } catch (err) {
      console.error(err);

      setLeadFiles((prev) =>
        prev.map((a) =>
          a.id === tempId
            ? {
              ...a,
              status: "error",
            }
            : a
        )
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    const ok = confirm(
      "Are you sure you want to delete this file?"
    );

    if (!ok) return;

    // Optimistic UI Update
    setLeadFiles((prev) =>
      prev.filter((f) => f.id !== id)
    );

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

          {/* Empty */}
          {leadFiles.length === 0 ? (
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
          ) : (
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
                {leadFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl p-6 hover:border-cyan-500/30 transition-all hover:-translate-y-1"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-cyan-500/5 to-emerald-500/5" />

                    <div className="relative z-10">
                      {/* Top */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <FileSpreadsheet
                            size={24}
                            className="text-emerald-400"
                          />
                        </div>

                        {file.status === "pending" ? (
                          <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                        ) : file.status === "error" ? (
                          <AlertCircle
                            size={18}
                            className="text-red-400"
                          />
                        ) : (
                          <CheckCircle2
                            size={20}
                            className="text-emerald-400"
                          />
                        )}
                      </div>

                      {/* Name */}
                      <h3
                        className="text-xl font-semibold line-clamp-1"
                        title={file.file_name}
                      >
                        {file.file_name}
                      </h3>

                      <p className="text-sm text-zinc-500 mt-2">
                        {new Date(
                          file.created_at
                        ).toLocaleDateString()}
                      </p>

                      {/* Columns */}
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

                      {/* Actions */}
                      <div className="mt-8 pt-5 border-t border-zinc-800 flex flex-col gap-3">
                        <button
                          onClick={() =>
                            handleViewData(file)
                          }
                          className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium flex items-center justify-center gap-2 transition"
                        >
                          <Eye size={16} />
                          View Data
                        </button>

                        <div className="flex gap-3">
                          <button className="flex-1 py-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-sm font-medium transition flex items-center justify-center gap-2">
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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