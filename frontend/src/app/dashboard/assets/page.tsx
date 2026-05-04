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
  Bot,
  FileText,
  Database,
  Upload,
  Globe,
  ClipboardPaste,
  FileBox,
  X
} from "lucide-react";
import Link from "next/link";

export default function Assets() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [sourceUrl, setSourceUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Array to hold the assets (both optimistically added and fetched from backend)
  const [assets, setAssets] = useState<any[]>([]);

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
  }, [router]);

  const fetchAssets = async (token: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/assets", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Add status 'success' to fetched assets for UI
          const formatted = data.data.map((a: any) => ({ ...a, status: 'success' }));
          setAssets(formatted);
        }
      }
    } catch (err) {
      console.error("Failed to fetch assets", err);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl.trim()) return;
    
    // 1. Validate if it's a URL
    let url;
    try {
      url = new URL(sourceUrl);
    } catch (_) {
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
      const res = await fetch("http://127.0.0.1:8000/assets", {
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
        // 4. Update to success
        setAssets(prev => prev.map(a => 
          a.id === tempId ? { ...a, id: data.data.asset_id || data.data.id, status: "success" } : a
        ));
      } else {
        // 5. Revert/Update to error and show alert
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
      
      const res = await fetch("http://127.0.0.1:8000/assets/upload", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update to success
        setAssets(prev => prev.map(a => 
          a.id === tempId ? { ...a, id: data.data.asset_id, status: "success" } : a
        ));
      } else {
        // Update to error
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
      const res = await fetch("http://127.0.0.1:8000/assets", {
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
      } else {
        alert("Failed to upload text.");
      }
    } catch (error) {
      console.error("Error uploading text:", error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a]">
          
          <div className="w-full max-w-3xl flex flex-col items-center">
            <h2 className="text-4xl font-semibold mb-8 tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Upload Sources for Cold Email Context
            </h2>
            
            {/* The primary input form */}
            <form onSubmit={handleUrlSubmit} className="w-full relative mb-8">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" size={20} />
              <input 
                type="text" 
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="Enter GitHub Repository URL or Website Link" 
                className="w-full bg-zinc-900/80 border border-zinc-700/50 hover:border-cyan-400/50 focus:border-cyan-400 rounded-2xl py-4 pl-12 pr-16 text-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all text-zinc-100 placeholder:text-zinc-500 shadow-2xl"
              />
              <button 
                type="submit"
                disabled={uploading || !sourceUrl.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-cyan-400 text-black px-4 py-1.5 rounded-xl font-medium hover:bg-cyan-300 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </form>

            <div className="w-full bg-zinc-900/30 border border-dashed border-zinc-700/50 rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden group hover:border-cyan-400/50 transition-colors">
              <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <h3 className="text-xl font-medium text-zinc-300 mb-2 relative z-10">or drop your files</h3>
              <p className="text-zinc-500 text-sm mb-8 relative z-10">pdf, images, docs, audio, and more</p>
              
              <div className="flex items-center gap-4 relative z-10 w-full max-w-lg justify-center">
                
                {/* Upload Files Button */}
                <label className="flex items-center gap-2 px-5 py-3 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl cursor-pointer transition-colors shadow-lg">
                  <Upload size={18} className="text-zinc-300" />
                  <span className="text-sm font-medium text-zinc-300">Upload files</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.htm,.txt,image/*,audio/*"
                  />
                </label>

                {/* Websites Button */}
                <button 
                  onClick={() => (document.querySelector("input[type='text']") as HTMLInputElement)?.focus()}
                  className="flex items-center gap-2 px-5 py-3 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl transition-colors shadow-lg"
                >
                  <Globe size={18} className="text-red-400" />
                  <span className="text-sm font-medium text-zinc-300">Websites</span>
                </button>

                {/* Copied Text Button */}
                <button 
                  onClick={() => setShowPasteModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl transition-colors shadow-lg"
                >
                  <ClipboardPaste size={18} className="text-emerald-400" />
                  <span className="text-sm font-medium text-zinc-300">Copied text</span>
                </button>

              </div>
            </div>
            
            {/* Assets List Section */}
            {assets.length > 0 && (
              <div className="w-full mt-10">
                <h3 className="text-xl font-medium text-zinc-200 mb-4 flex items-center gap-2">
                  <Database size={20} className="text-cyan-400" />
                  Your Assets
                </h3>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/80 text-zinc-400">
                      <tr>
                        <th className="px-6 py-4 font-medium">Name / Source</th>
                        <th className="px-6 py-4 font-medium">Type</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-zinc-200 truncate max-w-xs" title={asset.name}>
                              {asset.name}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300">
                              {asset.asset_type === 'github' ? <Globe size={12} className="text-cyan-400"/> : 
                               asset.asset_type === 'document' ? <FileText size={12} className="text-emerald-400"/> :
                               <FileBox size={12} className="text-indigo-400"/>}
                              {asset.asset_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {asset.status === 'pending' ? (
                              <span className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                                <div className="w-2 h-2 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
                                Extracting...
                              </span>
                            ) : asset.status === 'error' ? (
                              <span className="flex items-center gap-2 text-red-400 text-xs font-medium">
                                <X size={14} /> Failed
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Verified
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-zinc-500">
                            {new Date(asset.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative">
            <h2 className="text-xl font-semibold mb-4 text-zinc-100 flex items-center gap-2">
              <ClipboardPaste size={20} className="text-cyan-400"/>
              Paste Text Source
            </h2>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-200 focus:outline-none focus:border-cyan-400 resize-none font-mono text-sm"
              placeholder="Paste your source content here..."
            ></textarea>
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleTextPaste}
                disabled={!pastedText.trim() || uploading}
                className="bg-cyan-400 hover:bg-cyan-300 text-black px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? "Saving..." : "Save Text"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
