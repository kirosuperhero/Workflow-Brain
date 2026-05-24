import React, { useState } from 'react';
import { WorkflowNode, NodeLink, NodeType, NodeStatus, NodeReview, Tag } from '../types';
import { 
  X, 
  Sparkles, 
  Star, 
  Layers, 
  Trash2, 
  Link2, 
  Calendar, 
  User, 
  Plus, 
  Clipboard,
  ExternalLink,
  MessageSquarePlus,
  ArrowRight,
  Bookmark,
  FileText,
  Badge,
  TrendingUp,
  Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SidebarProps {
  node: WorkflowNode | null;
  allNodes: WorkflowNode[];
  links: NodeLink[];
  onUpdateNode: (node: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export default function Sidebar({
  node,
  allNodes,
  links,
  onUpdateNode,
  onDeleteNode,
  onClose
}: SidebarProps) {
  const selectedNode = node;
  const allLinks = links;
  
  // Local click selector stub
  const onSelectNode = (targetId: string | null) => {
    if (targetId === null) {
      onClose();
    }
  };
  // Navigation Tabs: edit vs citations reviews timeline
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'reviews'>('edit');

  // Input States for New Review Form
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewStatus, setReviewStatus] = useState<NodeStatus>('trusted');

  // Multi-tags input local state helper
  const [newTagInput, setNewTagInput] = useState('');

  // Delete node confirming state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Reset confirming state when selecting a different node
  React.useEffect(() => {
    setIsConfirmingDelete(false);
  }, [selectedNode?.id]);

  if (!selectedNode) {
    return (
      <div className="lg:col-span-4 bg-white border-2 border-black rounded-lg flex flex-col items-center justify-center text-center p-6 text-slate-500 font-sans h-full min-h-[350px] shadow-[4px_4px_0px_#000]" id="sidebar-empty">
        <Info className="w-10 h-10 text-blue-600 mb-3 animate-pulse" />
        <h3 className="text-sm font-bold text-slate-800">No element selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs font-medium leading-relaxed">
          Click on any flowchart node card, or tap the <span className="font-bold underline">Inspect (Layers)</span> drawer icon on a node to load properties, edit markdown notes, assign connections, and view source review citations.
        </p>
      </div>
    );
  }

  // Find all related node linkages (incoming or outgoing)
  const incomingLinks = allLinks.filter(l => l.toNodeId === selectedNode.id);
  const outgoingLinks = allLinks.filter(l => l.fromNodeId === selectedNode.id);

  const relatedNodes = [
    ...incomingLinks.map(l => {
      const parent = allNodes.find(n => n.id === l.fromNodeId);
      return { node: parent, direction: 'incoming' as const, linkId: l.id };
    }),
    ...outgoingLinks.map(l => {
      const child = allNodes.find(n => n.id === l.toNodeId);
      return { node: child, direction: 'outgoing' as const, linkId: l.id };
    })
  ].filter(item => item.node !== undefined) as Array<{ node: WorkflowNode; direction: 'incoming' | 'outgoing'; linkId: string }>;

  // Update properties on change
  const handleChange = (field: keyof WorkflowNode, value: any) => {
    onUpdateNode({
      ...selectedNode,
      [field]: value
    });
  };

  // Add tag tag handler
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().toLowerCase();
    if (!selectedNode.tags.includes(cleanTag)) {
      handleChange('tags', [...selectedNode.tags, cleanTag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleChange('tags', selectedNode.tags.filter(t => t !== tagToRemove));
  };

  // Preset Common domain tag suggestions
  const suggestionTags = ['npm', 'docker', 'stripe', 'api-endpoint', 'nextjs', 'spanner', 'auth', 'database', 'gemini'];

  // Submit dynamic review citation logic
  const handleAddReviewForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewComment.trim()) return;
    
    const newReview = {
      id: Math.random().toString(36).substr(2, 9),
      author: reviewAuthor.trim(),
      comment: reviewComment.trim(),
      rating: reviewRating,
      status: reviewStatus,
      timestamp: new Date().toISOString()
    };

    const currentReviews = selectedNode.reviews || [];
    onUpdateNode({
      ...selectedNode,
      status: reviewStatus,
      reviews: [...currentReviews, newReview]
    });

    // Restart states
    setReviewAuthor('');
    setReviewComment('');
    setReviewRating(5);
    setReviewStatus(selectedNode.status);
    setActiveTab('reviews'); // Flip to timeline to view result
  };

  return (
    <div className="lg:col-span-4 bg-white border-2 border-black rounded-lg flex flex-col overflow-hidden h-full shadow-[4px_4px_0px_#000]" id="sidebar-inspector-panel">
      
      {/* Sidebar navigation headers */}
      <div className="flex border-b-2 border-black bg-slate-50" id="sidebar-tabs">
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-3 text-xs font-mono font-black text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'edit' 
              ? 'text-blue-600 border-blue-600 bg-white' 
              : 'text-slate-500 border-transparent hover:text-black hover:bg-slate-100'
          }`}
          id="tab-edit-trigger"
        >
          Form Inspector
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 text-xs font-mono font-black text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'preview' 
              ? 'text-blue-600 border-blue-600 bg-white' 
              : 'text-slate-500 border-transparent hover:text-black hover:bg-slate-100'
          }`}
          id="tab-preview-trigger"
        >
          Markdown Preview
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 py-3 text-xs font-mono font-black text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'reviews' 
              ? 'text-blue-600 border-blue-600 bg-white' 
              : 'text-slate-500 border-transparent hover:text-black hover:bg-slate-100'
          }`}
          id="tab-citations-trigger"
        >
          Citations ({selectedNode.reviews?.length || 0})
        </button>
      </div>

      {/* Editor Main Segment Scroller */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5" id="sidebar-scroller-view">
        
        {/* TAB 1: FORM EDIT PROPERTIES */}
        {activeTab === 'edit' && (
          <div className="space-y-4 font-sans" id="form-edit-panel">
            
            {/* Title / Description info block */}
            <div className="flex items-start justify-between gap-1 border-b border-slate-100 pb-3" id="sidebar-essential-heading">
              <div>
                <span className="text-[9px] font-mono font-semibold text-slate-400 block uppercase">Selected Reference</span>
                <span className="text-xs font-bold text-blue-600 font-mono tracking-tight uppercase">TYPE: {selectedNode.type}</span>
              </div>
              <button 
                onClick={() => onSelectNode(null)}
                className="p-1 hover:bg-slate-100 hover:border-black border border-transparent rounded transition-all text-slate-500 hover:text-black shrink-0 cursor-pointer"
                id="close-sidebar-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title Form Field */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-650 mb-1">Title *</label>
              <input 
                type="text"
                value={selectedNode.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full bg-slate-50 border-2 border-black text-slate-905 font-bold text-xs rounded-lg px-3 py-2.5 focus:bg-white outline-none"
                placeholder="e.g., Stripe SDK initialization"
                id="node-title-input"
              />
            </div>

            {/* Type Form field */}
            <div className="grid grid-cols-2 gap-3" id="properties-grid-split">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-650 mb-1">Type</label>
                <select
                  value={selectedNode.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black text-slate-905 font-bold text-xs rounded-lg px-2.5 py-2.5 cursor-pointer outline-none"
                  id="node-type-input"
                >
                  <option value="step">Step</option>
                  <option value="tool">Tool</option>
                  <option value="link">Link</option>
                  <option value="note">Note</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>

              {/* Status Form Field */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-650 mb-1">Status</label>
                <select
                  value={selectedNode.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black text-slate-905 font-bold text-xs rounded-lg px-2.5 py-2.5 cursor-pointer outline-none"
                  id="node-status-input"
                >
                  <option value="trusted">Trusted Verified</option>
                  <option value="experimental">Experimental</option>
                  <option value="archived">Archived / Legacy</option>
                </select>
              </div>
            </div>

            {/* Confidence metric indicator and Star Rating */}
            <div className="grid grid-cols-2 gap-3" id="rating-split-grid">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-650 mb-1">Confidence ({selectedNode.confidenceScore}%)</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5"
                  value={selectedNode.confidenceScore}
                  onChange={(e) => handleChange('confidenceScore', parseInt(e.target.value))}
                  className="w-full cursor-col-resize accent-blue-600 my-2"
                  id="node-confidence-slider"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-650 mb-1">Utility Rating</label>
                <div className="flex items-center gap-1.5 mt-1" id="interactive-star-rank">
                  {[1, 2, 3, 4, 5].map((starIdx) => (
                    <button
                      key={starIdx}
                      type="button"
                      onClick={() => handleChange('rating', starIdx)}
                      className="p-0.5 hover:scale-125 transition-transform text-slate-300 hover:text-amber-400 cursor-pointer"
                      id={`star-${starIdx}`}
                    >
                      <Star className={`w-4 h-4 ${starIdx <= selectedNode.rating ? 'text-amber-500 fill-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Markdown / content form description */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-650 mb-1">
                Markdown Notepad & Details
              </label>
              <textarea 
                rows={5}
                value={selectedNode.content}
                onChange={(e) => handleChange('content', e.target.value)}
                className="w-full bg-slate-50 border-2 border-black text-slate-905 font-medium text-xs rounded-lg px-3 py-2.5 focus:bg-white outline-none resize-none font-mono"
                placeholder="Write tutorials, code snippets, documentation reviews, commands, or details. Markdown syntax is compiled live in the preview tab."
                id="node-content-textarea"
              />
            </div>

            {/* Citation Source anchors */}
            <div className="space-y-2 border-t border-slate-100 pt-3" id="citation-source-inputs">
              <span className="text-[10px] font-mono font-bold block uppercase text-slate-600 mb-2">Primary Reference citation</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono text-slate-500 uppercase">Citation Title</label>
                  <input 
                    type="text"
                    value={selectedNode.sourceTitle || ''}
                    onChange={(e) => handleChange('sourceTitle', e.target.value)}
                    className="w-full bg-slate-50 border-2 border-black text-slate-905 font-bold text-xs rounded-lg px-2 py-2 focus:bg-white outline-none"
                    placeholder="e.g., Google Spanner Official Docs"
                    id="node-source-title"
                  />
                </div>
                
                <div>
                  <label className="block text-[9px] font-mono text-slate-500 uppercase">External Source URL</label>
                  <input 
                    type="url"
                    value={selectedNode.sourceUrl || ''}
                    onChange={(e) => handleChange('sourceUrl', e.target.value)}
                    className="w-full bg-slate-50 border-2 border-black text-slate-905 font-bold text-xs rounded-lg px-2 py-2 focus:bg-white outline-none"
                    placeholder="e.g., https://cloud.google.com/..."
                    id="node-source-url"
                  />
                </div>
              </div>
            </div>

            {/* Connected node relationships display */}
            <div className="border-t border-slate-100 pt-3 space-y-2 select-none" id="node-relationships-segment">
              <span className="text-[10px] font-mono font-bold block uppercase text-slate-600">Connected Flow Relationships ({relatedNodes.length})</span>
              {relatedNodes.length > 0 ? (
                <div className="space-y-2 mt-2" id="node-links-scroller">
                  {relatedNodes.map((rel) => (
                    <div 
                      key={rel.linkId}
                      className="px-3 py-2 bg-white border-2 border-black rounded-lg text-slate-800 mt-2 block shadow-[2px_2px_0px_#000]"
                      id={`inspect-rel-${rel.linkId}`}
                    >
                      <div className="flex items-center gap-2" id={`link-nodes-details-${rel.linkId}`}>
                        <span className="font-mono text-[9px] uppercase bg-slate-100 border border-slate-300 px-1 py-0.5 tracking-tight rounded font-extrabold text-slate-600">
                          {rel.direction}
                        </span>
                        <div id="rel-node-title-group">
                          <button
                            type="button"
                            onClick={() => onSelectNode(rel.node.id)}
                            className="text-xs font-bold text-black hover:text-blue-650 hover:underline block text-left animate-pulse"
                          >
                            {rel.node.title || 'Untitled Node'}
                          </button>
                          <span className="text-[10px] font-mono text-slate-500 capitalize">{rel.node.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-650 font-mono italic p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                  Isolated card. Connect it securely by dragging the left/right anchor dots of different flowchart cards to wire them together.
                </p>
              )}
            </div>

            {/* Node Delete permanently control area */}
            <div className="pt-3 border-t-2 border-black flex flex-col gap-2" id="danger-card-actions">
              {!isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 border-2 border-black text-red-650 font-black text-xs rounded-lg cursor-pointer flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000] active:translate-y-[1px] transition-all"
                  id="delete-node-sidebar-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Node Permanently</span>
                </button>
              ) : (
                <div className="flex gap-2 animate-fade-in w-full">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteNode(selectedNode.id);
                      setIsConfirmingDelete(false);
                    }}
                    className="flex-1 py-1.5 bg-red-600 text-white hover:bg-red-700 font-extrabold text-xs rounded border-2 border-black cursor-pointer shadow-[1px_1px_0px_#000] text-center"
                    id="confirm-delete-node-btn"
                  >
                    Confirm Wipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border-2 border-black cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: LIVE MARKDOWN DOCUMENT RENDERING */}
        {activeTab === 'preview' && (
          <div className="space-y-4" id="markdown-preview-panel">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center" id="preview-notary-title">
              <div>
                <span className="text-[9px] font-mono font-semibold text-slate-400 block uppercase">Formatted Markdown</span>
                <h4 className="text-xs font-bold text-black font-mono leading-none">{selectedNode.title}</h4>
              </div>
              {selectedNode.sourceUrl && (
                <a 
                  href={selectedNode.sourceUrl} 
                  target="_blank" 
                  rel="referrer" 
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border-2 border-black rounded-lg text-slate-700 hover:text-black font-bold text-[10px] flex items-center gap-1 text-xs select-none shadow-[1px_1px_0px_#000]"
                  id="preview-external-anchor"
                >
                  Source Docs
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {selectedNode.content ? (
              <div className="p-4 bg-slate-50 rounded-lg border-2 border-black min-h-[150px] overflow-auto select-text block max-w-full prose prose-slate prose-sm text-xs" id="node-markdown-rendering">
                <ReactMarkdown>{selectedNode.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center p-8 bg-slate-50 rounded-lg border-2 border-dashed border-black" id="preview-empty">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-800">No content entered</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto font-medium leading-relaxed">
                  Go back to the properties edit form and type custom markdown text to compile details or copy commands.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CITATIONS, LOG REVIEWS AND TRUST AUDITS */}
        {activeTab === 'reviews' && (
          <div className="space-y-5" id="reviews-citations-panel">
            
            <div className="border-b border-slate-100 pb-2" id="reviews-citation-title">
              <span className="text-[9px] font-mono font-semibold text-slate-400 block uppercase">References / Audits</span>
              <h4 className="text-xs font-extrabold text-black uppercase font-mono mt-0.5 leading-none">Trust Citation Timeline</h4>
            </div>

            {/* Custom Review Form */}
            <form onSubmit={handleAddReviewForm} className="bg-slate-50 border-2 border-black rounded-lg p-3.5 space-y-3 shadow-[3px_3px_0px_#000]" id="add-review-citation-form">
              <span className="text-[10px] font-mono font-bold block uppercase text-blue-700">Add trust audit log / bookmark</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono text-slate-500 uppercase">Engineer Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., SoloCoder"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    className="w-full bg-white border-2 border-black text-slate-905 font-bold text-xs rounded px-2.5 py-1.5 focus:bg-white outline-none"
                    id="reviewer-author-input"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-500 uppercase">Certified Status</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as NodeStatus)}
                    className="w-full bg-white border-2 border-black text-slate-905 font-bold text-xs rounded px-2.5 py-1.5 cursor-pointer outline-none"
                    id="reviewer-status-select"
                  >
                    <option value="trusted">Trusted Verified</option>
                    <option value="experimental">Experimental</option>
                    <option value="archived">Archived / Legacy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase">Audit Assessment Notes *</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Summarize validation results: benchmark metrics, sandbox trials, code comments etc..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-white border-2 border-black text-slate-905 font-medium text-xs rounded px-2.5 py-1.5 focus:bg-white outline-none resize-none"
                  id="reviewer-notes-input"
                />
              </div>

              <div className="flex justify-between items-center pt-1" id="review-submission-controls">
                <div className="flex items-center gap-1" id="reviewer-rating-select">
                  <span className="text-[9px] font-mono text-slate-500 uppercase pr-1">Utility:</span>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReviewRating(idx)}
                      className="p-0.5"
                    >
                      <Star className={`w-3.5 h-3.5 ${idx <= reviewRating ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded border-2 border-black text-[10px] font-mono font-bold tracking-tight uppercase cursor-pointer shadow-[1px_1px_0px_#000]"
                  id="reviewer-submit-btn"
                >
                  File Certified Audit Log
                </button>
              </div>
            </form>

            {/* Display list of review timelines */}
            <div className="space-y-3" id="citation-reviews-list">
              <span className="text-[10px] font-mono font-extrabold block text-slate-500 uppercase tracking-widest pl-0.5">Audit history log pipeline</span>
              
              {selectedNode.reviews && selectedNode.reviews.length > 0 ? (
                selectedNode.reviews.slice().reverse().map((review) => (
                  <div 
                    key={review.id}
                    className="bg-white border-2 border-black p-3.5 rounded-lg space-y-1 shadow-[2px_2px_0px_#000]"
                    id={`timeline-review-${review.id}`}
                  >
                    <div className="flex justify-between items-start text-[10px]" id={`reviewer-badge-head-${review.id}`}>
                      <div className="flex items-center gap-1.5" id={`review-reviewer-badge-${review.id}`}>
                        <div className="w-5 h-5 rounded-full bg-blue-50 border-2 border-black flex items-center justify-center text-blue-600 text-[9px] font-mono font-black shadow-[1px_1px_0px_#000]">
                          {review.author.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-black font-extrabold pr-1">{review.author}</span>
                      </div>
                      
                      <div className="flex items-center gap-1" id={`reviewer-pills-${review.id}`}>
                        <span className="font-mono text-[9px] text-slate-500 font-semibold">{new Date(review.timestamp || '').toLocaleDateString()}</span>
                        <span className={`status-badge text-[8px] ${
                          review.status === 'trusted' ? 'text-emerald-700 bg-emerald-50 border-emerald-500' : 'text-blue-700 bg-blue-50 border-blue-500'
                        }`}>
                          {review.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-700 font-medium leading-relaxed font-sans pt-1 select-text">
                      "{review.comment}"
                    </p>

                    <div className="flex items-center gap-0.5 pt-1.5" id={`review-rating-banner-${review.id}`}>
                      {[1, 2, 3, 4, 5].map((idx) => (
                        <Star key={idx} className={`w-3 h-3 ${idx <= review.rating ? 'text-amber-500 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-6 border-2 border-dashed border-black rounded-lg bg-slate-50 font-mono" id="citations-timeline-empty">
                  <Bookmark className="w-5 h-5 text-slate-400 mx-auto mb-1 flex shrink-0 animate-pulse" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase">No Audit History Registered</p>
                  <p className="text-[10px] text-slate-405 leading-relaxed font-medium mt-1">
                    Fill the form at the top to record execution metrics, notes of experimental features, or validation audits inside the workflow node chronology logs.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
