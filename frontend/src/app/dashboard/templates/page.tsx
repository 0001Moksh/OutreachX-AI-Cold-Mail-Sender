"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";

import {
  Plus,
  Trash2,
  Edit2,
  LayoutTemplate,
  Wand2,
  Code,
  AlignLeft,
  Eye,
  X,
  Tags,
  ChevronRight,
  Search,
  Sparkles,
  Copy,
  Check,
  MonitorSmartphone,
  Mail,
  CalendarClock,
  Braces,
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

const COMMON_VARIABLES = [
  "first_name",
  "last_name",
  "company",
  "role",
  "email",
  "industry",
  "website",
  "linkedin",
];

// Stable color palette for tags — same tag name always maps to same color
const TAG_COLORS = [
  { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-300" },
  { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-300" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300" },
  { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-300" },
  { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-300" },
  { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-300" },
  { bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/30", text: "text-fuchsia-300" },
  { bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-300" },
  { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-300" },
  { bg: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-300" },
];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
};

export default function TemplatesPage() {
  const router = useRouter();
  const apiUrl = getApiUrl();

  const htmlEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [templates, setTemplates] = useState<Template[]>([]);

  const [view, setView] = useState<"list" | "editor">("list");

  const [editorMode, setEditorMode] = useState<"html" | "text">("html");

  const [showPreview, setShowPreview] = useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [copied, setCopied] = useState(false);

  const [tagInput, setTagInput] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const [formData, setFormData] = useState<Partial<Template>>({
    name: "",
    description: "",
    subject_line: "",
    html_content: "",
    text_content: "",
    tags: [],
    variables: {},
  });

  const fetchTemplates = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${apiUrl}/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store"
      });

      if (res.ok) {
        const data = await res.json();

        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : [];
          setTemplates(list);
          window.localStorage.setItem("cached_templates", JSON.stringify(list));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [apiUrl]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSession(session);

        const cached = window.localStorage.getItem("cached_templates");
        if (cached) {
          try {
            setTemplates(JSON.parse(cached));
            setLoading(false);
          } catch (e) {
            console.error("Failed to parse cached templates", e);
          }
        }

        fetchTemplates(session.access_token).then(() => {
          setLoading(false);
        });
      }
    });
  }, [fetchTemplates, router]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const text = `
      ${t.name}
      ${t.subject_line}
      ${t.description}
      ${t.tags?.join(" ")}
      `
        .toLowerCase()
        .trim();

      return text.includes(search.toLowerCase());
    });
  }, [templates, search]);

  const extractVariables = (text: string): Record<string, string> => {
    const regex = /\{\{([^}]+)\}\}/g;

    const matches = Array.from(text.matchAll(regex));

    const vars: Record<string, string> = {};

    matches.forEach((match) => {
      const variable = match[1].trim();

      vars[variable] = "string";
    });

    return vars;
  };

  const handleContentChange = (
    field: "subject_line" | "html_content" | "text_content",
    value: string
  ) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      updated.variables = {
        ...extractVariables(updated.subject_line || ""),
        ...extractVariables(updated.html_content || ""),
        ...extractVariables(updated.text_content || ""),
      };

      return updated;
    });
  };

  const insertVariable = (variable: string) => {
    const textarea =
      editorMode === "html"
        ? htmlEditorRef.current
        : textEditorRef.current;

    const insertion = `{{${variable}}}`;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const value =
      editorMode === "html"
        ? formData.html_content || ""
        : formData.text_content || "";

    const updated =
      value.substring(0, start) +
      insertion +
      value.substring(end, value.length);

    if (editorMode === "html") {
      handleContentChange("html_content", updated);
    } else {
      handleContentChange("text_content", updated);
    }

    requestAnimationFrame(() => {
      textarea.focus();

      textarea.selectionStart = textarea.selectionEnd =
        start + insertion.length;
    });
  };

  const handleAddTag = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();

      if (!formData.tags?.includes(tagInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          tags: [...(prev.tags || []), tagInput.trim()],
        }));
      }

      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag),
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject_line) {
      alert("Template name and subject line are required.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = !!formData.id;

      const url = isEditing
        ? `${apiUrl}/templates/${formData.id}`
        : `${apiUrl}/templates`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
        cache: "no-store"
      });

      if (res.ok) {
        if (session?.access_token) {
          await fetchTemplates(session.access_token);
        }

        setView("list");
      } else {
        const error = await res.json().catch(() => null);

        alert(error?.message || "Failed to save template.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = confirm(
      "Are you sure you want to delete this template?"
    );

    if (!ok) return;

    // Optimistic UI Update
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      window.localStorage.setItem("cached_templates", JSON.stringify(updated));
      return updated;
    });

    try {
      const res = await fetch(`${apiUrl}/templates/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        alert("Failed to delete template from backend.");
        if (session?.access_token) fetchTemplates(session.access_token);
      }
    } catch (err) {
      console.error(err);
      if (session?.access_token) fetchTemplates(session.access_token);
    }
  };

  const openEditor = async (template?: Template) => {
    if (template) {
      let fullTemplate = template;
      if (template.id && session?.access_token) {
        try {
          const res = await fetch(`${apiUrl}/templates/${template.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store"
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              fullTemplate = data.data;
            }
          } else {
            alert("Warning: Failed to fetch full template. Is the backend updated? Please restart uvicorn.");
          }
        } catch (e) {
          console.error("Failed to fetch full template details", e);
          alert("Network error: Failed to connect to backend for template.");
        }
      }

      setFormData(fullTemplate);

      if (fullTemplate.html_content && !fullTemplate.text_content) {
        setEditorMode("html");
      }

      if (!fullTemplate.html_content && fullTemplate.text_content) {
        setEditorMode("text");
      }
    } else {
      setFormData({
        name: "",
        description: "",
        subject_line: "",
        html_content: "",
        text_content: "",
        tags: [],
        variables: {},
      });

      setEditorMode("html");
    }

    setView("editor");
  };

  const handlePreview = async (template: Template) => {
    setPreviewTemplate({ ...template, html_content: "Loading...", text_content: "Loading..." });
    try {
      const res = await fetch(`${apiUrl}/templates/${template.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPreviewTemplate(data.data);
          return;
        }
      } else {
        alert("Warning: Failed to fetch full template. Is the backend updated? Please restart uvicorn.");
      }
    } catch (e) {
      console.error("Failed to load preview details", e);
      alert("Network error: Failed to connect to backend for preview.");
    }
    setPreviewTemplate(template);
  };

  const duplicateTemplate = (template: Template) => {
    setFormData({
      ...template,
      id: undefined,
      name: `${template.name} Copy`,
    });

    setView("editor");
  };

  const getPreviewHtml = (template: Partial<Template> = formData, mode: "html" | "text" = editorMode) => {
    let content =
      mode === "html"
        ? template.html_content || ""
        : template.text_content || "";

    if (mode === "text") {
      content = content.replace(/\n/g, "<br/>");
    }

    const mockData: Record<string, string> = {
      first_name: "Alex",
      last_name: "Rivera",
      company: "TechNova Inc.",
      role: "VP Engineering",
      email: "alex@technova.io",
      industry: "Artificial Intelligence",
      website: "technova.io",
      linkedin: "linkedin.com/in/alexrivera",
    };

    Object.keys(template.variables || {}).forEach((v) => {
      const regex = new RegExp(`\\{\\{${v}\\}\\}`, "g");

      content = content.replace(
        regex,
        `<span style="background:#06b6d433;color:#06b6d4;padding:2px 6px;border-radius:6px;font-weight:600;">${mockData[v] || `[${v}]`
        }</span>`
      );
    });

    return content;
  };

  const handleCopy = async () => {
    const content =
      editorMode === "html"
        ? formData.html_content
        : formData.text_content;

    await navigator.clipboard.writeText(content || "");

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_30%)] pointer-events-none" />

      <div className="relative z-10 p-8">
        {view === "list" && (
          <div className="max-w-7xl mx-auto">
            {/* Header Title Section */}
            <div className="border-b border-white/[0.06] pb-6 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-xs font-medium mb-4">
                <Sparkles size={12} />
                OutreachXDeva Templates
              </div>

              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                Smart Email Templates
              </h1>

              <p className="text-zinc-400 mt-3 max-w-2xl text-sm">
                Create intelligent outreach templates with variables,
                HTML support, and live email rendering.
              </p>
            </div>

            {/* Thinned & Lowered Search & Navigation Area */}
            <div className="flex items-center justify-between gap-4 mb-8 sticky top-0 z-20 backdrop-blur-md py-3 border-b border-white/[0.04]">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-[260px] bg-zinc-900/40 border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-cyan-400/30 transition-all placeholder-zinc-600"
                />
              </div>

              <button
                onClick={() => openEditor()}
                className="bg-cyan-400 hover:bg-cyan-300 text-black px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-xs transition-all"
              >
                <Plus size={15} />
                New Template
              </button>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="border border-dashed border-zinc-700 rounded-3xl bg-zinc-900/20 p-20 text-center">
                <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
                  <LayoutTemplate
                    size={40}
                    className="text-cyan-400"
                  />
                </div>

                <h2 className="text-2xl font-semibold mb-2">
                  No templates found
                </h2>

                <p className="text-zinc-500 mb-8">
                  Create your first AI-ready outreach template.
                </p>

                <button
                  onClick={() => openEditor()}
                  className="bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-3 rounded-2xl font-semibold"
                >
                  Create Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Mail
                          size={24}
                          className="text-cyan-400"
                        />
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handlePreview(template)}
                          className="p-2 rounded-xl bg-zinc-800 hover:text-cyan-300"
                          title="View template"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() =>
                            duplicateTemplate(template)
                          }
                          className="p-2 rounded-xl bg-zinc-800"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          onClick={() => openEditor(template)}
                          className="p-2 rounded-xl bg-zinc-800"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(template.id)
                          }
                          className="p-2 rounded-xl bg-zinc-800 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold line-clamp-1">
                      {template.name}
                    </h3>

                    <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                      {template.subject_line}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-6">
                      {template.tags?.map((tag) => {
                        const c = getTagColor(tag);
                        return (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${c.bg} ${c.border} ${c.text}`}
                          >
                            <span className="opacity-60">#</span>{tag}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-8 pt-5 border-t border-zinc-800">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Braces size={14} />
                        {Object.keys(template.variables || {}).length}{" "}
                        Variables
                      </div>

                      <div className="flex items-center gap-2 text-xs text-cyan-400">
                        <CalendarClock size={14} />
                        Active
                      </div>
                    </div>

                    <button
                      onClick={() => handlePreview(template)}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-300 hover:bg-cyan-400/15"
                    >
                      <Eye size={16} />
                      View Preview
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "editor" && (
          <div className="max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView("list")}
                  className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center"
                >
                  <ChevronRight
                    size={18}
                    className="rotate-180"
                  />
                </button>

                <div>
                  <h2 className="text-3xl font-bold">
                    {formData.id
                      ? "Edit Template"
                      : "Create Template"}
                  </h2>

                  <p className="text-zinc-500 mt-1">
                    Build modern personalized email experiences.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </button>

                <button
                  onClick={() =>
                    setShowPreview((prev) => !prev)
                  }
                  className={`px-4 py-3 rounded-2xl border flex items-center gap-2 ${showPreview
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    : "border-zinc-800 bg-zinc-900"
                    }`}
                >
                  <Eye size={16} />
                  Preview
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-cyan-400 hover:bg-cyan-300 text-black px-6 py-3 rounded-2xl font-semibold"
                >
                  {saving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>

            {/* FULL WIDTH TEMPLATE INFO */}
            <div className="w-full rounded-[32px] border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl p-7 mb-7">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-2 block">
                    Template Name
                  </label>

                  <input
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Q3 SaaS Campaign"
                    className="w-full bg-[#0d0d0d] border border-zinc-800 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-2 block">
                    Description
                  </label>

                  <input
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Cold outreach for founders"
                    className="w-full bg-[#0d0d0d] border border-zinc-800 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-2 block">
                    Subject Line
                  </label>

                  <input
                    value={formData.subject_line || ""}
                    onChange={(e) =>
                      handleContentChange(
                        "subject_line",
                        e.target.value
                      )
                    }
                    placeholder="Quick question for {{first_name}}"
                    className="w-full bg-[#0d0d0d] border border-zinc-800 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* TAGS */}
              <div className="mt-6">
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-2 flex items-center gap-2">
                  <Tags size={12} />
                  Tags
                </label>

                <div className="w-full bg-[#0d0d0d] border border-zinc-800 rounded-2xl px-3 py-3 flex flex-wrap gap-2 focus-within:border-cyan-400">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-xl flex items-center gap-2"
                    >
                      {tag}

                      <X
                        size={12}
                        className="cursor-pointer hover:text-red-400"
                        onClick={() => removeTag(tag)}
                      />
                    </span>
                  ))}

                  <input
                    value={tagInput}
                    onChange={(e) =>
                      setTagInput(e.target.value)
                    }
                    onKeyDown={handleAddTag}
                    placeholder="Press Enter..."
                    className="bg-transparent flex-1 outline-none text-sm min-w-[120px]"
                  />
                </div>
              </div>
            </div>

            {/* EDITOR + PREVIEW */}
            <div
              className={`grid gap-7 ${showPreview
                ? "grid-cols-1 xl:grid-cols-2"
                : "grid-cols-1"
                }`}
            >
              {/* EDITOR */}
              <div className="rounded-[32px] border border-zinc-800 bg-zinc-900/40 overflow-hidden backdrop-blur-xl flex flex-col">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b border-zinc-800 p-5 bg-zinc-950/80">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 bg-[#0d0d0d] rounded-2xl p-1 border border-zinc-800">
                      <button
                        onClick={() => setEditorMode("html")}
                        className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm transition ${editorMode === "html"
                          ? "bg-zinc-800 text-cyan-400"
                          : "text-zinc-500"
                          }`}
                      >
                        <Code size={14} />
                        HTML
                      </button>

                      <button
                        onClick={() => setEditorMode("text")}
                        className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm transition ${editorMode === "text"
                          ? "bg-zinc-800 text-cyan-400"
                          : "text-zinc-500"
                          }`}
                      >
                        <AlignLeft size={14} />
                        Plain Text
                      </button>
                    </div>
                  </div>

                  {/* Variable guide hint */}
                  <div className="flex items-start gap-2 rounded-xl border border-cyan-500/10 bg-cyan-500/5 px-3 py-2">
                    <Braces size={13} className="mt-0.5 shrink-0 text-cyan-400" />
                    <p className="text-[11px] leading-5 text-zinc-400">
                      Use <code className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] font-mono text-cyan-300">{"{{variable_name}}"}</code> to insert dynamic values that map to your leads&apos; columns.
                      <span className="ml-1 text-zinc-500">Click a chip to insert at cursor →</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {COMMON_VARIABLES.map((v) => (
                      <button
                        key={v}
                        onClick={() => insertVariable(v)}
                        title={`Insert {{${v}}} at cursor`}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-cyan-500/10 hover:text-cyan-300 border border-zinc-700 text-xs font-mono transition-all"
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CODE AREA */}
                <div className="bg-[#070707] min-h-[700px]">
                  {editorMode === "html" ? (
                    <textarea
                      ref={htmlEditorRef}
                      value={formData.html_content || ""}
                      onChange={(e) =>
                        handleContentChange(
                          "html_content",
                          e.target.value
                        )
                      }
                      placeholder="<p>Hello {{first_name}}</p>"
                      spellCheck={false}
                      className="w-full h-[700px] bg-transparent resize-none p-8 outline-none font-mono text-sm text-emerald-400"
                    />
                  ) : (
                    <textarea
                      ref={textEditorRef}
                      value={formData.text_content || ""}
                      onChange={(e) =>
                        handleContentChange(
                          "text_content",
                          e.target.value
                        )
                      }
                      placeholder="Hi {{first_name}},"
                      className="w-full h-[700px] bg-transparent resize-none p-8 outline-none text-sm text-zinc-100 leading-7"
                    />
                  )}
                </div>

                {/* FOOTER */}
                <div className="border-t border-zinc-800 p-5 bg-zinc-950 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Wand2
                      size={14}
                      className="text-cyan-400"
                    />
                    Detected Variables
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.keys(formData.variables || {}).map(
                      (v) => (
                        <span
                          key={v}
                          className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-xl font-mono"
                        >
                          {v}
                        </span>
                      )
                    )}

                    {Object.keys(formData.variables || {})
                      .length === 0 && (
                        <span className="text-xs text-zinc-700">
                          No variables detected
                        </span>
                      )}
                  </div>
                </div>
              </div>

              {/* PREVIEW */}
              {showPreview && (
                <div className="rounded-[32px] border border-zinc-800 bg-zinc-900/40 overflow-hidden backdrop-blur-xl flex flex-col min-h-0">
                  {/* MAIL TOP BAR */}
                  <div className="border-b border-zinc-800 bg-zinc-950 p-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <MonitorSmartphone size={14} />
                      Live Mail Preview
                    </div>
                  </div>

                  {/* MAIL BODY — scrollable, no fixed height */}
                  <div className="flex-1 min-h-0 overflow-y-auto bg-[#f4f4f5] p-4">
                    <div className="max-w-3xl mx-auto">
                      <div className="bg-white rounded-[28px] border border-zinc-200 shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden">
                        {/* MAIL HEADER */}
                        <div className="px-8 py-6 border-b border-zinc-200 bg-zinc-50">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h2 className="text-lg font-semibold text-zinc-900 leading-snug break-words">
                                Subject: {formData.subject_line ||
                                  "Untitled Subject Line"}
                              </h2>

                              <div className="mt-2 text-sm text-zinc-500">
                                <p>
                                  <span className="font-medium text-zinc-700">To:</span>{" "}
                                  Alex Rivera
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center">
                              <Mail size={20} className="text-white" />
                            </div>
                          </div>
                        </div>

                        {/* MAIL CONTENT */}
                        <div className="px-8 py-10 bg-white overflow-x-auto">
                          <div
                            className={`max-w-none text-black ${editorMode === "text"
                              ? "whitespace-pre-wrap text-gray-800 text-[15px] leading-8"
                              : "text-black"
                              }`}
                            dangerouslySetInnerHTML={{
                              __html: getPreviewHtml(),
                            }}
                          />
                        </div>

                        {/* MAIL FOOTER */}
                        <div className="border-t border-zinc-100 px-8 py-5 bg-zinc-50 text-xs text-zinc-500">
                          Sent via OutreachXDeva Campaign Engine
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-zinc-800 bg-[#090909] shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between gap-5 border-b border-zinc-800 bg-zinc-950 px-6 py-5">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  {previewTemplate.tags?.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-xl bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <h2 className="truncate text-2xl font-semibold text-white">
                  {previewTemplate.name}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Subject: {previewTemplate.subject_line || "Untitled Subject Line"}
                </p>
              </div>

              <button
                onClick={() => setPreviewTemplate(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f4f5] p-4 sm:p-8">
              <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
                <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-5">
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Subject: {previewTemplate.subject_line || "Untitled Subject Line"}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    To: Alex Rivera
                  </p>
                </div>

                <div className="px-6 py-8">
                  <div
                    className={`max-w-none text-black ${previewTemplate.html_content ? "" : "whitespace-pre-wrap text-[15px] leading-8 text-gray-800"
                      }`}
                    dangerouslySetInnerHTML={{
                      __html: getPreviewHtml(
                        previewTemplate,
                        previewTemplate.html_content ? "html" : "text"
                      ),
                    }}
                  />
                </div>

                <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-4 text-xs text-zinc-500">
                  Preview rendered with sample lead data.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  openEditor(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-300"
              >
                <Edit2 size={16} />
                Edit Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
