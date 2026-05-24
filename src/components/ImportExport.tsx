import React, { useState } from 'react';
import { Workflow, WorkflowNode, NodeLink, WorkflowVersion } from '../types';
import { 
  History, 
  Save, 
  RotateCcw, 
  FileText, 
  FileJson, 
  Copy, 
  Check, 
  BookOpen,
  X,
  AlertTriangle
} from 'lucide-react';

interface ImportExportProps {
  workflow: Workflow;
  nodes: WorkflowNode[];
  links: NodeLink[];
  versions: WorkflowVersion[];
  onSaveVersion: (versionName: string) => void;
  onRestoreVersion: (version: WorkflowVersion) => void;
}

export default function ImportExport({
  workflow,
  nodes,
  links,
  versions,
  onSaveVersion,
  onRestoreVersion
}: ImportExportProps) {
  const [versionNameInput, setVersionNameInput] = useState('');
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [showRestoreWarning, setShowRestoreWarning] = useState<string | null>(null);

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionNameInput.trim()) return;
    onSaveVersion(versionNameInput.trim());
    setVersionNameInput('');
  };

  // Compile nodes layout and links structure into executable formatted Markdown
  const generateMarkdownString = (): string => {
    let md = `# Workflow Blueprint: ${workflow.title}\n\n`;
    md += `> **Goal / Mission**: ${workflow.description}\n`;
    md += `> **Category**: ${workflow.category} | **Status**: ${workflow.status}\n\n`;
    
    md += `## 📊 Architectural Metadata\n`;
    md += `- **Nodes Compiled**: ${nodes.length}\n`;
    md += `- **Connection Links**: ${links.length}\n`;
    const trustedCount = nodes.filter(n => n.status === 'trusted').length;
    md += `- **Trust Index Ratio**: ${nodes.length > 0 ? Math.round((trustedCount / nodes.length) * 100) : 0}% Trusted Resources\n\n`;

    md += `## 🛠️ Mapped Components & Resources\n\n`;

    // Categorize nodes by type
    const steps = nodes.filter(n => n.type === 'step');
    const tools = nodes.filter(n => n.type === 'tool');
    const others = nodes.filter(n => n.type !== 'step' && n.type !== 'tool');

    if (steps.length > 0) {
      md += `### 🏃 Execution Steps\n`;
      steps.forEach((st, idx) => {
        md += `#### ${idx + 1}. ${st.title} [${st.status.toUpperCase()}]\n`;
        md += `- **Content**: ${st.content}\n`;
        if (st.confidenceScore > 0) md += `- **Confidence Level**: ${st.confidenceScore}%\n`;
        if (st.rating > 0) md += `- **Quality Star Rating**: ${'★'.repeat(st.rating)}${'☆'.repeat(5 - st.rating)}\n`;
        if (st.sourceUrl) md += `- **Citation Source**: [${st.sourceTitle || 'Web Link'}](${st.sourceUrl})\n`;
        md += `\n`;
      });
    }

    if (tools.length > 0) {
      md += `### 🔧 Configured SDKs & Tools\n`;
      tools.forEach((tl) => {
        md += `#### • ${tl.title} (${tl.status})\n`;
        md += `- **Instructions**: ${tl.content}\n`;
        if (tl.sourceUrl) md += `- **Documentation Link**: [${tl.sourceTitle || 'Reference'}](${tl.sourceUrl})\n`;
        md += `\n`;
      });
    }

    if (others.length > 0) {
      md += `### 📑 References, Notes & Media\n`;
      others.forEach((o) => {
        md += `#### [${o.type.toUpperCase()}] ${o.title}\n`;
        md += `- **Snippet/Preview**: ${o.content}\n`;
        if (o.sourceUrl) md += `- **External Anchor**: [${o.sourceTitle || 'Sourcing Reference'}](${o.sourceUrl})\n`;
        md += `\n`;
      });
    }

    // List out topological mapping relationships
    if (links.length > 0) {
      md += `\n## 🔗 Topological Routes (Flow Mappings)\n`;
      links.forEach((l) => {
        const fromNode = nodes.find(n => n.id === l.fromNodeId);
        const toNode = nodes.find(n => n.id === l.toNodeId);
        if (fromNode && toNode) {
          const relation = l.label ? ` --[${l.label}]--> ` : ' ----> ';
          md += `- \`[${fromNode.type.toUpperCase()}] ${fromNode.title}\` ${relation} \`[${toNode.type.toUpperCase()}] ${toNode.title}\`\n`;
        }
      });
    }

    md += `\n\n---\n*Blueprint generated and compiled with **Workflow Brain** visual manager.*`;
    return md;
  };

  // Markdown copy utility
  const handleCopyMarkdown = () => {
    const md = generateMarkdownString();
    navigator.clipboard.writeText(md);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  // Trigger browser download files
  const handleDownloadFile = (type: 'markdown' | 'json') => {
    let contentStr = '';
    let mimeType = 'text/plain';
    let fileExtension = '';

    if (type === 'markdown') {
      contentStr = generateMarkdownString();
      mimeType = 'text/markdown;charset=utf-8;';
      fileExtension = 'md';
    } else {
      const exportPackage = {
        workflow,
        nodes,
        links
      };
      contentStr = JSON.stringify(exportPackage, null, 2);
      mimeType = 'application/json;charset=utf-8;';
      fileExtension = 'json';
    }

    const blob = new Blob([contentStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.setAttribute('download', `${workflow.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_blueprint.${fileExtension}`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  return (
    <div className="bg-white border-2 border-black rounded-lg p-5 space-y-6 shadow-[4px_4px_0px_#000]" id="snapshot-and-export-panel">
      
      {/* Visual Title Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3" id="panel-header">
        <h3 className="text-xs font-mono font-black tracking-widest text-black uppercase flex items-center gap-2">
          <History className="text-blue-600 w-5 h-5 animate-pulse" />
          Version History & Exporters
        </h3>
        <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase">Backup and portable state</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="panel-bisection">
        
        {/* Left Column: Local Applet Version History Snapshotting */}
        <div className="space-y-4" id="version-timeline-column">
          <div className="space-y-1" id="timeline-welcome">
            <h4 className="text-xs font-black text-black uppercase font-mono">Pin Snapshot Version</h4>
            <p className="text-[11px] text-slate-650 leading-relaxed font-medium">
              Commit a local snapshot of your canvas coordinates, ratings, and wiring. Restore older versions at any time without resetting history.
            </p>
          </div>

          <form onSubmit={handleCreateSnapshot} className="flex gap-2" id="save-snapshot-form">
            <input 
              type="text" 
              placeholder="e.g., v1.1 - Added Stripe paywall"
              value={versionNameInput}
              onChange={(e) => setVersionNameInput(e.target.value)}
              className="flex-1 bg-slate-50 border-2 border-black text-slate-800 text-xs rounded-lg px-2.5 py-2.5 focus:bg-white outline-none font-medium"
              id="snapshot-name-input"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border-2 border-black text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-[1px] transition-all"
              id="pin-snapshot-btn"
            >
              <Save className="w-3.5 h-3.5" />
              Pin
            </button>
          </form>

          {/* List of generated historical snapshots */}
          <div className="space-y-2 mt-3" id="timeline-list">
            <span className="text-[10px] font-mono text-slate-500 font-extrabold uppercase block">Historical Backups ({versions.length}):</span>
            
            <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1" id="versions-scroll-container">
              {versions.length > 0 ? (
                versions.map((v) => (
                  <div 
                    key={v.id}
                    className="p-3 bg-white border-2 border-black rounded-lg flex items-center justify-between text-xs transition-colors hover:bg-slate-50 shadow-[2px_2px_0px_#000]"
                    id={`version-row-${v.id}`}
                  >
                    <div>
                      <span className="font-extrabold text-black block">{v.versionName}</span>
                      <span className="text-[9px] font-mono text-slate-500 block font-bold leading-relaxed mt-0.5">
                        {new Date(v.createdAt).toLocaleDateString()} at {new Date(v.createdAt).toLocaleTimeString()} • {v.nodes.length} nodes
                      </span>
                    </div>

                    {showRestoreWarning === v.id ? (
                      <div className="flex gap-1.5 items-center" id={`warning-actions-area-${v.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            onRestoreVersion(v);
                            setShowRestoreWarning(null);
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white border border-black text-[9px] font-mono font-bold rounded cursor-pointer"
                          id={`confirm-restore-btn-${v.id}`}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRestoreWarning(null)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[9px] font-mono font-bold cursor-pointer"
                          id={`cancel-restore-btn-${v.id}`}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowRestoreWarning(v.id)}
                        className="py-1 px-2.5 bg-white hover:bg-slate-50 text-black border-2 border-black rounded-lg cursor-pointer flex items-center gap-1 transition-colors text-[10px] font-mono font-bold shadow-[1px_1px_0px_#000]"
                        id={`trigger-restore-btn-${v.id}`}
                      >
                        <RotateCcw className="w-3 h-3 text-blue-600" />
                        Restore
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center p-6 bg-slate-50 border-2 border-dashed border-black rounded-lg" id="empty-history-hud">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">No snapshots record found for this workspace.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Exporters (Markdown & JSON packages) */}
        <div className="space-y-4 border-t-2 md:border-t-0 md:border-l-2 border-black pt-4 md:pt-0 md:pl-6 flex flex-col justify-between" id="exporters-column">
          <div className="space-y-1" id="exporters-welcome">
            <h4 className="text-xs font-black text-black uppercase font-mono">Blueprint Compilation & Portability</h4>
            <p className="text-[11px] text-slate-650 leading-relaxed font-medium">
              Compiled export packages are fully compatible with any developer documentation suite. Copy read lists directly to your project’s markdown README or store backup state.
            </p>
          </div>

          <div className="space-y-2.5" id="exporters-buttons-area">
            
            {/* Compile to Markdown file */}
            <div className="flex gap-2" id="markdown-export-actions">
              <button
                type="button"
                onClick={() => handleDownloadFile('markdown')}
                className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black rounded-lg shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer"
                id="download-markdown-btn"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Download Markdown (.md)
              </button>

              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="px-3.5 py-1.5 hover:bg-slate-50 text-black bg-white border-2 border-black rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-[2px_2px_0px_#000]"
                title="Copy formatted Markdown list to clipboard"
                id="copy-markdown-btn"
              >
                {copiedStatus ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-600" />
                )}
              </button>
            </div>

            {/* Compile to JSON file */}
            <button
              type="button"
              onClick={() => handleDownloadFile('json')}
              className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black rounded-lg shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer"
              id="download-json-btn"
            >
              <FileJson className="w-4 h-4 text-purple-600" />
              Download Canvas JSON State (.json)
            </button>

          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border-2 border-dashed border-black flex items-start gap-2" id="exporter-hud">
            <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-650 font-mono font-medium leading-relaxed">
              Compiled wireflows include topological routes. This lets subsequent developers follow your logic sequentially relative to active ratings.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
