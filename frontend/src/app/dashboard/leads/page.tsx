"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  X,
  Plus,
  Trash2,
  Eye,
  Users
} from "lucide-react";

export default function Leads() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const [leadFiles, setLeadFiles] = useState<any[]>([]);

  // View Data State
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
        setLoading(false);
      }
    });
  }, [router]);

  const fetchLeadFiles = async (token: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/leads", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const formatted = data.data.map((a: any) => ({ ...a, status: 'success' }));
          setLeadFiles(formatted);
        }
      }
    } catch (err) {
      console.error("Failed to fetch lead files", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Optimistic UI
    const tempId = "temp-" + Date.now();
    const newFile = {
      id: tempId,
      file_name: file.name,
      status: "pending",
      created_at: new Date().toISOString(),
      columns: []
    };
    
    setLeadFiles(prev => [newFile, ...prev]);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("http://127.0.0.1:8000/leads/upload", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setLeadFiles(prev => prev.map(a => 
          a.id === tempId ? { 
            ...a, 
            id: data.data.lead_id, 
            file_name: data.data.file_name,
            status: "success",
            columns: data.data.columns 
          } : a
        ));
      } else {
        setLeadFiles(prev => prev.map(a => 
          a.id === tempId ? { ...a, status: "error" } : a
        ));
        alert("Failed to upload file. Ensure it is a valid CSV or Excel file.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setLeadFiles(prev => prev.map(a => 
        a.id === tempId ? { ...a, status: "error" } : a
      ));
      alert("Failed to upload file. Network error.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead file?")) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/leads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        setLeadFiles(prev => prev.filter(f => f.id !== id));
      } else {
        alert("Failed to delete lead file.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while deleting.");
    }
  };

  const handleViewData = async (file: any) => {
    setViewingFile(file);
    setLoadingContent(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/leads/${file.id}/content`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFileContent(data.data.content || []);
        }
      } else {
        alert("Failed to load file content.");
        setViewingFile(null);
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
      setViewingFile(null);
    } finally {
      setLoadingContent(false);
    }
  };

  if (loading) return <div className="h-full w-full flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a]">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
        <h2 className="text-4xl font-semibold mb-8 tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Upload Lead Lists
        </h2>

        {/* Upload Zone */}
        <div className="w-full max-w-3xl bg-zinc-900/30 border border-dashed border-zinc-700/50 rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden group hover:border-cyan-400/50 transition-colors mb-12">
          <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <h3 className="text-xl font-medium text-zinc-300 mb-2 relative z-10">Upload CSV or Excel file</h3>
          <p className="text-zinc-500 text-sm mb-8 relative z-10">Only .csv, .xls, and .xlsx formats are supported</p>
          
          <div className="flex items-center gap-4 relative z-10">
            <label className="flex items-center gap-2 px-6 py-3 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl cursor-pointer transition-colors shadow-lg">
              <FileSpreadsheet size={20} className="text-emerald-400" />
              <span className="text-sm font-medium text-zinc-300">Choose File</span>
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload} 
                accept=".csv,.xls,.xlsx"
                disabled={uploading}
              />
            </label>
          </div>
          {uploading && <p className="mt-4 text-cyan-400 text-sm animate-pulse">Processing file...</p>}
        </div>
        
        {/* Lead Files Cards Grid */}
        <div className="w-full">
          <h3 className="text-xl font-medium text-zinc-200 mb-6 flex items-center gap-2">
            <Users size={20} className="text-cyan-400" />
            Your Uploaded Lists
          </h3>
          
          {leadFiles.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
              <p className="text-zinc-500">No leads uploaded yet. Add a CSV or Excel file above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leadFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-2xl p-6 flex flex-col relative group shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-400/10 rounded-xl">
                      <FileSpreadsheet size={24} className="text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'pending' ? (
                        <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
                      ) : file.status === 'error' ? (
                        <X size={18} className="text-red-400" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2"></div>
                      )}
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-medium text-zinc-200 truncate mb-1" title={file.file_name}>
                    {file.file_name}
                  </h4>
                  <p className="text-xs text-zinc-500 mb-4">
                    {new Date(file.created_at).toLocaleDateString()}
                  </p>
                  
                  <div className="mt-auto">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Detected Columns:</p>
                    <div className="flex flex-wrap gap-2">
                      {file.columns?.length > 0 ? (
                        file.columns.slice(0, 5).map((col: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-md truncate max-w-[100px]">
                            {col}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600 italic">No columns detected</span>
                      )}
                      {file.columns?.length > 5 && (
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-md">
                          +{file.columns.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleViewData(file)}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye size={14} /> View Data
                      </button>
                      <button 
                        onClick={() => handleDelete(file.id)}
                        className="p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl transition-colors"
                        title="Delete List"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2">
                      <Plus size={14} /> Use in Campaign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Data Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                  <FileSpreadsheet className="text-emerald-400" size={24} />
                  {viewingFile.file_name}
                </h3>
                <p className="text-zinc-400 text-sm mt-1">{fileContent.length} rows detected</p>
              </div>
              <button 
                onClick={() => setViewingFile(null)}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {loadingContent ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : fileContent.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-zinc-500">
                  No data found in this file.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="py-3 px-4 text-zinc-400 font-medium border-b border-zinc-800 w-16 text-center">#</th>
                      {viewingFile.columns?.map((col: string, i: number) => (
                        <th key={i} className="py-3 px-4 text-zinc-300 font-medium border-b border-zinc-800 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileContent.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                        <td className="py-3 px-4 text-zinc-500 text-center">{i + 1}</td>
                        {viewingFile.columns?.map((col: string, j: number) => (
                          <td key={j} className="py-3 px-4 text-zinc-400 max-w-[200px] truncate" title={String(row[col] || '')}>
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-zinc-700">-</span>}
                          </td>
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

    </div>
  );
}
