import React, { useState } from 'react';
import { WorkflowNode, NodeLink, NodeType, NodeStatus, NodeReview, Tag, QueueResource, ResourceLinkToNode } from '../types';
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
  Info,
  FolderPlus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SidebarProps {
  node: WorkflowNode | null;
  allNodes: WorkflowNode[];
  globalNodes?: WorkflowNode[];
  links: NodeLink[];
  onUpdateNode: (node: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
  queueLinks?: ResourceLinkToNode[];
  queueResources?: QueueResource[];
  onAddNode?: (node: Omit<WorkflowNode, 'id' | 'createdAt' | 'updatedAt'>) => string;
  onAddLink?: (fromNodeId: string, toNodeId: string) => void;
  workflows?: any[];
  onDuplicateNodeToWorkflow?: (nodeId: string, targetWorkflowId: string) => void;
  onRemoveTagGlobally?: (tag: string) => void;
}

export default function Sidebar({
  node,
  allNodes,
  globalNodes = [],
  links,
  onUpdateNode,
  onDeleteNode,
  onClose,
  queueLinks = [],
  queueResources = [],
  onAddNode,
  onAddLink,
  workflows = [],
  onDuplicateNodeToWorkflow,
  onRemoveTagGlobally
}: SidebarProps) {
  const selectedNode = node ? {
    ...node,
    tags: (node.tags || []).filter(t => !['free', 'daily credits', 'monthly credits'].includes(t.trim().toLowerCase()))
  } : null;
  const allLinks = links;
  
  const matchingQueueLink = selectedNode ? queueLinks.find(l => l.nodeId === selectedNode.id) : null;
  const matchingQueueResource = matchingQueueLink ? queueResources.find(r => r.id === matchingQueueLink.resourceId) : null;
  
  // Local click selector stub
  const onSelectNode = (targetId: string | null) => {
    if (targetId === null) {
      onClose();
    }
  };
  // Navigation Tabs: edit vs citations reviews timeline
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'reviews' | 'prompts'>('edit');

  // Input States for New Review Form
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewStatus, setReviewStatus] = useState<NodeStatus>('trusted');

  // Inline review editing states
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingReviewAuthor, setEditingReviewAuthor] = useState('');
  const [editingReviewComment, setEditingReviewComment] = useState('');
  const [editingReviewRating, setEditingReviewRating] = useState(5);
  const [editingReviewStatus, setEditingReviewStatus] = useState<NodeStatus>('trusted');
  const [confirmingDeleteReviewId, setConfirmingDeleteReviewId] = useState<string | null>(null);

  // Multi-tags input local state helper
  const [newTagInput, setNewTagInput] = useState('');

  // Inline tag editing states
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState<string>('');

  // State for confirming global tag deletion to prevent iframe alert/confirm issues
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);

  // Delete node confirming state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Workspace transition state
  const [confirmMoveToWorkflowId, setConfirmMoveToWorkflowId] = useState<string | null>(null);

  // Auto suggestions visibility state
  const [showTitleAutoSuggest, setShowTitleAutoSuggest] = useState(false);
  const [showUrlAutoSuggest, setShowUrlAutoSuggest] = useState(false);

  // Prompt Saver local states
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptTitle, setEditingPromptTitle] = useState('');
  const [editingPromptText, setEditingPromptText] = useState('');
  const [confirmingDeletePromptId, setConfirmingDeletePromptId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Reset confirming state when selecting a different node
  React.useEffect(() => {
    setIsConfirmingDelete(false);
    setConfirmMoveToWorkflowId(null);
    setEditingTagIndex(null);
    setEditingTagValue('');
    setConfirmDeleteTag(null);
    setEditingReviewId(null);
    setEditingReviewAuthor('');
    setEditingReviewComment('');
    setConfirmingDeleteReviewId(null);
    // Clear prompt state on change
    setNewPromptTitle('');
    setNewPromptText('');
    setEditingPromptId(null);
    setEditingPromptTitle('');
    setEditingPromptText('');
    setConfirmingDeletePromptId(null);
    setCopiedPromptId(null);
  }, [selectedNode?.id]);

  // Autocomplete suggestions calculation
  const typedTitle = selectedNode ? (selectedNode.title || '').trim().toLowerCase() : '';
  const titleSuggestions = selectedNode && globalNodes
    ? Array.from(new Set(
        globalNodes
          .map(n => n.title)
          .filter(t => t && t.trim() && t.toLowerCase() !== (selectedNode.title || '').trim().toLowerCase())
      )).filter(t => t.toLowerCase().includes(typedTitle)).slice(0, 5)
    : [];

  const typedUrl = selectedNode ? (selectedNode.sourceUrl || '').trim().toLowerCase() : '';
  const urlSuggestions = (() => {
    if (!selectedNode) return [];
    const urlMap = new Map<string, { url: string; title: string }>();
    globalNodes.forEach(n => {
      if (n.sourceUrl && n.sourceUrl.trim()) {
        urlMap.set(n.sourceUrl.trim(), { url: n.sourceUrl.trim(), title: n.sourceTitle || n.title || '' });
      }
    });
    queueResources.forEach(r => {
      if (r.url && r.url.trim()) {
        urlMap.set(r.url.trim(), { url: r.url.trim(), title: r.title || '' });
      }
    });
    const allSuggestedUrls = Array.from(urlMap.values());
    return allSuggestedUrls.filter(item => 
      item.url.toLowerCase().includes(typedUrl) && 
      item.url.toLowerCase() !== (selectedNode.sourceUrl || '').trim().toLowerCase()
    ).slice(0, 5);
  })();

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

  // Upgraded Add tag handler allowing multiple comma/semicolon/slash separated tags
  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTagInput.trim()) return;
    
    const separators = /[,;/]+/;
    const rawTokens = newTagInput.split(separators);
    const updatedTags = [...(selectedNode.tags || [])];
    
    rawTokens.forEach(token => {
      const clean = token.trim().toLowerCase();
      if (clean && !updatedTags.includes(clean)) {
        updatedTags.push(clean);
      }
    });
    
    handleChange('tags', updatedTags);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleChange('tags', (selectedNode.tags || []).filter(t => t !== tagToRemove));
  };

  // Inline tag editing functions
  const startEditingTag = (index: number, value: string) => {
    setEditingTagIndex(index);
    setEditingTagValue(value);
  };

  const saveEditedTag = (index: number) => {
    if (editingTagIndex === null) return;
    const cleanValue = editingTagValue.trim().toLowerCase();
    
    const updatedTags = [...(selectedNode.tags || [])];
    if (!cleanValue) {
      // If cleared, just remove the tag
      updatedTags.splice(index, 1);
    } else {
      // Check if it already exists elsewhere to avoid duplicates
      const dupIdx = updatedTags.findIndex((t, i) => t === cleanValue && i !== index);
      if (dupIdx !== -1) {
        // If it's a duplicate, just remove current slot
        updatedTags.splice(index, 1);
      } else {
        updatedTags[index] = cleanValue;
      }
    }
    handleChange('tags', updatedTags);
    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  // Get unique tags from all nodes across the workspace to make it easy to reuse or purge
  const allWorkspaceUniqueTags = (() => {
    if (!globalNodes) return [];
    const allUnique = new Set<string>();
    const excludedTags = ['free', 'daily credits', 'monthly credits'];
    globalNodes.forEach(n => {
      if (n.tags && Array.isArray(n.tags)) {
        n.tags.forEach(t => {
          if (t && t.trim() && !excludedTags.includes(t.trim().toLowerCase())) {
            allUnique.add(t.trim().toLowerCase());
          }
        });
      }
    });
    return Array.from(allUnique).sort();
  })();

  // Get unique tags from all nodes across the workspace that are not selected on the current card
  const workspaceUsedTags = (() => {
    const currentNodeTags = selectedNode?.tags || [];
    return allWorkspaceUniqueTags.filter(t => !currentNodeTags.includes(t));
  })();

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

  const handleStartEditReview = (review: any) => {
    setEditingReviewId(review.id);
    setEditingReviewAuthor(review.author);
    setEditingReviewComment(review.comment);
    setEditingReviewRating(review.rating);
    setEditingReviewStatus(review.status);
  };

  const handleSaveEditReview = (reviewId: string) => {
    if (!editingReviewAuthor.trim() || !editingReviewComment.trim()) return;
    const updatedReviews = (selectedNode.reviews || []).map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          author: editingReviewAuthor.trim(),
          comment: editingReviewComment.trim(),
          rating: editingReviewRating,
          status: editingReviewStatus
        };
      }
      return r;
    });

    onUpdateNode({
      ...selectedNode,
      reviews: updatedReviews
    });
    setEditingReviewId(null);
  };

  const handleDeleteReview = (reviewId: string) => {
    const updatedReviews = (selectedNode.reviews || []).filter(r => r.id !== reviewId);
    onUpdateNode({
      ...selectedNode,
      reviews: updatedReviews
    });
  };

  // Prompt Saver Handlers
  const handleAddPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPromptText.trim()) return;
    const titleVal = newPromptTitle.trim() || `Prompt #${(selectedNode.prompts?.length || 0) + 1}`;
    const newPrompt = {
      id: Math.random().toString(36).substring(2, 11),
      title: titleVal,
      text: newPromptText.trim(),
      createdAt: new Date().toISOString()
    };
    const updatedPrompts = [...(selectedNode.prompts || []), newPrompt];
    handleChange('prompts', updatedPrompts);
    setNewPromptTitle('');
    setNewPromptText('');
  };

  const handleStartEditPrompt = (prompt: any) => {
    setEditingPromptId(prompt.id);
    setEditingPromptTitle(prompt.title);
    setEditingPromptText(prompt.text);
  };

  const handleSaveEditPrompt = (promptId: string) => {
    if (!editingPromptText.trim()) return;
    const titleVal = editingPromptTitle.trim() || `Prompt`;
    const updatedPrompts = (selectedNode.prompts || []).map(p => {
      if (p.id === promptId) {
        return {
          ...p,
          title: titleVal,
          text: editingPromptText.trim()
        };
      }
      return p;
    });
    handleChange('prompts', updatedPrompts);
    setEditingPromptId(null);
  };

  const handleDeletePrompt = (promptId: string) => {
    const updatedPrompts = (selectedNode.prompts || []).filter(p => p.id !== promptId);
    handleChange('prompts', updatedPrompts);
  };

  const handleCopyPromptText = (promptId: string, text: string) => {
    try {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedPromptId(promptId);
        setTimeout(() => setCopiedPromptId(null), 1800);
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedPromptId(promptId);
        setTimeout(() => setCopiedPromptId(null), 1800);
      });
    } catch (err) {
      // safe fallback
    }
  };

  return (
    <div className="lg:col-span-4 bg-white border-2 border-black rounded-lg flex flex-col overflow-hidden h-full shadow-[4px_4px_0px_#000]" id="sidebar-inspector-panel">
      
      {/* Sidebar navigation headers */}
      <div className="flex border-b-2 border-black bg-slate-50 overflow-x-auto scroller-hidden" id="sidebar-tabs">
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 min-w-[70px] py-3 text-[10px] md:text-xs font-mono font-black text-center border-b-2 transition-all cursor-pointer whitespace-nowrap px-1 ${
            activeTab === 'edit' 
              ? 'text-blue-600 border-blue-600 bg-white' 
              : 'text-slate-500 border-transparent hover:text-black hover:bg-slate-100'
          }`}
          id="tab-edit-trigger"
        >
          Inspector
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 min-w-[70px] py-3 text-[10px] md:text-xs font-mono font-black text-center border-b-2 transition-all cursor-pointer whitespace-nowrap px-1 ${
            activeTab === 'preview' 
              ? 'text-blue-600 border-blue-600 bg-white' 
              : 'text-slate-500 border-transparent hover:text-black hover:bg-slate-100'
          }`}
          id="tab-preview-trigger"
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`flex-1 min-w-[70px] py-3 text-[10px] md:text-xs font-mono font-black text-center border-b-2 transition-all cursor-pointer whitespace-nowrap px-1 ${
            activeTab === 'prompts' 
              ? 'text-blue-600 border-blue-600 bg-white' 
              : 'text-slate-500 border-transparent hover:text-black hover:bg-slate-100'
          }`}
          id="tab-prompts-trigger"
        >
          Prompts ({selectedNode.prompts?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 min-w-[70px] py-3 text-[10px] md:text-xs font-mono font-black text-center border-b-2 transition-all cursor-pointer whitespace-nowrap px-1 ${
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



            {matchingQueueResource && (
              <div className="bg-purple-50 border-2 border-purple-200 p-3 rounded-lg flex flex-col gap-1 select-none animate-fade-in text-[11px] font-mono text-purple-950">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase tracking-wide text-[9px] text-purple-700 flex items-center gap-1">
                    ⚡ LINKED INBOX RESOURCE
                  </span>
                  <span className="text-[8px] bg-purple-100 border border-purple-300 px-1 py-0.5 rounded uppercase font-black">
                    {matchingQueueResource.type}
                  </span>
                </div>
                <div className="font-bold text-black text-xs font-sans mt-1">
                  {matchingQueueResource.title}
                </div>
                {matchingQueueResource.shortSummary && (
                  <div className="text-[10px] text-purple-800 line-clamp-2 mt-0.5 leading-relaxed font-sans">
                    {matchingQueueResource.shortSummary}
                  </div>
                )}
                {matchingQueueResource.url && (
                  <a 
                    href={matchingQueueResource.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 mt-2 font-bold text-purple-600 hover:text-purple-900 border border-purple-300 hover:border-purple-600 rounded bg-white px-2 py-0.5 self-start text-[9px]"
                  >
                    🔗 Launch Original Source
                  </a>
                )}
              </div>
            )}

             {/* Title Form Field */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-650 mb-1">Title *</label>
              <div className="relative">
                <input 
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  onFocus={() => setShowTitleAutoSuggest(true)}
                  onBlur={() => setTimeout(() => setShowTitleAutoSuggest(false), 200)}
                  className="w-full bg-slate-50 border-2 border-black text-slate-905 font-bold text-xs rounded-lg px-3 py-2.5 focus:bg-white outline-none"
                  placeholder="e.g., Stripe SDK initialization"
                  id="node-title-input"
                  autoComplete="off"
                />

                {showTitleAutoSuggest && titleSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_#000] z-50 overflow-hidden text-xs max-h-[160px] overflow-y-auto" id="node-title-autocomplete-dropdown">
                    <div className="bg-slate-100 p-1.5 border-b border-slate-200 text-[8px] font-mono leading-none font-extrabold uppercase text-slate-500 tracking-wider">
                      📋 Copy existing card title:
                    </div>
                    {titleSuggestions.map((titleText) => (
                      <button
                        key={titleText}
                        type="button"
                        onMouseDown={() => {
                          handleChange('title', titleText);
                          setShowTitleAutoSuggest(false);
                        }}
                        className="w-full text-left py-2 px-3 hover:bg-blue-50 font-bold text-slate-800 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer"
                      >
                        {titleText}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  <div className="relative">
                    <input 
                      type="url"
                      value={selectedNode.sourceUrl || ''}
                      onChange={(e) => handleChange('sourceUrl', e.target.value)}
                      onFocus={() => setShowUrlAutoSuggest(true)}
                      onBlur={() => setTimeout(() => setShowUrlAutoSuggest(false), 200)}
                      className="w-full bg-slate-50 border-2 border-black text-slate-905 font-bold text-xs rounded-lg px-2 py-2 focus:bg-white outline-none"
                      placeholder="e.g., https://cloud.google.com/..."
                      id="node-source-url"
                      autoComplete="off"
                    />

                    {showUrlAutoSuggest && urlSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_#000] z-50 overflow-hidden text-xs max-h-[160px] overflow-y-auto" id="node-url-autocomplete-dropdown">
                        <div className="bg-slate-100 p-1.5 border-b border-slate-200 text-[8px] font-mono leading-none font-extrabold uppercase text-slate-500 tracking-wider">
                          🌐 Copy existing source URL:
                        </div>
                        {urlSuggestions.map((item) => (
                          <button
                            key={item.url}
                            type="button"
                            onMouseDown={() => {
                              handleChange('sourceUrl', item.url);
                              if (item.title && !selectedNode.sourceTitle) {
                                handleChange('sourceTitle', item.title);
                              }
                              setShowUrlAutoSuggest(false);
                            }}
                            className="w-full text-left py-1.5 px-3 hover:bg-amber-50 border-b border-slate-150 last:border-b-0 cursor-pointer flex flex-col gap-0.5 text-slate-800 transition-colors"
                          >
                            <span className="font-bold truncate">{item.title || 'Source Links'}</span>
                            <span className="text-[8px] font-mono text-slate-500 truncate leading-tight">{item.url}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TAGS MANAGEMENT GROUP */}
            <div className="p-3 bg-blue-50/50 border-2 border-black rounded-lg space-y-2 select-none font-sans text-sm" id="tags-management-block">
              <label className="block text-[10px] font-mono font-bold uppercase text-blue-900 flex items-center justify-between">
                <span>🏷️ Tags & Categories ({selectedNode.tags?.length || 0})</span>
                <span className="text-[8px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-mono font-medium">
                  Multiple: use comma (,)
                </span>
              </label>

              {/* Tag Badges List with delete & click-to-edit support */}
              {selectedNode.tags && selectedNode.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 p-1 border-2 border-black bg-white rounded-md min-h-[36px]" id="tags-list-container">
                  {selectedNode.tags.map((tagText, idx) => {
                    const isEditing = editingTagIndex === idx;
                    return (
                      <div 
                        key={`${tagText}-${idx}`} 
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-slate-100 rounded text-slate-805 hover:bg-slate-205 transition-all shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:-translate-y-[0.5px]"
                        title="Double-click or click to edit tag"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1" id={`editing-tag-cell-${idx}`}>
                            <input 
                              type="text" 
                              value={editingTagValue} 
                              onChange={(e) => setEditingTagValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedTag(idx);
                                if (e.key === 'Escape') setEditingTagIndex(null);
                              }}
                              className="w-16 bg-white border border-black rounded font-mono text-[9px] px-0.5 outline-none font-bold text-black"
                              autoFocus
                              onBlur={() => saveEditedTag(idx)}
                            />
                            <button 
                              type="button"
                              onMouseDown={() => saveEditedTag(idx)}
                              className="text-emerald-700 hover:text-emerald-950 font-extrabold px-0.5"
                              title="Save Tag"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <>
                            <span 
                              className="cursor-pointer truncate max-w-[120px]" 
                              onClick={() => startEditingTag(idx, tagText)}
                              title="Click to Edit"
                            >
                              {tagText}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(tagText);
                              }}
                              className="text-red-600 hover:text-red-800 hover:scale-125 transition-transform cursor-pointer font-extrabold pl-0.5 border-l border-slate-350 ml-1 font-sans text-[10px] w-3 h-3 flex items-center justify-center bg-slate-200/50 hover:bg-red-50 rounded"
                              title="Remove tag"
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2 bg-white border-2 border-black border-dashed rounded font-mono text-[9px] text-slate-500 uppercase font-black" id="no-tags-placeholder">
                  No tags added yet
                </div>
              )}

              {/* Add tag Input trigger & helper */}
              <form onSubmit={handleAddTag} className="flex gap-1.5" id="add-tag-form-element">
                <input 
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="e.g. key, database, vercel"
                  className="flex-1 bg-white border-2 border-black text-slate-905 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:bg-white outline-none placeholder-slate-400 font-sans"
                  id="tag-creation-input"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-[10px] px-3 py-1.5 border-2 border-black rounded-lg transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000]"
                >
                  ADD
                </button>
              </form>

              {/* Suggestions Quick clickers */}
              <div className="pt-1.5 select-none space-y-2.5" id="tag-suggestions-box">
                {/* 1. Global Workspace Tags */}
                <div className="space-y-1" id="global-workspace-tags-section">
                  <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-tight block">
                    🌐 Global Tags (Used in Workspaces):
                  </span>
                  
                  {allWorkspaceUniqueTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white border-2 border-black rounded-lg" id="workspace-unselected-list">
                      {allWorkspaceUniqueTags.map(utag => {
                        const isPinnedOnCurrent = (selectedNode.tags || []).includes(utag);
                        const isConfirming = confirmDeleteTag === utag;
                        // Count how many cards use this tag
                        const useCount = globalNodes ? globalNodes.filter(n => n.tags && Array.isArray(n.tags) && n.tags.includes(utag)).length : 0;
                        
                        return (
                          <div
                            key={utag}
                            className={`inline-flex items-center gap-0.5 text-[8.5px] font-mono font-semibold rounded overflow-hidden shadow-sm border transition-all ${
                              isConfirming
                                ? 'bg-red-50 border-red-400 text-red-950 shadow-xs'
                                : isPinnedOnCurrent 
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400' 
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-805'
                            }`}
                          >
                            {!isConfirming && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = [...(selectedNode.tags || [])];
                                  if (isPinnedOnCurrent) {
                                    handleChange('tags', updated.filter(t => t !== utag));
                                  } else {
                                    handleChange('tags', [...updated, utag]);
                                  }
                                }}
                                className="px-1.5 py-0.5 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                                title={isPinnedOnCurrent ? "Click to unpin from this card" : "Click to pin to this card"}
                              >
                                {isPinnedOnCurrent ? '✓' : '+'} {utag} <span className="text-[7.5px] opacity-60">({useCount})</span>
                              </button>
                            )}

                            {isConfirming ? (
                              <div className="flex items-center" id="global-tag-confirm-box">
                                <span className="px-1 py-0.5 font-bold text-red-700 bg-red-100 text-[8px] animate-pulse">Delete {utag}?</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onRemoveTagGlobally) {
                                      onRemoveTagGlobally(utag);
                                    }
                                    setConfirmDeleteTag(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white font-extrabold cursor-pointer transition-colors text-[8px]"
                                  title="Confirm delete"
                                >
                                  YES
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteTag(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer transition-colors text-[8px] border-l border-white/50"
                                  title="Cancel"
                                >
                                  NO
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteTag(utag);
                                }}
                                className="px-1 py-0.5 text-red-600 hover:text-red-900 border-l border-slate-200 transition-colors cursor-pointer font-extrabold text-[8.5px] h-full flex items-center bg-red-50/50 hover:bg-red-100"
                                title="Delete tag globally from ALL cards"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[8px] font-mono text-slate-400 italic">No tags registered in workspace nodes.</div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Tool Pricing & Credit Configuration (Only for type === 'tool') */}
            {selectedNode.type === 'tool' && (
              <div className="p-3 bg-purple-50 border-2 border-black rounded-lg space-y-3" id="ai-tool-config-section">
                <span className="text-[10px] font-mono font-bold block uppercase text-purple-800 tracking-wide flex items-center gap-1 leading-none select-none">
                  ⚙️ AI Tool Pricing & Credits
                </span>
                
                <div>
                  <label className="block text-[8.5px] font-mono font-bold text-slate-600 uppercase mb-1">
                    Select Pricing Class / Tier tag:
                  </label>
                  <div className="grid grid-cols-3 gap-1" id="pricing-tier-toggles">
                    {['Free', 'Daily credits', 'Monthly credits'].map((tier) => {
                      const isActive = selectedNode.pricingTier === tier || (!selectedNode.pricingTier && tier === 'Free');
                      
                      // Assign distinct styling schemes for each class/tier
                      let btnStyle = '';
                      if (tier === 'Free') {
                        btnStyle = isActive
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-black shadow-[1.5px_1.5px_0px_#000] translate-y-[0.5px] font-extrabold'
                          : 'bg-emerald-50/30 hover:bg-emerald-100/50 text-emerald-800 border-emerald-250';
                      } else if (tier === 'Daily credits') {
                        btnStyle = isActive
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-black shadow-[1.5px_1.5px_0px_#000] translate-y-[0.5px] font-extrabold'
                          : 'bg-indigo-50/30 hover:bg-indigo-100/50 text-indigo-800 border-indigo-250';
                      } else { // Monthly credits
                        btnStyle = isActive
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-black shadow-[1.5px_1.5px_0px_#000] translate-y-[0.5px] font-extrabold'
                          : 'bg-amber-50/30 hover:bg-amber-100/50 text-amber-800 border-amber-250';
                      }

                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => {
                            onUpdateNode({
                              ...selectedNode,
                              pricingTier: tier
                            });
                          }}
                          className={`text-[9px] font-mono py-1 px-1 border-2 rounded transition-all cursor-pointer ${btnStyle}`}
                        >
                          {tier}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[8.5px] font-mono font-bold text-slate-600 uppercase mb-1">
                    Approximate Uses Before Credits Finish:
                  </label>
                  <input
                    type="text"
                    value={selectedNode.approximateUses || ''}
                    onChange={(e) => handleChange('approximateUses', e.target.value)}
                    placeholder="e.g., 4-7 prompts, 50 queries"
                    className="w-full bg-white border-2 border-black text-slate-900 font-bold text-xs rounded px-2.5 py-1.5 outline-none placeholder-slate-400 focus:bg-white"
                    id="tool-credit-capacity-input"
                  />
                  <span className="text-[8.5px] font-mono text-slate-500 mt-1 block leading-normal">
                    💡 Example logic: Claude may finish remaining limits in approx. 4-7 prompts.
                  </span>
                </div>
              </div>
            )}

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

            {/* Duplicate to another Workspace Panel */}
            <div 
              className="border-t-2 border-slate-200 pt-3 bg-gradient-to-br from-purple-50 to-indigo-50/70 p-3 rounded-lg border-2 border-black select-none shadow-[2px_2px_0px_#000] space-y-2" 
              id="sidebar-node-move-panel"
            >
              <span className="text-[10px] font-mono font-bold block uppercase text-purple-900 flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                Duplicate Card to Workspace
              </span>
              
              <p className="text-[9px] text-purple-800 leading-normal font-medium">
                Duplicate this whiteboard node card to another active workspace canvas. Keeps the original card in place and creates a fresh copy.
              </p>

              {workflows.length > 1 ? (
                <div className="space-y-1">
                  <div className="max-h-28 overflow-y-auto border-2 border-black rounded-lg bg-white p-1 space-y-1" id="move-inner-scroller-node">
                    {workflows
                      .filter(wf => wf.id !== selectedNode.workflowId)
                      .map((wf) => {
                        const isTargetingThis = confirmMoveToWorkflowId === wf.id;
                        return (
                          <div 
                            key={wf.id} 
                            className={`p-1 rounded transition-all ${
                              isTargetingThis 
                                ? 'bg-purple-100 border border-purple-400 shadow-sm' 
                                : 'hover:bg-purple-50 border border-transparent'
                            }`}
                          >
                            {!isTargetingThis ? (
                              <button
                                type="button"
                                onClick={() => setConfirmMoveToWorkflowId(wf.id)}
                                className="w-full text-left font-mono font-black text-[9px] text-purple-900 hover:text-purple-700 flex items-center justify-between gap-1.5 cursor-pointer"
                              >
                                <span className="truncate flex items-center gap-1">
                                  <span>📁</span>
                                  <span>{wf.title}</span>
                                </span>
                                <span className="text-[7.5px] bg-purple-650 hover:bg-purple-750 text-white px-1.5 py-0.5 rounded font-mono font-black shrink-0 tracking-wide uppercase shadow-[1px_1px_0px_rgba(0,0,0,0.15)] hover:bg-purple-700 transition-all active:translate-y-[0.5px]">
                                  DUPLICATE
                                </span>
                              </button>
                            ) : (
                              <div className="flex flex-col gap-1.5 p-0.5">
                                <span className="text-[8px] font-sans font-black text-purple-950 block">
                                  Duplicate to "{wf.title}"?
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onDuplicateNodeToWorkflow) {
                                        onDuplicateNodeToWorkflow(selectedNode.id, wf.id);
                                      }
                                      setConfirmMoveToWorkflowId(null);
                                    }}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-mono text-[8px] font-black py-0.5 px-1.5 rounded border border-black cursor-pointer text-center uppercase shadow-[1px_1px_0px_#000] active:translate-y-[0.5px]"
                                  >
                                    ✓ Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmMoveToWorkflowId(null)}
                                    className="bg-white hover:bg-slate-100 text-slate-700 font-mono text-[8px] font-bold py-0.5 px-1.5 rounded border border-slate-350 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-1.5 bg-slate-100 border-2 border-black border-dashed rounded font-mono text-[8.5px] text-slate-500 uppercase font-bold">
                  No other workspaces available
                </div>
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
                    {editingReviewId === review.id ? (
                      <div className="space-y-3.5 text-xs text-slate-800" id={`edit-review-container-${review.id}`}>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-0.5">Author Name</label>
                            <input 
                              type="text"
                              value={editingReviewAuthor}
                              onChange={(e) => setEditingReviewAuthor(e.target.value)}
                              className="w-full bg-white border-2 border-black text-slate-900 font-bold text-xs rounded px-2 py-1 outline-none focus:bg-slate-50"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-0.5">Certified Status</label>
                            <select
                              value={editingReviewStatus}
                              onChange={(e) => setEditingReviewStatus(e.target.value as NodeStatus)}
                              className="w-full bg-white border-2 border-black text-slate-900 font-bold text-xs rounded px-1.5 py-1 outline-none cursor-pointer focus:bg-slate-50"
                            >
                              <option value="trusted">Trusted Verified</option>
                              <option value="experimental">Experimental</option>
                              <option value="archived">Archived / Legacy</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-0.5">Assessment Notes</label>
                          <textarea 
                            rows={3}
                            value={editingReviewComment}
                            onChange={(e) => setEditingReviewComment(e.target.value)}
                            className="w-full bg-white border-2 border-black text-slate-900 font-medium text-xs rounded px-2.5 py-1.5 outline-none resize-none font-sans focus:bg-slate-50"
                          />
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-0.5" id={`editing-review-rating-banner-${review.id}`}>
                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase pr-1.5">Utility:</span>
                            {[1, 2, 3, 4, 5].map((idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setEditingReviewRating(idx)}
                                className="p-0.5 hover:scale-110 transition-transform"
                              >
                                <Star className={`w-3.5 h-3.5 ${idx <= editingReviewRating ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`} />
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingReviewId(null)}
                              className="px-2.5 py-1 border-2 border-black rounded text-[10px] font-mono font-bold bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
                            >
                              CANCEL
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditReview(review.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded border-2 border-black text-[10px] font-mono font-bold uppercase cursor-pointer shadow-[1px_1px_0px_#000]"
                            >
                              SAVE
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start text-[10px]" id={`reviewer-badge-head-${review.id}`}>
                          <div className="flex items-center gap-1.5" id={`review-reviewer-badge-${review.id}`}>
                            <div className="w-5 h-5 rounded-full bg-blue-50 border-2 border-black flex items-center justify-center text-blue-600 text-[9px] font-mono font-black shadow-[1px_1px_0px_#000]">
                              {review.author.slice(0, 1).toUpperCase()}
                            </div>
                            <span className="text-black font-extrabold pr-1">{review.author}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5" id={`reviewer-pills-${review.id}`}>
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

                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-50 mt-1" id={`review-action-banner-${review.id}`}>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((idx) => (
                              <Star key={idx} className={`w-3 h-3 ${idx <= review.rating ? 'text-amber-500 fill-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </div>
                          
                          <div className="flex gap-2.5 items-center select-none" id={`review-controls-line-${review.id}`}>
                            <button
                              type="button"
                              onClick={() => handleStartEditReview(review)}
                              className="text-[9px] font-mono font-bold text-slate-500 hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                            
                            {confirmingDeleteReviewId === review.id ? (
                              <div className="flex items-center gap-1 border border-red-200 bg-red-50 px-1 py-0.5 rounded font-mono text-[8.5px] font-bold animate-fade-in" id="delete-confirmation-bubble">
                                <span className="text-red-700 pr-0.5">Sure?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteReview(review.id);
                                    setConfirmingDeleteReviewId(null);
                                  }}
                                  className="text-red-700 hover:text-red-950 underline hover:font-black cursor-pointer"
                                >
                                  YES
                                </button>
                                <span className="text-red-350">/</span>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingDeleteReviewId(null)}
                                  className="text-slate-500 hover:text-black hover:underline cursor-pointer"
                                >
                                  NO
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteReviewId(review.id)}
                                className="text-[9px] font-mono font-bold text-slate-500 hover:text-red-650 hover:underline cursor-pointer flex items-center gap-0.5 transition-colors"
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
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

        {/* TAB 4: PROMPT SAVER & TEMPLATE MANAGER */}
        {activeTab === 'prompts' && (
          <div className="space-y-4 font-sans animate-fade-in" id="prompts-manager-panel">
            
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center" id="prompts-title-section">
              <div>
                <span className="text-[9px] font-mono font-semibold text-slate-400 block uppercase">Prompt templates</span>
                <h4 className="text-xs font-bold text-black font-mono leading-none">🧠 Prompt Saver & Manager</h4>
              </div>
              <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 font-mono border-2 border-black font-extrabold rounded-md shadow-[1px_1px_0px_#000]">
                {selectedNode.prompts?.length || 0} Saved
              </span>
            </div>

            <p className="text-[11.5px] text-slate-500 leading-normal font-medium">
              Store recurrent system guidelines, code assistant commands, and fine-tuning prompts. Copy them with 1-Click for quick clipboard utilization!
            </p>

            {/* Form to add a new prompt */}
            <div className="bg-indigo-50/40 border-2 border-black rounded-lg p-3 space-y-3 shadow-[2.5px_2.5px_0px_#000]" id="prompts-add-form-container">
              <span className="text-[9.5px] font-mono text-indigo-950 uppercase tracking-tight font-black block flex items-center gap-1">
                ⚡ Register a New Prompt Template
              </span>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddPrompt();
                }}
                className="space-y-2.5"
              >
                <div>
                  <label className="block text-[8px] font-mono text-slate-500 uppercase font-bold mb-0.5">Template Title</label>
                  <input 
                    type="text"
                    placeholder="e.g., Code Review Standard, Tone Shift"
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                    className="w-full bg-white border-2 border-black text-slate-905 font-bold text-xs rounded px-2.5 py-1.5 focus:bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-mono text-slate-500 uppercase font-bold mb-0.5">Instruction Text / Prompt Body *</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Copy and paste prompt template or system rules..."
                    value={newPromptText}
                    onChange={(e) => setNewPromptText(e.target.value)}
                    className="w-full bg-white border-2 border-black text-slate-905 font-medium text-xs rounded px-2.5 py-1.5 focus:bg-slate-50 outline-none resize-none font-mono"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!newPromptText.trim()}
                    className={`font-mono font-black text-[9.5px] px-3 py-1.5 border-2 border-black rounded transition-all cursor-pointer ${
                      newPromptText.trim() 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[1.5px_1.5px_0px_#000] active:translate-y-[0.5px]'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    ADD PROMPT TEMPLATE
                  </button>
                </div>
              </form>
            </div>

            {/* List of prompts */}
            <div className="space-y-3 pt-1" id="prompts-display-root">
              <span className="text-[9px] font-mono text-slate-450 uppercase font-bold block">
                Your Saved Prompts Checklist:
              </span>

              {selectedNode.prompts && selectedNode.prompts.length > 0 ? (
                <div className="space-y-3" id="saved-prompts-list">
                  {selectedNode.prompts.map((p) => {
                    const isEditing = editingPromptId === p.id;
                    const isCopied = copiedPromptId === p.id;
                    const isConfirmingDelete = confirmingDeletePromptId === p.id;

                    return (
                      <div 
                        key={p.id}
                        className="bg-white border-2 border-black rounded-lg p-3.5 space-y-2 shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-[0.5px] relative"
                        id={`prompt-item-container-${p.id}`}
                      >
                        {isEditing ? (
                          <div className="space-y-3 text-xs text-slate-800" id={`prompt-editing-form-${p.id}`}>
                            <div>
                              <label className="block text-[8.5px] font-mono uppercase text-slate-500 font-bold mb-0.5">Prompt Title</label>
                              <input 
                                type="text"
                                value={editingPromptTitle}
                                onChange={(e) => setEditingPromptTitle(e.target.value)}
                                className="w-full bg-white border-2 border-black text-xs font-bold px-2 py-1 rounded outline-none focus:bg-slate-50"
                              />
                            </div>
                            <div>
                              <label className="block text-[8.5px] font-mono uppercase text-slate-500 font-bold mb-0.5">Prompt Body Code/Rules</label>
                              <textarea
                                rows={4}
                                value={editingPromptText}
                                onChange={(e) => setEditingPromptText(e.target.value)}
                                className="w-full bg-white border-2 border-black text-xs font-medium px-2 py-1.5 rounded outline-none resize-none font-mono focus:bg-slate-50"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setEditingPromptId(null)}
                                className="px-2.5 py-1 border border-black text-[9px] font-mono rounded bg-slate-50 hover:bg-slate-100 cursor-pointer"
                              >
                                CANCEL
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditPrompt(p.id)}
                                className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[9px] font-bold rounded border border-black cursor-pointer"
                              >
                                SAVE CHANGES
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Display mode */}
                            <div className="flex justify-between items-center bg-slate-50 -mx-3.5 -mt-3.5 px-3.5 py-1.5 rounded-t-lg border-b-2 border-black" id={`prompt-header-${p.id}`}>
                              <span className="text-[10.5px] font-extrabold text-slate-900 font-mono truncate max-w-[150px]" title={p.title}>
                                ⚡ {p.title}
                              </span>
                              
                              <button
                                type="button"
                                onClick={() => handleCopyPromptText(p.id, p.text)}
                                className={`text-[9px] font-mono font-black px-2 py-0.5 rounded cursor-pointer transition-all border-2 border-black shadow-[1px_1px_0px_#000] active:translate-y-[0.5px] ${
                                  isCopied 
                                    ? 'bg-emerald-550 bg-emerald-500 text-white border-black' 
                                    : 'bg-indigo-100 hover:bg-indigo-150 text-indigo-900'
                                }`}
                                title="Copy prompt text to clipboard"
                              >
                                {isCopied ? 'Copied! ✓' : '📋 Copy Prompt'}
                              </button>
                            </div>

                            <p 
                              className="text-[11px] font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto block p-2 border border-slate-100 bg-slate-50/50 rounded cursor-pointer selection:bg-indigo-100/50"
                              onClick={() => handleCopyPromptText(p.id, p.text)}
                              title="Click anywhere on content block to copy prompt"
                            >
                              {p.text}
                            </p>

                            <div className="flex justify-between items-center text-[9px] text-slate-550 border-t border-slate-100 pt-1.5" id={`prompt-bottom-controls-bar-${p.id}`}>
                              <span className="font-mono text-[8px] opacity-70">
                                Created: {new Date(p.createdAt || '').toLocaleDateString()}
                              </span>

                              <div className="flex gap-3 items-center select-none" id={`prompt-actions-set-${p.id}`}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPrompt(p)}
                                  className="text-[9px] font-mono font-bold text-slate-500 hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5 transition-colors"
                                >
                                  ✏️ Edit
                                </button>

                                {isConfirmingDelete ? (
                                  <div className="flex items-center gap-1 border border-red-200 bg-red-50 px-1 py-0.5 rounded font-mono text-[8.5px] font-bold animate-fade-in" id={`prompt-del-confirm-${p.id}`}>
                                    <span className="text-red-700 pr-0.5">Sure?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDeletePrompt(p.id);
                                        setConfirmingDeletePromptId(null);
                                      }}
                                      className="text-red-700 hover:text-red-950 underline hover:font-black cursor-pointer"
                                    >
                                      YES
                                    </button>
                                    <span className="text-red-350">/</span>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingDeletePromptId(null)}
                                      className="text-slate-500 hover:text-black hover:underline cursor-pointer"
                                    >
                                      NO
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDeletePromptId(p.id)}
                                    className="text-[9px] font-mono font-bold text-slate-500 hover:text-red-650 hover:underline cursor-pointer flex items-center gap-0.5 transition-colors"
                                  >
                                    🗑️ Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-black rounded-lg bg-slate-50" id="prompts-list-empty-prompt">
                  <Bookmark className="w-5 h-5 text-slate-400 mx-auto mb-1 animate-pulse" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase">No Custom Prompts Saved</p>
                  <p className="text-[10px] text-slate-405 leading-relaxed font-semibold mt-1">
                    Begin typing above to save reusable templates and formulas on this node.
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
