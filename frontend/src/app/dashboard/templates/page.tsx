"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Copy,
  LayoutTemplate,
  Wand2,
  Code,
  AlignLeft,
  Eye,
  Settings,
  X,
  Tags,
  ChevronRight
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  subject_line: string;
  html_content: string;
  text_content: string;
  tags: string[];
  variables: Record<string, string>;
  is_ai_generated: boolean;
  created_at: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [templates, setTemplates] = useState<Template[]>([]);
  
  // View State
  const [view, setView] = useState<'list' | 'editor'>('list');
  
  // Editor State
  const [editorMode, setEditorMode] = useState<'html' | 'text'>('html');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Template>>({
    name: "",
    description: "",
    subject_line: "",
    html_content: "",
    text_content: "",
    tags: [],
    variables: {}
  });

  const [tagInput, setTagInput] = useState("");

  // Common Variables for quick insertion
  const commonVariables = ["first_name", "last_name", "company", "role", "email"];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSession(session);
        fetchTemplates(session.access_token);
        setLoading(false);
      }
    });
  }, [router]);

  const fetchTemplates = async (token: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/templates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTemplates(Array.isArray(data.data) ? data.data : []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  };

  // Variable Extraction Logic
  const extractVariables = (text: string): Record<string, string> => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(text.matchAll(regex));
    const vars: Record<string, string> = {};
    matches.forEach(match => {
      const varName = match[1].trim();
      vars[varName] = "string"; // Default type
    });
    return vars;
  };

  const handleContentChange = (field: 'html_content' | 'text_content' | 'subject_line', value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Re-extract variables from subject and the active content mode
      const subjectVars = extractVariables(updated.subject_line || "");
      const contentVars = extractVariables(updated.html_content || "");
      const textVars = extractVariables(updated.text_content || "");
      
      updated.variables = { ...subjectVars, ...contentVars, ...textVars };
      return updated;
    });
  };

  const insertVariable = (varName: string) => {
    const insertion = `{{${varName}}}`;
    // Insert into the currently active editor (simplified: just appends for now, 
    // in a real app you'd use cursor position via refs)
    if (editorMode === 'html') {
      handleContentChange('html_content', (formData.html_content || "") + insertion);
    } else {
      handleContentChange('text_content', (formData.text_content || "") + insertion);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags?.includes(tagInput.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...(prev.tags || []), tagInput.trim()]
        }));
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tagToRemove)
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject_line) {
      alert("Name and Subject Line are required.");
      return;
    }
    
    setSaving(true);
    try {
      const isEditing = !!formData.id;
      const url = isEditing 
        ? `http://127.0.0.1:8000/templates/${formData.id}` 
        : `http://127.0.0.1:8000/templates`;
      
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        await fetchTemplates(session.access_token);
        setView('list');
      } else {
        const errorData = await res.json().catch(() => null);
        alert(errorData?.detail || errorData?.message || "Failed to save template.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditor = (template?: Template) => {
    if (template) {
      setFormData({ ...template });
      // If it has HTML, default to HTML mode, else Text mode
      if (template.html_content && !template.text_content) setEditorMode('html');
      else if (!template.html_content && template.text_content) setEditorMode('text');
    } else {
      setFormData({
        name: "",
        description: "",
        subject_line: "",
        html_content: "",
        text_content: "",
        tags: [],
        variables: {}
      });
    }
    setView('editor');
    setShowPreview(false);
  };

  // Preview Render Logic
  const getPreviewHtml = () => {
    let content = editorMode === 'html' ? (formData.html_content || "") : (formData.text_content || "");
    
    // Replace newlines with <br> for plain text preview
    if (editorMode === 'text') {
      content = content.replace(/\n/g, '<br/>');
    }

    // Dummy Data mapping
    const dummyData: Record<string, string> = {
      first_name: "Alex",
      last_name: "Rivera",
      company: "TechNova Inc.",
      role: "VP of Engineering",
      email: "alex@technova.io"
    };

    // Replace variables
    Object.keys(formData.variables || {}).forEach(v => {
      const value = dummyData[v] || `[${v.toUpperCase()}]`;
      const regex = new RegExp(`\\{\\{${v}\\}\\}`, 'g');
      content = content.replace(regex, `<span style="background-color: #3fdfb033; color: #3fdfb0; padding: 0 4px; border-radius: 4px; font-weight: bold;">${value}</span>`);
    });

    return content;
  };

  if (loading) return <div className="h-full w-full flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a] min-h-screen">
      
      {view === 'list' && (
        <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-300">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-2">
                Email Templates
              </h2>
              <p className="text-zinc-400">Design and manage dynamic templates for your sequences.</p>
            </div>
            <button 
              onClick={() => openEditor()}
              className="bg-cyan-400 hover:bg-cyan-300 text-zinc-950 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus size={18} />
              Create Template
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="w-full bg-zinc-900/30 border border-dashed border-zinc-700/50 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
              <LayoutTemplate size={48} className="text-zinc-600 mb-4" />
              <h3 className="text-xl font-medium text-zinc-300 mb-2">No templates found</h3>
              <p className="text-zinc-500 mb-6 max-w-md">You haven't created any email templates yet. Start by creating a plain text or responsive HTML template.</p>
              <button onClick={() => openEditor()} className="text-cyan-400 hover:text-cyan-300 font-medium">
                + Create your first template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <div key={template.id} className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-xl hover:shadow-cyan-900/5 rounded-2xl p-6 flex flex-col group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-cyan-400/10 rounded-xl">
                      <LayoutTemplate size={24} className="text-cyan-400" />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditor(template)} className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(template.id)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-zinc-100 mb-1 truncate">{template.name}</h3>
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2" title={template.subject_line}>
                    Subj: {template.subject_line}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-zinc-800/50 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] uppercase tracking-wider font-semibold rounded-md">
                      {template.html_content && template.text_content ? "HTML + Text" : template.html_content ? "HTML" : "Text"}
                    </span>
                    {Object.keys(template.variables || {}).length > 0 && (
                      <span className="px-2 py-1 bg-emerald-400/10 text-emerald-400 text-[10px] uppercase tracking-wider font-semibold rounded-md flex items-center gap-1">
                        <Code size={10} /> {Object.keys(template.variables).length} Vars
                      </span>
                    )}
                    {template.tags?.slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 text-[10px] uppercase tracking-wider rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'editor' && (
        <div className="w-full max-w-7xl mx-auto animate-in slide-in-from-right-8 duration-300 h-full flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-zinc-800">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('list')} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors">
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {formData.id ? "Edit Template" : "New Template"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border ${showPreview ? 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}
              >
                <Eye size={16} /> {showPreview ? "Hide Preview" : "Live Preview"}
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-cyan-400 hover:bg-cyan-300 text-zinc-950 px-6 py-2 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>

          <div className="flex gap-6 flex-1 h-full min-h-[600px]">
            {/* Left: Configuration & Editor */}
            <div className={`flex flex-col gap-6 transition-all duration-300 ${showPreview ? 'w-1/2' : 'w-full max-w-4xl mx-auto'}`}>
              
              {/* Meta Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Internal Name *</label>
                    <input 
                      type="text" 
                      value={formData.name || ""}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Q3 SaaS Outreach V1"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Tags size={12}/> Tags</label>
                    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 flex flex-wrap gap-2 items-center focus-within:border-cyan-400 transition-colors min-h-[46px]">
                      {formData.tags?.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-md flex items-center gap-1">
                          {tag} <X size={10} className="cursor-pointer hover:text-red-400" onClick={() => removeTag(tag)}/>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Type & Enter..."
                        className="bg-transparent border-none focus:outline-none text-sm text-white flex-1 min-w-[100px] px-2 py-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email Subject Line *</label>
                  <input 
                    type="text" 
                    value={formData.subject_line || ""}
                    onChange={e => handleContentChange('subject_line', e.target.value)}
                    placeholder="Quick question for {{first_name}}"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400 font-medium"
                  />
                </div>
              </div>

              {/* Editor Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col flex-1 overflow-hidden min-h-[400px]">
                
                {/* Editor Toolbar */}
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
                  <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                    <button 
                      onClick={() => setEditorMode('html')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${editorMode === 'html' ? 'bg-zinc-800 text-cyan-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <Code size={14} /> HTML
                    </button>
                    <button 
                      onClick={() => setEditorMode('text')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${editorMode === 'text' ? 'bg-zinc-800 text-cyan-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <AlignLeft size={14} /> Plain Text
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-medium mr-1">Variables:</span>
                    {commonVariables.map(v => (
                      <button 
                        key={v}
                        onClick={() => insertVariable(v)}
                        className="px-2 py-1 bg-zinc-800 hover:bg-cyan-400/20 text-zinc-300 hover:text-cyan-400 border border-zinc-700/50 hover:border-cyan-400/30 rounded text-[10px] font-mono transition-colors"
                        title={`Insert {{${v}}}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Area */}
                <div className="flex-1 relative p-4 bg-[#0d0d0d]">
                  {editorMode === 'html' ? (
                    <textarea
                      value={formData.html_content || ""}
                      onChange={e => handleContentChange('html_content', e.target.value)}
                      placeholder="<p>Hi {{first_name}},</p>"
                      className="w-full h-full bg-transparent text-emerald-400/90 font-mono text-sm focus:outline-none resize-none leading-relaxed"
                      spellCheck="false"
                    />
                  ) : (
                    <textarea
                      value={formData.text_content || ""}
                      onChange={e => handleContentChange('text_content', e.target.value)}
                      placeholder="Hi {{first_name}},\n\nJust reaching out to..."
                      className="w-full h-full bg-transparent text-zinc-200 font-sans text-sm focus:outline-none resize-none leading-relaxed"
                    />
                  )}
                </div>
                
                {/* Detected Variables Footer */}
                <div className="bg-zinc-950 border-t border-zinc-800 px-4 py-2.5 flex items-center gap-3">
                  <Wand2 size={14} className="text-cyan-400" />
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Detected Variables:</span>
                  <div className="flex gap-2">
                    {Object.keys(formData.variables || {}).length === 0 ? (
                      <span className="text-xs text-zinc-700 italic">None detected yet. Type {'{{variable}}'} to create one.</span>
                    ) : (
                      Object.keys(formData.variables || {}).map(v => (
                        <span key={v} className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                          {v}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Preview Panel */}
            {showPreview && (
              <div className="w-1/2 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
                <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-zinc-950">
                    JD
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white line-clamp-1">{formData.subject_line || "(No Subject)"}</p>
                    <p className="text-xs text-zinc-500">To: alex@technova.io</p>
                  </div>
                </div>
                
                <div className="flex-1 bg-white p-8 overflow-y-auto">
                  <div 
                    className={`prose prose-sm max-w-none ${editorMode === 'text' ? 'font-sans whitespace-pre-wrap text-gray-800' : ''}`}
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
