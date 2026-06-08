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
  workflows?: Workflow[];
  onSaveVersion: (versionName: string) => void;
  onRestoreVersion: (version: WorkflowVersion) => void;
  onDeleteVersion?: (versionId: string) => void;
  onUpdateVersionName?: (versionId: string, newName: string) => void;
}

export default function ImportExport({
  workflow,
  nodes,
  links,
  versions,
  workflows,
  onSaveVersion,
  onRestoreVersion,
  onDeleteVersion,
  onUpdateVersionName
}: ImportExportProps) {
  const [versionNameInput, setVersionNameInput] = useState('');
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [showRestoreWarning, setShowRestoreWarning] = useState<string | null>(null);

  // States for Editing/Deleting Backups and Filtering
  const [backupFilter, setBackupFilter] = useState<'current' | 'all'>('current');
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionName, setEditingVersionName] = useState('');
  const [confirmDeleteVersionId, setConfirmDeleteVersionId] = useState<string | null>(null);

  const getWorkflowTitle = (wfId: string): string => {
    if (wfId === workflow.id) return workflow.title;
    const found = workflows?.find(w => w.id === wfId);
    return found ? found.title : 'Unknown Card';
  };

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
          <div className="space-y-3.5 mt-3" id="timeline-list">
            
            {/* Scoped Filter */}
            <div className="flex bg-slate-100 p-1 border-2 border-black rounded-lg gap-1" id="backup-scope-selector">
              <button
                type="button"
                onClick={() => setBackupFilter('current')}
                className={`flex-1 py-1 px-2 text-[10px] md:text-xs font-mono font-black text-center rounded-md transition-all cursor-pointer ${
                  backupFilter === 'current' 
                    ? 'bg-blue-600 text-white shadow-[1px_1px_0px_rgba(0,0,0,1)]' 
                    : 'text-slate-600 hover:text-black hover:bg-slate-200'
                }`}
              >
                📁 This Card ({versions.filter(v => v.workflowId === workflow.id).length})
              </button>
              <button
                type="button"
                onClick={() => setBackupFilter('all')}
                className={`flex-1 py-1 px-2 text-[10px] md:text-xs font-mono font-black text-center rounded-md transition-all cursor-pointer ${
                  backupFilter === 'all' 
                    ? 'bg-blue-600 text-white shadow-[1px_1px_0px_rgba(0,0,0,1)]' 
                    : 'text-slate-600 hover:text-black hover:bg-slate-200'
                }`}
              >
                🌐 All Cards ({versions.length})
              </button>
            </div>

            <div className="flex justify-between items-center" id="backups-header-counts">
              <span className="text-[10px] font-mono text-slate-500 font-extrabold uppercase block font-mono">
                Historical Backups ({backupFilter === 'current' ? versions.filter(v => v.workflowId === workflow.id).length : versions.length}):
              </span>
            </div>
            
            <div className="max-h-[250px] overflow-y-auto space-y-2.5 pr-1" id="versions-scroll-container">
              {(backupFilter === 'current' ? versions.filter(v => v.workflowId === workflow.id) : versions).length > 0 ? (
                (backupFilter === 'current' ? versions.filter(v => v.workflowId === workflow.id) : versions).map((v) => {
                  const isEditing = editingVersionId === v.id;
                  const isConfirmDelete = confirmDeleteVersionId === v.id;

                  return (
                    <div 
                      key={v.id}
                      className="p-3 bg-white border-2 border-black rounded-lg flex flex-col gap-2.5 text-xs transition-colors hover:bg-indigo-50/15 shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] hover:-translate-y-[0.5px] transition-transform"
                      id={`version-row-${v.id}`}
                    >
                      {isEditing ? (
                        <div className="space-y-2 w-full" id={`edit-version-form-${v.id}`}>
                          <div>
                            <label className="block text-[8px] font-mono uppercase text-slate-500 font-bold mb-0.5">Rename Backup Name</label>
                            <input 
                              type="text"
                              value={editingVersionName}
                              onChange={(e) => setEditingVersionName(e.target.value)}
                              className="w-full bg-white border-2 border-black font-extrabold text-xs px-2 py-1 rounded outline-none focus:bg-slate-50"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingVersionId(null)}
                              className="px-2 py-0.5 border border-black text-[9px] font-mono rounded bg-slate-50 hover:bg-slate-100 cursor-pointer"
                            >
                              CANCEL
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingVersionName.trim() && onUpdateVersionName) {
                                  onUpdateVersionName(v.id, editingVersionName.trim());
                                }
                                setEditingVersionId(null);
                              }}
                              className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[9px] font-bold rounded border border-black cursor-pointer"
                            >
                              SAVE
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 flex-1">
                          {/* Heading representing version label name */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold text-slate-900 break-words leading-tight">
                              {v.versionName}
                            </span>
                          </div>

                          {/* Sub-label representing Card Title and timestamp metadata */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-slate-500 font-bold leading-relaxed">
                            <span 
                              className="px-1.5 py-0.5 bg-indigo-50 border-2 border-indigo-200 text-indigo-950 rounded font-black max-w-[130px] truncate animate-fade-in" 
                              title={getWorkflowTitle(v.workflowId)}
                            >
                              📁 {getWorkflowTitle(v.workflowId)}
                            </span>
                            <span>•</span>
                            <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{v.nodes.length} nodes</span>
                          </div>
                        </div>
                      )}

                      {/* Version Action buttons */}
                      {!isEditing && (
                        <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 select-none animate-fade-in" id={`version-actions-bar-${v.id}`}>
                          
                          {/* Left action button: Restore snapshot */}
                          {showRestoreWarning === v.id ? (
                            <div className="flex gap-1 items-center border-2 border-amber-300 bg-amber-50 px-1.5 py-0.5 rounded font-mono text-[8.5px] font-bold animate-fade-in" id={`warning-actions-area-${v.id}`}>
                              <span className="text-amber-800 pr-0.5">Restore version?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onRestoreVersion(v);
                                  setShowRestoreWarning(null);
                                }}
                                className="text-amber-900 border border-amber-400 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded shadow-[0.5px_0.5px_0px_#000] cursor-pointer"
                                id={`confirm-restore-btn-${v.id}`}
                              >
                                YES
                              </button>
                              <span className="text-amber-300">/</span>
                              <button
                                type="button"
                                onClick={() => setShowRestoreWarning(null)}
                                className="text-slate-600 hover:text-black underline cursor-pointer"
                                id={`cancel-restore-btn-${v.id}`}
                              >
                                NO
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowRestoreWarning(v.id)}
                              className="py-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-black border-2 border-black rounded-md cursor-pointer flex items-center gap-1 transition-all text-[9.5px] font-mono font-bold shadow-[1px_1px_0px_#000] active:translate-y-[0.5px]"
                              id={`trigger-restore-btn-${v.id}`}
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-blue-600" />
                              Restore
                            </button>
                          )}

                          {/* Right action controls: Rename edit & Delete */}
                          <div className="flex items-center gap-2" id={`ctrls-delete-edit-${v.id}`}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVersionId(v.id);
                                setEditingVersionName(v.versionName);
                              }}
                              className="font-mono text-[10px] font-extrabold text-slate-500 hover:text-blue-650 hover:underline cursor-pointer"
                              title="Rename backup"
                            >
                              ✏️ Edit
                            </button>

                            {isConfirmDelete ? (
                              <div className="flex items-center gap-1 border-2 border-red-200 bg-red-50 px-1.5 py-0.5 rounded font-mono text-[8.5px] font-bold animate-fade-in" id={`prompt-del-confirm-${v.id}`}>
                                <span className="text-red-700">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onDeleteVersion) onDeleteVersion(v.id);
                                    setConfirmDeleteVersionId(null);
                                  }}
                                  className="text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 px-1 py-0.5 rounded hover:text-red-950 underline hover:font-black cursor-pointer"
                                >
                                  YES
                                </button>
                                <span className="text-slate-350">/</span>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteVersionId(null)}
                                  className="text-slate-500 hover:text-black hover:underline cursor-pointer"
                                >
                                  NO
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteVersionId(v.id)}
                                className="font-mono text-[10px] font-extrabold text-slate-500 hover:text-red-650 hover:underline cursor-pointer"
                                title="Remove backup permanently"
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })
              ) : (
                <div className="text-center p-6 bg-slate-50 border-2 border-dashed border-black rounded-lg" id="empty-history-hud">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block font-mono">No snapshots record found for this workspace.</span>
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
