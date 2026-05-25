import React, { useState, useEffect } from 'react';
import { 
  QueueResource, 
  ResourceReview, 
  ResourceLinkToNode, 
  Workflow, 
  WorkflowNode,
  ResourceType, 
  ResourceStatus 
} from '../types';
import { 
  Inbox, 
  Sparkles, 
  Link2, 
  FileText, 
  Video, 
  Cpu, 
  Plus, 
  Search, 
  Calendar, 
  Star, 
  Trash2, 
  Archive, 
  FolderPlus, 
  ExternalLink, 
  CheckCircle2, 
  Tags, 
  ThumbsUp, 
  ChevronRight, 
  PenTool, 
  HelpCircle,
  Clock,
  Check,
  RotateCcw
} from 'lucide-react';

interface ExperimentalQueueProps {
  workflows: Workflow[];
  resources: QueueResource[];
  reviews: ResourceReview[];
  linksToNodes: ResourceLinkToNode[];
  onAddResource: (resource: Omit<QueueResource, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateResource: (id: string, updatedFields: Partial<QueueResource>) => void;
  onDeleteResource: (id: string) => void;
  onAddReview: (review: Omit<ResourceReview, 'id' | 'reviewedAt'>) => void;
  onMoveToWorkflow: (resourceId: string, workflowId: string) => void;
}

export default function ExperimentalQueue({
  workflows,
  resources,
  reviews,
  linksToNodes,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  onAddReview,
  onMoveToWorkflow
}: ExperimentalQueueProps) {
  // Input fields for quick capture
  const [quickInput, setQuickInput] = useState('');
  const [quickType, setQuickType] = useState<ResourceType>('link');
  const [quickError, setQuickError] = useState('');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');

  // Active review drawer/modal state
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [confirmMoveToWorkflowId, setConfirmMoveToWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    setConfirmMoveToWorkflowId(null);
  }, [selectedResourceId]);
  
  // Custom tag creation inline
  const [newTagInput, setNewTagInput] = useState('');

  // Daily Review Scheduler State
  // We want to highlight one unreviewed item as the "Daily Focus"
  const [dailyReviewItem, setDailyReviewItem] = useState<QueueResource | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [reviewRating, setReviewRating] = useState(3);
  const [reviewIsUseful, setReviewIsUseful] = useState(true);
  const [reviewCompleted, setReviewCompleted] = useState(false);

