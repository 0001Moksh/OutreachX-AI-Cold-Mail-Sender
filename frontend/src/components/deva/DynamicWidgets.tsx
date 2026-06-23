import React, { useState, useRef } from "react";
import { Check, Copy, Code, Save, Play, Upload, Link, FileSpreadsheet, FileText, AlertCircle, Loader2 } from "lucide-react";

interface WidgetProps {
  type: string;
  payload: any;
  onAction?: (action: any) => void;
}

export function DynamicWidget({ type, payload, onAction }: WidgetProps) {
  if (type === "template_editor") {
    return <TemplateEditorWidget payload={payload} onAction={onAction} />;
  }
  if (type === "campaign_wizard") {
    return <CampaignWizardWidget payload={payload} onAction={onAction} />;
  }
  if (type === "lead_uploader") {
    return <LeadUploaderWidget payload={payload} onAction={onAction} />;
  }
  if (type === "asset_uploader") {
    return <AssetUploaderWidget payload={payload} onAction={onAction} />;
  }
  if (type === "link_submission") {
    return <LinkSubmissionWidget payload={payload} onAction={onAction} />;
  }
  
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl mt-4">
      <p className="text-sm text-zinc-400">Unsupported widget type: {type}</p>
    </div>
  );
}

// 1. Template Editor Widget
function TemplateEditorWidget({ payload, onAction }: any) {
  const [code, setCode] = useState(payload.html_content || "");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0A0A0A] overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase tracking-wider">
          <Code size={14} /> Template Editor
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="p-1.5 text-zinc-400 hover:text-white transition-colors">
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-r border-zinc-800">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-[300px] bg-transparent text-zinc-300 p-4 font-mono text-sm resize-none focus:outline-none scrollbar-thin scrollbar-thumb-zinc-800"
            spellCheck={false}
          />
        </div>
        <div className="bg-white text-black p-4 h-[300px] overflow-y-auto">
          <div dangerouslySetInnerHTML={{ __html: code }} />
        </div>
      </div>
      <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-3">
         <button 
           onClick={() => onAction && onAction({ type: "save_template", payload: { html_content: code } })}
           className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors"
         >
           <Save size={16} /> Save Template
         </button>
      </div>
    </div>
  );
}

// 2. Campaign Wizard Widget
function CampaignWizardWidget({ payload, onAction }: any) {
  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0A0A0A] overflow-hidden p-6">
      <h3 className="text-lg font-medium text-white mb-2">Campaign Wizard: {payload.name || "New Campaign"}</h3>
      <p className="text-sm text-zinc-400 mb-6">Review the details before starting.</p>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between border-b border-zinc-800 pb-2">
          <span className="text-zinc-500">Leads List:</span>
          <span className="text-zinc-200">{payload.leads_file_name || "Not selected"}</span>
        </div>
        <div className="flex justify-between border-b border-zinc-800 pb-2">
          <span className="text-zinc-500">Template:</span>
          <span className="text-zinc-200">{payload.template_name || "Not selected"}</span>
        </div>
      </div>
      
      <button 
         onClick={() => onAction && onAction({ type: "confirm_campaign", payload })}
         className="w-full flex justify-center items-center gap-2 bg-white text-black hover:bg-zinc-200 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
      >
         <Play size={16} /> Start Campaign
      </button>
    </div>
  );
}

