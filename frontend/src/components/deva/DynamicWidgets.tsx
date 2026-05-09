import React, { useState } from "react";
import { Check, Copy, Code, Save, Play } from "lucide-react";

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
  
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl mt-4">
      <p className="text-sm text-zinc-400">Unsupported widget type: {type}</p>
    </div>
  );
}

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