  // Pick a fresh daily review focus when component loads or resources change
  useEffect(() => {
    // Pick first unreviewed item, preferably from 'inbox' or 'experimental', or simply the oldest resource
    const unreviewed = resources.filter(
      r => r.status === 'inbox' || r.status === 'experimental'
    );
    if (unreviewed.length > 0) {
      // Use the resource ID or some semi-stable daily hash
      setDailyReviewItem(unreviewed[0]);
    } else if (resources.length > 0) {
      setDailyReviewItem(resources[0]);
    } else {
      setDailyReviewItem(null);
    }
  }, [resources]);

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) {
      setQuickError('Please enter a description, keyword, or URL.');
      return;
    }

    setQuickError('');
    let detectedType: ResourceType = quickType;
    let title = quickInput.trim();
    let url = '';

    // Auto-classify URL and standard formats
    const isUrl = quickInput.match(/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i) || quickInput.startsWith('http');
    if (isUrl) {
      url = quickInput;
      // Extract pseudo title
      try {
        const parsedUrl = new URL(quickInput.startsWith('http') ? quickInput : `https://${quickInput}`);
        title = parsedUrl.hostname.replace('www.', '') + ' link';
      } catch {
        title = 'Captured URL Resource';
      }

      // Quick heuristics classifier
      if (quickInput.includes('youtube.com') || quickInput.includes('youtu.be') || quickInput.includes('vimeo.com')) {
        detectedType = 'video';
      } else if (quickInput.includes('github.com') || quickInput.includes('npm') || quickInput.includes('developer')) {
        detectedType = 'tool';
      } else {
        detectedType = 'link';
      }
    } else {
      // Text inputs
      if (quickInput.length > 50) {
        title = quickInput.substring(0, 45) + '...';
        detectedType = 'note';
      } else {
        detectedType = 'note';
      }
    }

    onAddResource({
      title,
      url,
      type: detectedType,
      shortSummary: isUrl ? `Quickly captured resource from ${url}` : 'Quickly captured text note.',
      tags: [detectedType],
      rating: 0,
      notes: isUrl ? `URL: ${url}` : quickInput,
      status: 'inbox'
    });

    setQuickInput('');
    setQuickType('link');
  };

  // Run a daily review submission
  const submitDailyReview = (id: string) => {
    if (!id) return;
    onAddReview({
      resourceId: id,
      notes: reviewNoteInput,
      isUseful: reviewIsUseful
    });

    // Update resource state based on review
    onUpdateResource(id, {
      rating: reviewRating,
      status: reviewIsUseful ? 'trusted' : 'archived',
      shortSummary: reviewNoteInput || undefined,
      updatedAt: new Date().toISOString()
    });

    setReviewNoteInput('');
    setReviewCompleted(true);
    setTimeout(() => {
      setReviewCompleted(false);
      // Pick next item if available
      const remainingUnreviewed = resources.filter(
        r => r.id !== id && (r.status === 'inbox' || r.status === 'experimental')
      );
      if (remainingUnreviewed.length > 0) {
        setDailyReviewItem(remainingUnreviewed[0]);
      } else {
        setDailyReviewItem(null);
      }
    }, 1800);
  };

  const getIconForType = (type: ResourceType) => {
    switch (type) {
      case 'article': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'video': return <Video className="w-4 h-4 text-red-500" />;
      case 'tool': return <Cpu className="w-4 h-4 text-purple-500" />;
      case 'note': return <PenTool className="w-4 h-4 text-amber-500" />;
      case 'link': return <Link2 className="w-4 h-4 text-blue-500" />;
      default: return <Link2 className="w-4 h-4 text-slate-500" />;
    }
  };

  const getBgForStatus = (status: ResourceStatus) => {
    switch (status) {
      case 'inbox': return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'experimental': return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'tested': return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'trusted': return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'archived': return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'deleted': return 'bg-rose-50 text-rose-800 border-rose-300';
      default: return 'bg-slate-50 text-slate-700 border-slate-300';
    }
  };

  // Filtered resources inventory
  const filteredResources = resources.filter(res => {
    if (statusFilter !== 'all' && res.status !== statusFilter) return false;
    if (typeFilter !== 'all' && res.type !== typeFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const titleMatch = res.title?.toLowerCase().includes(q);
      const summaryMatch = res.shortSummary?.toLowerCase().includes(q);
      const urlMatch = res.url?.toLowerCase().includes(q);
      const tagsMatch = res.tags?.some(t => t.toLowerCase().includes(q));
      return titleMatch || summaryMatch || urlMatch || tagsMatch;
    }
    return true;
  });

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#f8fafc] text-xs" id="experimental-queue-dashboard">
      
      {/* LEFT COLUMN: Controls, Capture, Status, Filters, and Daily Review */}
      <div className="w-full md:w-80 bg-white border-r-2 border-black flex flex-col h-full shrink-0 overflow-y-auto p-4 space-y-4" id="queue-control-column">
        
        {/* Section Heading */}
        <div className="flex items-center gap-2 border-b-2 border-black pb-2.5">
          <div className="p-1 px-2 bg-blue-600 text-white border border-black rounded shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] font-mono font-bold">
            INBOX
          </div>
          <div>
            <h2 className="text-xs font-black text-black uppercase tracking-wider">Experimental Queue</h2>
            <span className="text-[9px] font-mono text-slate-400 font-bold block leading-none mt-1">Capture & review dev artifacts</span>
          </div>
        </div>

        {/* Quick Capture Input box */}
        <div className="bg-slate-50 border-2 border-black p-3 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)]" id="quick-capture-panel">
          <h3 className="font-bold text-black flex items-center gap-1.5 uppercase font-mono tracking-tight text-[10px] mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Quick Capture
          </h3>
          
          <form onSubmit={handleQuickCapture} className="space-y-2">
            <div>
              <input 
                type="text" 
                placeholder="Paste URL, title, or code command..."
                value={quickInput}
                onChange={(e) => {
                  setQuickInput(e.target.value);
                  if (quickError) setQuickError('');
                }}
                className="w-full bg-white border border-slate-300 hover:border-black focus:border-black rounded p-1.5 font-sans outline-none text-[11px]"
                id="quick-capture-input"
              />
              {quickError && <span className="text-[9px] text-red-500 block mt-1 font-mono font-bold">{quickError}</span>}
            </div>

            <div className="flex items-center gap-1.5 pt-0.5 justify-between">
              <div className="flex items-center gap-1 select-none">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Type:</span>
                <select 
                  value={quickType}
                  onChange={(e) => setQuickType(e.target.value as ResourceType)}
                  className="bg-white border border-slate-300 hover:border-black focus:border-black rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-800"
                >
                  <option value="link">🌐 Link</option>
                  <option value="article">📄 Article</option>
                  <option value="video">🎥 Video</option>
                  <option value="tool">⚙️ Tool</option>
                  <option value="note">✏️ Note</option>
                </select>
              </div>

              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-mono font-black border border-black rounded px-2.5 py-1 flex items-center gap-1 shadow-[1.5px_1.5px_0px_#000] active:translate-y-[1px] hover:translate-x-[0.5px] cursor-pointer text-[10px]"
                id="sumbit-capture-button"
              >
                <Plus className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>

        {/* Filters Panel */}
        <div className="border border-slate-200 bg-slate-50/50 p-2.5 rounded-lg select-none" id="queue-filter-panel">
          <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider mb-2">Filter by Status:</span>
          <div className="flex flex-wrap gap-1 mb-3">
            {(['all', 'inbox', 'experimental', 'tested', 'trusted', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-black text-white border-black font-black shadow-[1px_1px_0px_#000]'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {status.toUpperCase()}
              </button>
            ))}
          </div>

          <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider mb-2">Filter by Type:</span>
          <div className="flex flex-wrap gap-1">
            {(['all', 'article', 'video', 'tool', 'note', 'link'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                  typeFilter === type
                    ? 'bg-blue-600 text-white border-black font-black shadow-[1px_1px_0px_#000]'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Review Plan Card */}
        <div className="border-2 border-dashed border-slate-300 bg-blue-50/40 p-3 rounded-lg relative" id="daily-review-flow-block">
          <div className="absolute -top-2 right-2 bg-amber-400 border border-black text-[8px] font-mono font-black text-black px-1.5 py-0.2 rounded uppercase shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            Daily Focus
          </div>

          <h3 className="font-bold text-black flex items-center gap-1 uppercase font-mono tracking-tight text-[10px] mb-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
            Structured Review
          </h3>

          {reviewCompleted ? (
            <div className="py-4 text-center space-y-1 animate-fade-in" id="review-feedback-success">
              <div className="w-8 h-8 bg-emerald-500 border border-black rounded-full flex items-center justify-center text-white mx-auto shadow-[1px_1px_0px_#000]">
                <Check className="w-4 h-4 text-white font-bold" />
              </div>
              <p className="text-[10px] font-mono text-emerald-800 font-extrabold uppercase mt-1">Review Completed!</p>
              <p className="text-[9px] font-medium text-slate-400">Marked and saved index successfully.</p>
            </div>
          ) : dailyReviewItem ? (
            <div className="space-y-2 mt-2" id="daily-review-active-card">
              <div className="border border-slate-200 bg-white rounded p-2 shadow-[1px_1px_0px_#000]">
                <div className="flex items-center gap-1.5">
                  {getIconForType(dailyReviewItem.type)}
                  <span className="font-extrabold text-black truncate max-w-[170px] inline-block">{dailyReviewItem.title}</span>
                </div>
                {dailyReviewItem.url && (
                  <a 
                    href={dailyReviewItem.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[9px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5 font-mono truncate"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span className="truncate">{dailyReviewItem.url}</span>
                  </a>
                )}
                <p className="text-[9px] text-slate-400 mt-1 italic leading-tight truncate">
                  {dailyReviewItem.shortSummary || 'No summary added yet.'}
                </p>
              </div>

              {/* Review Mini form */}
              <div className="space-y-1.5">
                <div>
                  <span className="block text-[9px] font-mono font-bold text-slate-500 mb-0.5">Quick Summary Note:</span>
                  <textarea 
                    value={reviewNoteInput}
                    onChange={(e) => setReviewNoteInput(e.target.value)}
                    placeholder="Enter any insights, takeaways, or short summary..."
                    className="w-full bg-white border border-slate-350 hover:border-black rounded p-1 text-[10px] resize-none h-12 outline-none font-sans"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5 select-none">
                    <span className="text-[9px] font-mono font-bold text-slate-500 mr-1">Rating:</span>
                    {[1,2,3,4,5].map((star) => (
                      <button 
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-0 hover:scale-110 cursor-pointer"
                      >
                        <Star className={`w-3.5 h-3.5 ${star <= reviewRating ? 'text-amber-500 fill-amber-400' : 'text-slate-350'}`} />
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 select-none">
                    <button
                      type="button"
                      onClick={() => setReviewIsUseful(true)}
                      className={`p-1.5 px-2 rounded font-mono font-bold text-[9px] border cursor-pointer active:translate-y-[1px] ${
                        reviewIsUseful 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-[1px_1px_x0px_#000]'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      Useful
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewIsUseful(false)}
                      className={`p-1.5 px-2 rounded font-mono font-bold text-[9px] border cursor-pointer active:translate-y-[1px] ${
                        !reviewIsUseful 
                          ? 'bg-rose-50 text-rose-800 border-rose-500 shadow-[1px_1px_x0px_#000]'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      Archive
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => submitDailyReview(dailyReviewItem.id)}
                  className="w-full border border-black bg-blue-600 hover:bg-blue-700 text-white font-mono font-black rounded p-1 text-center shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] active:translate-y-[0.5px] cursor-pointer text-[10px]"
                >
                  Confirm Daily Review
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-slate-400 font-mono text-[9px] uppercase">
              No pending items to review
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Search lists container, details editor profile drawers */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden" id="queue-inventory-column">
        
        {/* Main Resource cards catalog */}
        <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden p-4" id="main-inventory-catalogue">
          
          {/* Catalog Operations Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 justify-between pb-3 select-none">
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text"
                placeholder="Search captured resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-black rounded-lg pl-8 pr-3 py-1 text-xs font-semibold text-slate-800 outline-none focus:bg-white"
                id="queue-searchbox"
              />
            </div>

            <div className="text-[10px] font-mono text-slate-500 font-bold" id="queue-count-readout">
              Showing {filteredResources.length} of {resources.length} resource elements
            </div>
          </div>

          {/* Cards scrolling area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" id="scrolling-inventory-grid">
            {filteredResources.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" id="resources-grid-layer">
                {filteredResources.map((res) => {
                  const dateStr = new Date(res.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit'
                  });

                  // Check if this resource has reviews linked
                  const reviewCount = reviews.filter(rev => rev.resourceId === res.id).length;
                  const isLinked = linksToNodes.some(l => l.resourceId === res.id);

                  return (
                    <div 
                      key={res.id}
                      onClick={() => setSelectedResourceId(res.id)}
                      className={`p-3 bg-white rounded-lg border-2 flex flex-col justify-between gap-3 group cursor-pointer transition-all ${
                        selectedResourceId === res.id 
                          ? 'border-blue-600 shadow-[3px_3px_0px_#2563eb]' 
                          : 'border-slate-350 hover:border-slate-800 shadow-[2px_2px_0px_transparent] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {getIconForType(res.type)}
                            <span className="font-extrabold text-black hover:text-blue-600 line-clamp-1">{res.title}</span>
                          </div>
                          
                          <span className={`px-1.5 py-0.5 border text-[8px] font-mono font-bold rounded uppercase shrink-0 ${getBgForStatus(res.status)}`}>
                            {res.status}
                          </span>
                        </div>

                        {res.url && (
                          <div className="flex items-center gap-1 font-mono text-[9px] text-blue-500 truncate" id={`url-col-${res.id}`}>
                            <Link2 className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate select-all">{res.url}</span>
                          </div>
                        )}

                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                          {res.shortSummary || 'No summary entered yet. Tap to configure item reviews.'}
                        </p>

                        <div className="flex flex-wrap gap-1" id={`tags-container-${res.id}`}>
                          {res.tags?.map((tag) => (
                            <span 
                              key={tag}
                              className="px-1.5 py-0.2 bg-slate-100 border border-slate-205 rounded text-[8px] font-mono text-slate-650"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer actions for the inventory cards */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 pb-0.5 text-[9px] font-mono text-slate-400 select-none">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {dateStr}
                          </span>

                          {reviewCount > 0 && (
                            <span className="flex items-center gap-0.5 text-emerald-600 font-bold">
                              <ThumbsUp className="w-3 h-3" />
                              Reviewed
                            </span>
                          )}

                          {isLinked && (
                            <span className="px-1 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold text-[8px]">
                              LINKED TO WORKFLOW
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteResource(res.id);
                              if (selectedResourceId === res.id) setSelectedResourceId(null);
                            }}
                            className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer hover:border hover:border-red-200"
                            title="Delete Resource permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 font-mono text-[10px] uppercase border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 p-6">
                No matching experimental resources found.
              </div>
            )}
          </div>

        </div>

        {/* Selected detail panel drawer (Google Weje sidebar inspection style) */}
        {selectedResource ? (
          <div className="w-full md:w-80 lg:w-96 bg-white border-l-2 border-black flex flex-col h-full shrink-0 shadow-[-4px_0_0_rgba(0,0,0,0.05)] animate-slide-in" id="queue-profile-drawer">
            
            <div className="flex items-center justify-between p-3 border-b-2 border-black bg-slate-50 text-slate-700 font-mono text-[9px] font-bold uppercase tracking-wider shrink-0 select-none">
              <span>Inspect Resource Profile</span>
              <button
                type="button"
                onClick={() => setSelectedResourceId(null)}
                className="p-1 hover:bg-slate-200 rounded border border-slate-300 hover:border-black cursor-pointer text-black"
                title="Collapse drawer view"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" id="scrolling-profile-details">
              
              {/* Core fields */}
              <div className="space-y-3">
                
                <div>
                  <label className="block text-[9px] font-mono font-black text-slate-400 mb-1 uppercase tracking-tight">Active Title Name</label>
                  <input 
                    type="text"
                    value={selectedResource.title}
                    onChange={(e) => onUpdateResource(selectedResource.id, { title: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-black text-slate-900 font-black text-xs rounded-lg px-3 py-2 outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-black text-slate-400 mb-1 uppercase tracking-tight">Target URL Resource</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={selectedResource.url}
                      onChange={(e) => onUpdateResource(selectedResource.id, { url: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-black text-slate-800 font-mono text-[11px] rounded-lg pl-3 pr-1 py-1.5 outline-none focus:bg-white"
                    />
                    {selectedResource.url && (
                      <a 
                        href={selectedResource.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="absolute right-2 top-2 p-0.5 bg-white border border-slate-300 hover:border-black text-slate-600 rounded"
                        title="Open Link"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 select-none">
                  <div>
                    <label className="block text-[9px] font-mono font-black text-slate-400 mb-1 uppercase tracking-tight">Classification Status</label>
                    <select
                      value={selectedResource.status}
                      onChange={(e) => onUpdateResource(selectedResource.id, { status: e.target.value as ResourceStatus })}
                      className="w-full bg-slate-50 border-2 border-black rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-800"
                    >
                      <option value="inbox">INBOX</option>
                      <option value="experimental">EXPERIMENTAL</option>
                      <option value="tested">TESTED</option>
                      <option value="trusted">TRUSTED</option>
                      <option value="archived">ARCHIVED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-black text-slate-400 mb-1 uppercase tracking-tight">Resource Base Type</label>
                    <select
                      value={selectedResource.type}
                      onChange={(e) => onUpdateResource(selectedResource.id, { type: e.target.value as ResourceType })}
                      className="w-full bg-slate-50 border-2 border-black rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-800"
                    >
                      <option value="link">Link</option>
                      <option value="article">Article</option>
                      <option value="video">Video</option>
                      <option value="tool">Tool</option>
                      <option value="note">Note</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-black text-slate-400 mb-1 uppercase tracking-tight">Short Abstract / Summary</label>
                  <textarea 
                    rows={3}
                    value={selectedResource.shortSummary || ''}
                    onChange={(e) => onUpdateResource(selectedResource.id, { shortSummary: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-black text-slate-900 font-medium text-xs rounded-lg px-3 py-2 outline-none focus:bg-white resize-none"
                    placeholder="Briefly state key concepts of this resource..."
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-black text-slate-400 mb-1 uppercase tracking-tight">Detailed Notes & Logs</label>
                  <textarea 
                    rows={4}
                    value={selectedResource.notes || ''}
                    onChange={(e) => onUpdateResource(selectedResource.id, { notes: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-black text-slate-900 font-medium text-xs rounded-lg px-3 py-2 outline-none focus:bg-white resize-none"
                    placeholder="Keep reference links, commands, installation guides here..."
                  />
                </div>

                {/* Tags custom tag adder interface */}
                <div>
                  <label className="block text-[9px] font-mono font-black text-slate-400 mb-1 uppercase tracking-tight">Tag Categories</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedResource.tags?.map((tag) => (
                      <span 
                        key={tag}
                        onClick={() => {
                          const updated = selectedResource.tags.filter(t => t !== tag);
                          onUpdateResource(selectedResource.id, { tags: updated });
                        }}
                        className="px-2 py-0.5 bg-blue-50 border border-blue-300 rounded text-[9px] font-mono text-blue-700 font-bold flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-650 hover:border-red-300"
                        title="Click to remove tag"
                      >
                        <span>#{tag}</span>
                        <span className="text-[7px]">×</span>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 select-none">
                    <input 
                      type="text" 
                      placeholder="Add tag name..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          e.preventDefault();
                          const val = newTagInput.trim().toLowerCase();
                          if (!selectedResource.tags.includes(val)) {
                            onUpdateResource(selectedResource.id, { tags: [...selectedResource.tags, val] });
                          }
                          setNewTagInput('');
                        }
                      }}
                      className="flex-1 bg-slate-50 border border-slate-350 hover:border-black rounded px-2 py-1 text-[10px] outline-none"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (newTagInput.trim()) {
                          const val = newTagInput.trim().toLowerCase();
                          if (!selectedResource.tags.includes(val)) {
                            onUpdateResource(selectedResource.id, { tags: [...selectedResource.tags, val] });
                          }
                          setNewTagInput('');
                        }
                      }}
                      className="bg-black text-white hover:bg-slate-800 border border-black rounded px-2.5 py-1 text-[10px] font-mono font-black cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* DECISION ACTION MATCHING WORKFLOWS */}
                <div className="border-t border-slate-200 pt-4 bg-purple-50/50 p-3 rounded-lg border-2 border-dashed border-purple-200 select-none">
                  <h3 className="font-bold text-black flex items-center gap-1.5 uppercase font-mono tracking-tight text-[10px] mb-2 text-purple-950">
                    <FolderPlus className="w-4 h-4 text-purple-600" />
                    Move to Canvas Workspace
                  </h3>
                  
                  <p className="text-[9px] text-purple-800 leading-tight mb-2.5">
                    Generate a blueprint node matching this resource directly inside any of your active architectures!
                  </p>

                  {workflows.length > 0 ? (
                    <div className="space-y-2">
                      <div className="max-h-40 overflow-y-auto border border-purple-200 rounded-lg bg-white p-1 space-y-1">
                        {workflows.map((wf) => {
                          const isTargetingThis = confirmMoveToWorkflowId === wf.id;
                          return (
                            <div key={wf.id} className={`p-1.5 rounded transition-all ${isTargetingThis ? 'bg-purple-100 border border-purple-300 shadow-sm' : 'hover:bg-purple-50 hover:border-purple-205 border border-transparent'}`}>
                              {!isTargetingThis ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmMoveToWorkflowId(wf.id)}
                                  className="w-full text-left font-mono font-bold text-[10px] text-purple-900 flex items-center justify-between gap-1 cursor-pointer"
                                >
                                  <span className="truncate">📁 {wf.title}</span>
                                  <span className="text-[8px] bg-purple-100 px-1 py-0.5 rounded text-purple-800 shrink-0 uppercase font-black">MOVE</span>
                                </button>
                              ) : (
                                <div className="flex flex-col gap-1.5 p-0.5">
                                  <div className="text-[9px] font-sans font-extrabold text-purple-950 flex items-center justify-between">
                                    <span>Move to "{wf.title}"?</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onMoveToWorkflow(selectedResource.id, wf.id);
                                        setSelectedResourceId(null);
                                        setConfirmMoveToWorkflowId(null);
                                      }}
                                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-mono text-[9px] font-black py-1 px-1.5 rounded border border-purple-700 cursor-pointer text-center uppercase"
                                    >
                                      Confirm Move
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmMoveToWorkflowId(null)}
                                      className="bg-white hover:bg-slate-50 text-slate-600 font-mono text-[9px] py-1 px-2 rounded border border-slate-300 cursor-pointer"
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
                    <span className="text-[9px] font-mono text-slate-400 uppercase">Create at least one workspace directory first</span>
                  )}
                </div>

              </div>
            </div>
          </div>
        ) : null}

      </div>

    </div>
  );
}