// 3. Lead Uploader Widget
function LeadUploaderWidget({ payload, onAction }: any) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    
    // Validate headers for Company Name and Email
    const companyNameIdx = headers.findIndex(h => 
      h.includes("company name") || h.includes("company_name") || h === "company"
    );
    const emailIdx = headers.findIndex(h => 
      h.includes("email") || h.includes("contact email") || h.includes("contact_email")
    );

    if (companyNameIdx === -1 || emailIdx === -1) {
      throw new Error("CSV must contain both 'Company Name' and 'Email' columns.");
    }

    const leads: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (columns.length >= headers.length) {
        leads.push({
          company_name: columns[companyNameIdx],
          email: columns[emailIdx],
          contact_name: columns[headers.findIndex(h => h.includes("name") && h !== "company_name")] || "",
          website: columns[headers.findIndex(h => h.includes("website") || h === "url")] || "",
          location: columns[headers.findIndex(h => h.includes("location") || h === "city")] || "",
          role: columns[headers.findIndex(h => h.includes("role") || h.includes("title"))] || ""
        });
      }
    }
    return leads;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setParsedLeads([]);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const leads = parseCSV(text);
        if (leads.length === 0) {
          setError("No valid prospect records found in file.");
        } else {
          setParsedLeads(leads);
        }
      } catch (err: any) {
        setError(err.message || "Failed to parse CSV file.");
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setError("Error reading the file.");
      setParsing(false);
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (parsedLeads.length === 0 || !onAction) return;
    onAction({
      type: "create_lead_file",
      payload: {
        file_name: fileName || "Chat_Leads.csv",
        leads: parsedLeads
      }
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-[#070707] p-5 shadow-xl max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet className="text-cyan-400" size={20} />
        <h4 className="text-sm font-semibold text-zinc-100">Upload Leads Pipeline</h4>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4">
        <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Requirements:</h5>
        <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
          <li>Supported formats: <code className="text-cyan-300">.csv</code></li>
          <li>Mandatory columns: <code className="text-white">Company Name</code> and <code className="text-white">Email</code></li>
          <li>Optional: Name, Website, Location, Target Role</li>
        </ul>
      </div>

      {!fileName ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-xl py-6 transition cursor-pointer text-zinc-400 hover:text-white"
        >
          <Upload size={24} className="mb-2 text-cyan-400" />
          <span className="text-xs font-medium">Click to browse lead files</span>
        </button>
      ) : (
        <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet size={16} className="text-zinc-500 shrink-0" />
            <span className="text-xs text-zinc-300 truncate font-mono">{fileName}</span>
          </div>
          <button 
            onClick={() => { setFileName(""); setParsedLeads([]); setError(""); }}
            className="text-[10px] text-zinc-500 hover:text-white font-medium"
          >
            Clear
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {parsing && (
        <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
          <Loader2 className="animate-spin text-cyan-400" size={14} />
          Parsing prospect file...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 mt-3 bg-red-950/20 border border-red-900/30 p-3 rounded-xl">
          <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={14} />
          <span className="text-xs text-red-300 font-medium">{error}</span>
        </div>
      )}

      {parsedLeads.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-emerald-400 font-semibold mb-3 flex items-center gap-1">
            <Check size={14} /> Verified {parsedLeads.length} prospects ready!
          </p>
          <button
            onClick={handleSubmit}
            className="w-full bg-cyan-400 hover:bg-cyan-300 text-black py-2.5 rounded-xl text-xs font-bold transition"
          >
            Import to OutreachX Leads
          </button>
        </div>
      )}
    </div>
  );
}

// 4. Asset Uploader Widget
function AssetUploaderWidget({ payload, onAction }: any) {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAction) return;

    setFileName(file.name);
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const base64 = event.target?.result as string;
        onAction({
          type: "upload_asset",
          payload: {
            name: file.name,
            file_data: base64.split(",")[1],
            file_type: file.type || "application/pdf"
          }
        });
        setSuccess(true);
      } catch (err) {
        console.error(err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-[#070707] p-5 shadow-xl max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="text-indigo-400" size={20} />
        <h4 className="text-sm font-semibold text-zinc-100">Upload Outreach Asset</h4>
      </div>
      
      <p className="text-xs text-zinc-400 mb-4">
        Add your Resume, CV, or Portfolio document to Deva's long-term retrieval memory.
      </p>

      {!fileName ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-xl py-6 transition cursor-pointer text-zinc-400 hover:text-white"
        >
          <Upload size={24} className="mb-2 text-indigo-400" />
          <span className="text-xs font-medium">Browse PDF, Word, or Text doc</span>
        </button>
      ) : (
        <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-zinc-500 shrink-0" />
            <span className="text-xs text-zinc-300 truncate font-mono">{fileName}</span>
          </div>
          {success && <Check size={16} className="text-emerald-400 shrink-0" />}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {uploading && (
        <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
          <Loader2 className="animate-spin text-indigo-400" size={14} />
          Uploading & indexing asset...
        </div>
      )}
    </div>
  );
}

// 5. Link Submission Widget
function LinkSubmissionWidget({ payload, onAction }: any) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !onAction) return;

    setSubmitting(true);
    try {
      onAction({
        type: "submit_link",
        payload: { url: url.trim() }
      });
      setUrl("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-[#070707] p-5 shadow-xl max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <Link className="text-emerald-400" size={20} />
        <h4 className="text-sm font-semibold text-zinc-100">Submit Knowledge Link</h4>
      </div>

      <p className="text-xs text-zinc-400 mb-4">
        Paste a LinkedIn Profile, GitHub Repo, or website URL for Deva to crawl and absorb.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/..."
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors text-zinc-200 placeholder:text-zinc-600"
        />
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
        >
          {submitting ? <Loader2 className="animate-spin" size={14} /> : "Submit"}
        </button>
      </form>
    </div>
  );
}
