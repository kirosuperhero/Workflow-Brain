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
  RotateCcw,
  Upload,
  Bookmark,
  Copy,
  Folder
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

  // Bookmarks Import Panel States
  const [captureMode, setCaptureMode] = useState<'quick' | 'bookmarks'>('quick');
  const [importStatus, setImportStatus] = useState<'idle' | 'parsed' | 'analyzing' | 'done'>('idle');
  const [tempParsedResources, setTempParsedResources] = useState<any[]>([]);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [selectedImportIndices, setSelectedImportIndices] = useState<number[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importError, setImportError] = useState('');

  // Heuristics Link Parsing & Deep Analysis Engine
  const analyzeLink = (url: string, bookmarkTitle: string): Omit<QueueResource, 'id' | 'createdAt' | 'updatedAt'> => {
    const rawTitle = bookmarkTitle?.trim() || 'Untitled Linked Resource';
    const cleanUrl = url.trim();
    
    let detectedType: ResourceType = 'link';
    let summaryDetail = '';
    const tags: string[] = [];

    // URL Parsing heuristics
    const lowUrl = cleanUrl.toLowerCase();
    const lowTitle = rawTitle.toLowerCase();

    // Group 1: Video
    if (
      lowUrl.includes('youtube.com') || 
      lowUrl.includes('youtu.be') || 
      lowUrl.includes('vimeo.com') || 
      lowUrl.includes('twitch.tv') ||
      lowTitle.includes('video') ||
      lowTitle.includes('tutorial video') ||
      lowTitle.includes('youtube')
    ) {
      detectedType = 'video';
      summaryDetail = `Video media asset: "${rawTitle}". Categorized for interactive/audio-visual review on the workflow canvas.`;
      tags.push('video');
      if (lowUrl.includes('youtube') || lowUrl.includes('youtu.be')) tags.push('youtube');
    }
    // Group 2: Tool
    else if (
      lowUrl.includes('github.com') || 
      lowUrl.includes('npmjs.com') || 
      lowUrl.includes('stackoverflow.com') || 
      lowUrl.includes('codepen.io') ||
      lowUrl.includes('figma.com') ||
      lowUrl.includes('api.') ||
      lowUrl.includes('localhost') ||
      lowUrl.includes('developer.') ||
      lowTitle.includes('tool') ||
      lowTitle.includes('api') ||
      lowTitle.includes('npm') ||
      lowTitle.includes('github') ||
      lowTitle.includes('framework') ||
      lowTitle.includes('compiler') ||
      lowTitle.includes('dev tools') ||
      lowTitle.includes('library') ||
      lowTitle.includes('engine')
    ) {
      detectedType = 'tool';
      summaryDetail = `Active software tool / development resource: "${rawTitle}". Integrated for developer environment, API calls, or builders.`;
      tags.push('tool');
      if (lowUrl.includes('github')) tags.push('github');
      if (lowUrl.includes('npm')) tags.push('npm');
    }
    // Group 3: Article / Paper / Documentation
    else if (
      lowUrl.includes('medium.com') || 
      lowUrl.includes('substack.com') || 
      lowUrl.includes('wikipedia.org') || 
      lowUrl.includes('dev.to') || 
      lowUrl.includes('blog') ||
      lowUrl.includes('/docs/') ||
      lowUrl.includes('/wiki/') ||
      lowUrl.includes('documentation') ||
      lowTitle.includes('blog') ||
      lowTitle.includes('article') ||
      lowTitle.includes('documentation') ||
      lowTitle.includes('docs') ||
      lowTitle.includes('tutorial') ||
      lowTitle.includes('paper') ||
      lowTitle.includes('guide') ||
      lowTitle.includes('handbook')
    ) {
      detectedType = 'article';
      summaryDetail = `Written reference resource: "${rawTitle}". Analyzed as critical documentation, manual, or technical walkthrough.`;
      tags.push('article');
      if (lowUrl.includes('docs') || lowTitle.includes('docs')) tags.push('documentation');
    }
    // Group 4: Standard URL link
    else {
      detectedType = 'link';
      summaryDetail = `Interactive Web bookmark: "${rawTitle}". Added through collective import list and prepared for canvas organization.`;
      tags.push('link');
    }

    // Dynamic auto-tagger based on common web keywords
    const keywords = [
      'react', 'vue', 'angular', 'typescript', 'javascript', 'css', 'tailwind', 
      'node', 'database', 'postgres', 'sql', 'firebase', 'rust', 'go', 'python', 
      'ai', 'gcp', 'docker', 'graphql', 'auth', 'security', 'animation', 'chart', 
      'map', 'canvas', 'design', 'test', 'machine learning', 'api', 'web3', 'blockchain'
    ];
    keywords.forEach(kw => {
      if (lowTitle.includes(kw) || lowUrl.includes(kw)) {
        if (!tags.includes(kw)) tags.push(kw);
      }
    });

    // Extract potential domain label for tag
    try {
      const hostname = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`).hostname;
      const cleanDomain = hostname.replace('www.', '').split('.')[0];
      if (cleanDomain && cleanDomain.length > 2 && !tags.includes(cleanDomain)) {
        tags.push(cleanDomain);
      }
    } catch {
      // fallback
    }

    // Determine logical initial rating based on domain prestige
    let rating = 3;
    if (
      lowUrl.includes('github.com') || 
      lowUrl.includes('developer.google') || 
      lowUrl.includes('react.dev') || 
      lowUrl.includes('npmjs.com') ||
      lowUrl.includes('stackoverflow.com')
    ) {
      rating = 5;
    } else if (lowTitle.includes('awesome') || lowTitle.includes('official') || lowUrl.includes('.org') || lowUrl.includes('.gov')) {
      rating = 4;
    }

    return {
      title: rawTitle,
      url: cleanUrl,
      type: detectedType,
      shortSummary: summaryDetail,
      tags,
      rating,
      notes: `Imported and Analyzed via Web Bookmarks File. Checked on: ${new Date().toLocaleDateString()}\nURL: ${cleanUrl}`,
      status: 'inbox' as ResourceStatus
    };
  };

  const handleBookmarkFileImport = (file: File) => {
    setImportError('');
    setImportStatus('idle');
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setImportError('Invalid or empty file uploaded.');
        return;
      }

      const tempParsed: any[] = [];
      
      // 1. Try JSON
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        try {
          const parsedJson = JSON.parse(text);
          if (Array.isArray(parsedJson)) {
            parsedJson.forEach(item => {
              if (typeof item === 'string' && item.startsWith('http')) {
                tempParsed.push({ url: item, title: item });
              } else if (item && typeof item === 'object') {
                const url = item.url || item.href || item.link;
                const title = item.title || item.name || url;
                if (url) tempParsed.push({ url, title });
              }
            });
          } else if (parsedJson && typeof parsedJson === 'object') {
            const urls = parsedJson.urls || parsedJson.bookmarks || parsedJson.links;
            if (Array.isArray(urls)) {
              urls.forEach(item => {
                if (typeof item === 'string') tempParsed.push({ url: item, title: item });
                else if (item && typeof item === 'object') {
                  const url = item.url || item.href || item.link;
                  const title = item.title || item.name || url;
                  if (url) tempParsed.push({ url, title });
                }
              });
            }
          }
        } catch {
          // ignore error and proceed to HTML regex parsing
        }
      }

      // 2. Try HTML Bookmarks Regex (Netscape format)
      if (tempParsed.length === 0) {
        const aTagRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = aTagRegex.exec(text)) !== null) {
          const url = match[1];
          const rawTitle = match[2] ? match[2].replace(/<[^>]*>/g, '').trim() : '';
          if (url && (url.startsWith('http') || url.includes('.'))) {
            tempParsed.push({ url, title: rawTitle || url });
          }
        }
      }

      // 3. Fallback: Parse line-by-line TXT for URLs
      if (tempParsed.length === 0) {
        const lines = text.split('\n');
        const urlRegex = /(https?:\/\/[^\s"']+(?:(?:\/[^\s"']*)|(?:\?[^\s"']*))?)/gi;
        lines.forEach(line => {
          let lineMatch;
          while ((lineMatch = urlRegex.exec(line)) !== null) {
            const parsedUrl = lineMatch[1];
            let name = 'Resource Link';
            try {
              name = new URL(parsedUrl).hostname.replace('www.', '');
            } catch {
              // fallback
            }
            tempParsed.push({ url: parsedUrl, title: name });
          }
        });
      }

      if (tempParsed.length === 0) {
        setImportError('No valid bookmark links or URLs detected in file. Ensure you export valid Chrome bookmarks (.html) or supply raw URL links list.');
        return;
      }

      // Analyze every parsed link inline
      const processed = tempParsed.map((item, idx) => {
        const analyzed = analyzeLink(item.url, item.title);
        return {
          ...analyzed,
          id_temp: idx,
        };
      });

      setTempParsedResources(processed);
      setSelectedImportIndices(processed.map((_, i) => i));
      setImportStatus('parsed');
      setAnalysisLogs([`Successfully parsed files content. Located ${processed.length} bookmarks. Review the auto-generated analysis below!`]);
    };

    reader.onerror = () => {
      setImportError('Failed to read file.');
    };

    reader.readAsText(file);
  };

  const executeAnalysisImport = () => {
    if (selectedImportIndices.length === 0) {
      setImportError('Please select at least one parsed bookmark to import.');
      return;
    }

    setImportStatus('analyzing');
    setAnalysisLogs([`Initializing system parser...`, `Analyzing and importing ${selectedImportIndices.length} web resources...`]);

    let currentIndex = 0;
    const batchInterval = setInterval(() => {
      if (currentIndex >= selectedImportIndices.length) {
        clearInterval(batchInterval);
        setImportStatus('done');
        setAnalysisLogs(prev => [
          ...prev, 
          `🚀 EXCELLENT: ${selectedImportIndices.length} bookmarks successfully parsed, analyzed, and injected into your Active Inbox Queue!`
        ]);
        
        // Timeout to return back safely
        setTimeout(() => {
          setTempParsedResources([]);
          setSelectedImportIndices([]);
          setImportStatus('idle');
          setCaptureMode('quick');
        }, 1600);
        return;
      }

      const tempIdx = selectedImportIndices[currentIndex];
      const res = tempParsedResources[tempIdx];
      if (res) {
        onAddResource({
          title: res.title,
          url: res.url,
          type: res.type,
          shortSummary: res.shortSummary,
          tags: res.tags,
          rating: res.rating,
          notes: res.notes,
          status: 'inbox' as ResourceStatus
        });

        setAnalysisLogs(prev => [
          ...prev,
          `✓ Analyzed & Registered [#${currentIndex + 1}] (${res.type.toUpperCase()}) | Tags: [${res.tags.slice(0, 3).map(t => '#' + t).join(', ')}] | Title: "${res.title.substring(0, 42)}"`
        ]);
      }
      currentIndex++;
    }, 120); // Sequence animations visually!
  };

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [subviewTab, setSubviewTab] = useState<'study_queue' | 'check_later'>('study_queue');

  // Active review drawer/modal state
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [confirmMoveToWorkflowId, setConfirmMoveToWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    setConfirmMoveToWorkflowId(null);
  }, [selectedResourceId]);
  
  // Custom tag creation inline
  const [newTagInput, setNewTagInput] = useState('');

  // Multi-bookmark subgroup state variables
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLinkToResourceId, setAddingLinkToResourceId] = useState<string | null>(null);
  const [popupBlockedFolderId, setPopupBlockedFolderId] = useState<string | null>(null);
  const [copiedFolderId, setCopiedFolderId] = useState<string | null>(null);
  const [editingSubLinkId, setEditingSubLinkId] = useState<string | null>(null);
  const [editingSubLinkTitle, setEditingSubLinkTitle] = useState('');
  const [editingSubLinkUrl, setEditingSubLinkUrl] = useState('');

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
      status: subviewTab === 'check_later' ? 'check_later' : 'inbox'
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
      case 'check_later': return 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]';
      default: return 'bg-slate-50 text-slate-700 border-slate-300';
    }
  };

  // Filtered resources inventory
  const filteredResources = resources.filter(res => {
    // Separate active study list from check later bookmarks
    if (subviewTab === 'check_later') {
      if (res.status !== 'check_later') return false;
    } else {
      // Study queue active tab
      if (res.status === 'check_later') return false;
      if (statusFilter !== 'all' && res.status !== statusFilter) return false;
    }

    if (typeFilter !== 'all' && res.type !== typeFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const titleMatch = res.title?.toLowerCase().includes(q);
      const summaryMatch = res.shortSummary?.toLowerCase().includes(q);
      const urlMatch = res.url?.toLowerCase().includes(q);
      const tagsMatch = res.tags?.some(t => t.toLowerCase().includes(q));
      
      // search inside additional bookmark links inside folders
      const subLinksMatch = res.additionalLinks?.some(
        sub => sub.title.toLowerCase().includes(q) || sub.url.toLowerCase().includes(q)
      );

      return titleMatch || summaryMatch || urlMatch || tagsMatch || subLinksMatch;
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

        {/* Multi-Format Capture & Bookmarks Deep Analysis Panel */}
        <div className="bg-slate-50 border-2 border-black p-3 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col gap-2" id="quick-capture-panel">
          {/* Top visual switcher tabs */}
          <div className="flex border-b-2 border-slate-200 select-none pb-1.5 justify-between items-center">
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setCaptureMode('quick')}
                className={`text-[9px] font-mono font-black uppercase tracking-wider pb-1 hover:text-blue-700 cursor-pointer border-b-2 transition-all ${captureMode === 'quick' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-400'}`}
              >
                ⚡ Quick Capture
              </button>
              <button 
                type="button"
                onClick={() => setCaptureMode('bookmarks')}
                className={`text-[9px] font-mono font-black uppercase tracking-wider pb-1 hover:text-purple-800 cursor-pointer border-b-2 transition-all flex items-center gap-1 ${captureMode === 'bookmarks' ? 'border-purple-700 text-purple-705 font-extrabold' : 'border-transparent text-slate-400'}`}
              >
                📁 Import Bookmarks
              </button>
            </div>
            {captureMode === 'bookmarks' && tempParsedResources.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTempParsedResources([]);
                  setSelectedImportIndices([]);
                  setImportStatus('idle');
                  setImportError('');
                }}
                className="text-[8px] font-mono bg-slate-200 hover:bg-slate-300 border border-slate-400 text-slate-700 rounded px-1 cursor-pointer font-bold"
              >
                RESET
              </button>
            )}
          </div>
          
          {captureMode === 'quick' ? (
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
                    className="bg-white border border-slate-300 hover:border-black focus:border-black rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-800 outline-none"
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
          ) : (
            // Bookmark import file layout
            <div className="space-y-2 text-[11px]">
              {importStatus === 'idle' && (
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleBookmarkFileImport(file);
                  }}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDragOver ? 'bg-purple-100 border-purple-700' : 'bg-white hover:bg-purple-50/40 border-slate-300 hover:border-purple-300'}`}
                  id="drag-bookmarks-zone"
                  onClick={() => document.getElementById('bookmarks-file-uploader')?.click()}
                >
                  <Upload className="w-5 h-5 text-purple-600 mx-auto mb-1 animate-bounce" style={{ animationDuration: '3s' }} />
                  <p className="font-mono font-bold text-[9px] text-purple-950 uppercase">Drag & Drop Bookmarks</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Supports Chrome HTML, txt URL lists, or bookmarks JSON</p>
                  
                  <input 
                    type="file" 
                    id="bookmarks-file-uploader" 
                    className="hidden" 
                    accept=".html,.txt,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBookmarkFileImport(file);
                    }}
                  />
                  
                  <button 
                    type="button" 
                    className="mt-2 bg-white hover:bg-purple-100 border border-purple-400 rounded px-2 py-0.5 text-[9px] font-mono font-black uppercase text-purple-800"
                  >
                    Select Bookmark File
                  </button>
                </div>
              )}

              {importError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-[9px] font-mono font-bold leading-tight">
                  ⚠️ {importError}
                </div>
              )}

              {/* Parsed list for interactive audit & analytics layout */}
              {importStatus === 'parsed' && tempParsedResources.length > 0 && (
                <div className="space-y-2 animate-fade-in" id="bookmarks-parsing-audit-view">
                  <div className="flex items-center justify-between text-[8px] font-mono text-purple-950 font-black border-b border-purple-100 pb-1.5">
                    <span>📑 PARSED: {tempParsedResources.length} LINKS</span>
                    <div className="flex gap-1">
                      <button 
                        type="button"
                        onClick={() => setSelectedImportIndices(tempParsedResources.map((_, i) => i))}
                        className="text-purple-600 hover:text-black uppercase"
                      >
                        ALL
                      </button>
                      <span className="text-slate-300">|</span>
                      <button 
                        type="button"
                        onClick={() => setSelectedImportIndices([])}
                        className="text-purple-600 hover:text-black uppercase"
                      >
                        NONE
                      </button>
                    </div>
                  </div>

                  {/* Bookmark lists container */}
                  <div className="max-h-24 overflow-y-auto space-y-1 bg-white border border-slate-205 rounded p-1" id="bookmarks-preview-scroll">
                    {tempParsedResources.map((res, i) => {
                      const isSelected = selectedImportIndices.includes(i);
                      return (
                        <div 
                          key={i} 
                          className={`flex items-start gap-1 p-1 rounded border text-[9px] transition-colors ${isSelected ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50 border-transparent opacity-60'}`}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedImportIndices(selectedImportIndices.filter(idx => idx !== i));
                              } else {
                                setSelectedImportIndices([...selectedImportIndices, i]);
                              }
                            }}
                            className="mt-0.5 cursor-pointer accent-purple-700"
                          />
                          <div className="flex-1 min-w-0" onClick={() => {
                            if (isSelected) {
                              setSelectedImportIndices(selectedImportIndices.filter(idx => idx !== i));
                            } else {
                              setSelectedImportIndices([...selectedImportIndices, i]);
                            }
                          }}>
                            <div className="font-bold text-slate-800 truncate" title={res.title}>{res.title}</div>
                            <div className="text-[7.5px] font-mono text-slate-400 truncate leading-none">{res.url}</div>
                            <div className="flex gap-1 mt-0.5 items-center">
                              <span className="text-[7px] uppercase font-mono px-1 py-0.2 bg-purple-100 border border-purple-200 text-purple-800 rounded">
                                {res.type}
                              </span>
                              <span className="text-[7.5px] font-mono text-slate-500">
                                {res.tags.slice(0, 2).map((t: string) => '#' + t).join(' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bulk run trigger button */}
                  <button
                    type="button"
                    onClick={executeAnalysisImport}
                    disabled={selectedImportIndices.length === 0}
                    className="w-full bg-purple-700 hover:bg-purple-850 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white border-2 border-black rounded-lg p-2 font-mono font-black shadow-[3px_3px_0px_#000] tracking-wider active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] cursor-pointer text-center uppercase text-[10px] transition-all"
                  >
                    🚀 Analyze & Keep ({selectedImportIndices.length}) Cards
                  </button>
                  <p className="text-[8px] font-mono font-bold text-slate-400 text-center leading-normal">
                    *Will automatically crawl structure, write abstracts, calculate ratings & sort types!
                  </p>
                </div>
              )}

              {/* Executing visual processing terminal logs! */}
              {(importStatus === 'analyzing' || importStatus === 'done') && (
                <div className="bg-slate-900 border-2 border-slate-950 p-2.5 rounded-lg text-emerald-400 font-mono text-[8px] space-y-1.5 shadow-[inner_0px_2px_4px_rgba(0,0,0,0.6)] animate-pulse" id="analysis-real-time-terminal">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[7.5px] text-slate-450 uppercase font-black">
                    <span>⚙️ ANALYTICAL ENGINE LOGS</span>
                    <span className="animate-ping rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </div>
                  <div className="h-28 overflow-y-auto space-y-1 select-text scrollbar-thin scrollbar-thumb-emerald-800" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
                    {analysisLogs.map((log, lIdx) => (
                      <div key={lIdx} className="leading-snug">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters Panel */}
        <div className="border border-slate-200 bg-slate-50/50 p-2.5 rounded-lg select-none" id="queue-filter-panel">
          <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider mb-2">Filter by Status:</span>
          <div className="flex flex-wrap gap-1 mb-3">
            {(['all', 'inbox', 'experimental', 'tested', 'trusted', 'check_later', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  if (status === 'check_later') {
                    setSubviewTab('check_later');
                  } else {
                    setSubviewTab('study_queue');
                  }
                }}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors cursor-pointer uppercase ${
                  status === 'check_later' ? 'border-[#F59E0B]/50' : ''
                } ${
                  statusFilter === status
                    ? 'bg-black text-white border-black font-black shadow-[1px_1px_0px_#000]'
                    : status === 'check_later'
                      ? 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border-[#F59E0B]'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {status === 'check_later' ? '📚 CHECK LATER' : status.toUpperCase()}
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
          
          {/* Segmented Subview Tabs at the top */}
          <div className="flex bg-slate-200/70 p-1.5 rounded-lg border border-slate-300 gap-1.5 mb-3 self-start select-none" id="queue-subview-segmented-tabs">
            <button
              type="button"
              onClick={() => {
                setSubviewTab('study_queue');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold rounded-md transition-all cursor-pointer ${
                subviewTab === 'study_queue'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100/50 hover:text-black'
              }`}
            >
              <span>⚡ Active Study Queue</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubviewTab('check_later');
                setStatusFilter('check_later');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold rounded-md transition-all cursor-pointer ${
                subviewTab === 'check_later'
                  ? 'bg-amber-100 text-amber-950 border border-amber-400 shadow-sm'
                  : 'text-[#92400E]/70 hover:bg-amber-50 hover:text-[#92400E]'
              }`}
            >
              <span>📁 Bookmarks Box (Check Later)</span>
            </button>
          </div>

          {/* Catalog Operations Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 justify-between pb-3 select-none">
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text"
                placeholder={subviewTab === 'check_later' ? "Search folders, custom titles & URLs..." : "Search captured resources..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-black rounded-lg pl-8 pr-3 py-1 text-xs font-semibold text-slate-800 outline-none focus:bg-white"
                id="queue-searchbox"
              />
            </div>

            <div className="flex items-center gap-3">
              {subviewTab === 'check_later' && (
                <button
                  type="button"
                  onClick={() => {
                    onAddResource({
                      title: "New Research Topic Folder",
                      url: "",
                      type: "link",
                      status: "check_later",
                      shortSummary: "A folder group for research links that should be reviewed later.",
                      tags: ["research"],
                      rating: 0,
                      notes: "Bookmarks Folder Group created inside Bookmarks studio.",
                      additionalLinks: []
                    });
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold border border-black rounded px-2.5 py-1 text-[10px] shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer"
                >
                  + Create Bookmark Folder
                </button>
              )}
              <div className="text-[10px] font-mono text-slate-500 font-bold animate-fade-in" id="queue-count-readout">
                {subviewTab === 'check_later' 
                  ? `Showing ${filteredResources.length} folders / topic groups` 
                  : `Showing ${filteredResources.length} of ${resources.filter(r => r.status !== 'check_later').length} active study resources`
                }
              </div>
            </div>
          </div>

          {/* Cards scrolling area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" id="scrolling-inventory-grid">
            {filteredResources.length > 0 ? (
              subviewTab === 'check_later' ? (
                // 📚 BOOKMARKS BOX SPECIAL FOLDER LAYOUT
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4" id="bookmarks-folders-grid">
                  {filteredResources.map((res) => {
                    const totalLinks = res.additionalLinks?.length || 0;
                    const readLinks = res.additionalLinks?.filter(l => l.isRead).length || 0;
                    const percentComplete = totalLinks > 0 ? Math.round((readLinks / totalLinks) * 100) : 0;
                    const dateStr = new Date(res.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit'
                    });

                    return (
                      <div
                        key={res.id}
                        onClick={() => setSelectedResourceId(res.id)}
                        className={`relative p-4 border-2 border-black rounded-r-lg rounded-bl-lg bg-amber-50/50 flex flex-col justify-between gap-4 transition-all hover:bg-amber-50/85 shadow-[4px_4px_0px_#000] focus-within:ring-2 focus-within:ring-amber-500/10 ${
                          selectedResourceId === res.id 
                            ? 'border-amber-600 shadow-[4px_4px_0px_#b45309]' 
                            : 'hover:shadow-[5px_5px_0px_#f59e0b]'
                        }`}
                        style={{ marginTop: '14px' }}
                      >
                        {/* Filing folder tab styling at the top left */}
                        <div className="absolute -top-[23px] left-[-2px] px-3 py-1 bg-amber-100 hover:bg-amber-200 border-t-2 border-x-2 border-black rounded-t-lg text-[9px] font-mono font-black text-[#92400E] select-none flex items-center gap-1.5 transition-colors">
                          <Folder className="w-3" />
                          <span>📚 RESEARCH FOLDER</span>
                        </div>

                        <div className="space-y-3 mt-1">
                          {/* Folder Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={res.title}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => onUpdateResource(res.id, { title: e.target.value })}
                                className="font-extrabold text-xs text-black bg-transparent border-b border-transparent hover:border-black/30 focus:border-black focus:bg-white outline-none px-0.5 rounded w-full"
                                title="Edit Folder Title"
                              />
                              <input
                                type="text"
                                placeholder="Add folder description or reference goals..."
                                value={res.shortSummary || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => onUpdateResource(res.id, { shortSummary: e.target.value })}
                                className="text-[10px] text-slate-500 font-medium block bg-transparent placeholder-slate-400 border-b border-transparent hover:border-black/20 focus:border-black focus:bg-white outline-none w-full mt-1 rounded"
                                title="Edit Folder Description"
                              />
                            </div>
                            
                            {/* Progress counter */}
                            {totalLinks > 0 && (
                              <div className="flex flex-col items-end gap-1 bg-amber-100/60 border border-amber-300 p-1 px-1.5 rounded-md shrink-0 select-none">
                                <span className="text-[8px] font-mono font-black text-amber-900">{readLinks}/{totalLinks} READ ({percentComplete}%)</span>
                                <div className="w-16 bg-slate-300 rounded-full h-1 overflow-hidden">
                                  <div className="bg-emerald-605 h-1 bg-emerald-650 h-full rounded-full transition-all" style={{ width: `${percentComplete}%`, backgroundColor: '#10b981' }}></div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Add Link To Folder Form */}
                          <div 
                            className="bg-white border-2 border-black p-2 rounded-lg space-y-1.5 shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="block text-[8px] font-mono font-black text-amber-800 uppercase tracking-tight">Quick Add Link inside:</span>
                            <input
                              type="text"
                              placeholder="Bookmark Title (e.g. NextJS Optimization Docs)"
                              value={addingLinkToResourceId === res.id ? newLinkTitle : ''}
                              onChange={(e) => {
                                setAddingLinkToResourceId(res.id);
                                setNewLinkTitle(e.target.value);
                              }}
                              className="w-full bg-slate-50 hover:bg-white border border-slate-305 focus:border-black rounded px-2 py-0.5 text-[10px] outline-none font-semibold text-slate-850"
                            />
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="https://..."
                                value={addingLinkToResourceId === res.id ? newLinkUrl : ''}
                                onChange={(e) => {
                                  setAddingLinkToResourceId(res.id);
                                  setNewLinkUrl(e.target.value);
                                }}
                                className="flex-1 bg-slate-50 hover:bg-white border border-slate-305 focus:border-black rounded px-2 py-0.5 text-[9.5px] outline-none font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newLinkUrl.trim()) return;
                                  const linkTitle = newLinkTitle.trim() || 'Bookmarked Reference';
                                  const linkUrl = newLinkUrl.trim().startsWith('http') ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`;
                                  const existingLinks = res.additionalLinks || [];
                                  onUpdateResource(res.id, {
                                    additionalLinks: [
                                      ...existingLinks,
                                      { 
                                        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5), 
                                        title: linkTitle, 
                                        url: linkUrl,
                                        addedAt: new Date().toISOString(),
                                        isRead: false 
                                      }
                                    ]
                                  });
                                  setNewLinkTitle('');
                                  setNewLinkUrl('');
                                  setAddingLinkToResourceId(null);
                                }}
                                className="bg-black text-white px-2.5 py-0.5 rounded text-[10px] font-mono font-black border border-black hover:bg-slate-800 transition-all cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>

                          {/* Nested Checklist links */}
                          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                            {res.additionalLinks && res.additionalLinks.length > 0 ? (
                              <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5" id={`folders-links-scroll-${res.id}`}>
                                {res.additionalLinks.map((subLink) => {
                                  const isEditing = editingSubLinkId === subLink.id;
                                  
                                  if (isEditing) {
                                    return (
                                      <div 
                                        key={subLink.id} 
                                        className="flex flex-col gap-1.5 p-2 bg-amber-50 border border-amber-400 rounded text-xs select-text shadow-inner"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="flex gap-1 items-center justify-between">
                                          <span className="text-[8px] font-mono font-black text-amber-850 uppercase tracking-tight">Edit Reference Link:</span>
                                          <div className="flex gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedLinks = res.additionalLinks?.map(l => 
                                                  l.id === subLink.id 
                                                    ? { 
                                                        ...l, 
                                                        title: editingSubLinkTitle.trim() || 'Bookmarked Reference', 
                                                        url: editingSubLinkUrl.trim().startsWith('http') ? editingSubLinkUrl.trim() : `https://${editingSubLinkUrl.trim()}`
                                                      } 
                                                    : l
                                                );
                                                onUpdateResource(res.id, { additionalLinks: updatedLinks });
                                                setEditingSubLinkId(null);
                                              }}
                                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-mono font-bold text-[9px] border border-black cursor-pointer shadow-sm"
                                              title="Save changes"
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingSubLinkId(null)}
                                              className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 rounded font-mono font-bold text-[9px] border border-slate-300 cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <input
                                            type="text"
                                            value={editingSubLinkTitle}
                                            onChange={(e) => setEditingSubLinkTitle(e.target.value)}
                                            placeholder="Title (e.g. NextJS Docs)"
                                            className="w-full bg-white border border-slate-350 focus:border-black rounded px-1.5 py-0.5 text-[10px] outline-none font-semibold text-slate-850"
                                            autoFocus
                                          />
                                          <input
                                            type="text"
                                            value={editingSubLinkUrl}
                                            onChange={(e) => setEditingSubLinkUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-white border border-slate-350 focus:border-black rounded px-1.5 py-0.5 text-[9.5px] outline-none font-mono"
                                          />
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div 
                                      key={subLink.id} 
                                      className={`flex items-center justify-between gap-2 p-1.5 px-2 bg-white border rounded text-xs group/sub hover:border-black transition-all ${
                                        subLink.isRead 
                                          ? 'bg-slate-50/75 border-slate-200 opacity-60 line-through text-slate-400' 
                                          : 'border-slate-250 shadow-sm'
                                      }`}
                                      onDoubleClick={() => {
                                        setEditingSubLinkId(subLink.id);
                                        setEditingSubLinkTitle(subLink.title);
                                        setEditingSubLinkUrl(subLink.url);
                                      }}
                                      title="Double-click to edit name or URL"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={!!subLink.isRead}
                                          onChange={() => {
                                            const updatedLinks = res.additionalLinks?.map(l => 
                                              l.id === subLink.id ? { ...l, isRead: !l.isRead } : l
                                            );
                                            onUpdateResource(res.id, { additionalLinks: updatedLinks });
                                          }}
                                          className="h-3.5 w-3.5 accent-amber-600 rounded bg-slate-50 cursor-pointer"
                                          title={subLink.isRead ? "Mark as unread" : "Mark as read"}
                                        />

                                        <Link2 className={`w-3 h-3 shrink-0 ${subLink.isRead ? 'text-slate-300' : 'text-blue-500'}`} />
                                        <a
                                          href={subLink.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`font-bold hover:text-blue-600 truncate underline text-[10.5px] ${
                                            subLink.isRead ? 'text-slate-400 font-medium' : 'text-slate-800'
                                          }`}
                                          title={subLink.url}
                                        >
                                          {subLink.title}
                                        </a>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSubLinkId(subLink.id);
                                            setEditingSubLinkTitle(subLink.title);
                                            setEditingSubLinkUrl(subLink.url);
                                          }}
                                          className="px-1.5 py-0.2 text-[8px] bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded font-bold cursor-pointer hover:border-black"
                                          title="Edit Name & URL"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(subLink.url);
                                          }}
                                          className="px-1.5 py-0.2 text-[8px] bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded font-bold cursor-pointer"
                                          title="Copy URL"
                                        >
                                          Copy
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const filtered = res.additionalLinks?.filter(l => l.id !== subLink.id);
                                            onUpdateResource(res.id, { additionalLinks: filtered });
                                          }}
                                          className="text-red-500 hover:bg-red-50 p-0.5 rounded cursor-pointer leading-none font-mono text-sm shrink-0"
                                          title="Delete reference"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-[9px] text-[#92400E]/70 font-mono italic select-none bg-amber-50/10 border border-dashed border-amber-300/30 rounded-lg">
                                Folder is empty. Use adding input above!
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive popup blocker helpful warning banner */}
                        {popupBlockedFolderId === res.id && (
                          <div 
                            className="bg-amber-100 border border-amber-400 p-2.5 rounded-lg text-[10px] text-[#78350F] leading-relaxed space-y-1.5 animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between font-black text-amber-900 text-[10px] uppercase tracking-wide">
                              <span>⚠️ Browser blocked tabs from opening</span>
                              <button
                                type="button"
                                onClick={() => setPopupBlockedFolderId(null)}
                                className="text-[#92400E] hover:text-black font-extrabold"
                              >
                                [ Dismiss ]
                              </button>
                            </div>
                            <p>
                              Modern browsers protect you by blocking multiple popups triggered from one click. 
                              To open all <strong>{totalLinks}</strong> links, allow popups for this site in your address bar (look for the "popups blocked" indicator at the top right of your browser, or padlock menu).
                            </p>
                          </div>
                        )}

                        {/* Folder controls */}
                        <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 pb-0.5 text-[9px] font-mono text-[#92400E] select-none gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateResource(res.id, {
                                  status: 'inbox',
                                  updatedAt: new Date().toISOString()
                                });
                                setSubviewTab('study_queue');
                                setStatusFilter('all');
                              }}
                              className="flex items-center gap-1 border border-[#D97706]/30 bg-white hover:bg-black hover:text-white rounded px-2 py-0.5 text-[9px] font-black text-black shadow-sm transition-all cursor-pointer"
                              title="Promote bookmarks group to daily review inbox queue"
                            >
                              <span>⚡ Promote to study Queue</span>
                            </button>

                            {totalLinks > 0 && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    let blockedDetected = false;
                                    res.additionalLinks?.forEach((link) => {
                                      if (link.url) {
                                        try {
                                          const win = window.open(link.url, '_blank', 'noopener,noreferrer');
                                          // If browser blocked it, window.open returns null/undefined
                                          if (!win || win.closed || typeof win.closed === 'undefined') {
                                            blockedDetected = true;
                                          }
                                        } catch (err) {
                                          blockedDetected = true;
                                        }
                                      }
                                    });
                                    if (blockedDetected) {
                                      setPopupBlockedFolderId(res.id);
                                    } else {
                                      setPopupBlockedFolderId(null);
                                    }
                                  }}
                                  className="flex items-center gap-1 border border-amber-500 bg-[#FFFBEB] hover:bg-amber-100 text-[#92400E] hover:text-black rounded px-2 py-0.5 text-[9px] font-black shadow-sm transition-all cursor-pointer"
                                  title="Open all bookmarked links"
                                >
                                  🌍 Open All ({totalLinks})
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const text = res.additionalLinks?.map(l => l.url).filter(Boolean).join('\n') || '';
                                    if (text) {
                                      navigator.clipboard.writeText(text);
                                      setCopiedFolderId(res.id);
                                      setTimeout(() => setCopiedFolderId(null), 1500);
                                    }
                                  }}
                                  className="border border-amber-500 bg-white hover:bg-amber-50 text-[#92400E] hover:text-black rounded px-2 py-0.5 text-[9px] font-black shadow-sm transition-all cursor-pointer min-w-[55px] text-center"
                                  title="Copy all bookmark links to clipboard"
                                >
                                  {copiedFolderId === res.id ? '✓ Copied!' : '📋 Copy All'}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[7.5px] text-slate-400 font-mono">Created {dateStr}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteResource(res.id);
                                if (selectedResourceId === res.id) setSelectedResourceId(null);
                              }}
                              className="p-1 text-red-500 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title="Delete bookmark folder group"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                // ⚡ ACTIVE LEARNING CARD GRID 
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

                          {/* Nested loop bookmarks if folder is active */}
                          {res.additionalLinks && res.additionalLinks.length > 0 && (
                            <div className="bg-slate-50 border border-dashed border-slate-300 p-2 rounded-md space-y-1 mt-1 text-[10px]">
                              <span className="block font-mono text-[8px] text-slate-400 uppercase font-black">📂 Folder Bookmark Links</span>
                              {res.additionalLinks.map(subLink => (
                                <div key={subLink.id} className="flex items-center justify-between gap-1">
                                  <a href={subLink.url} target="_blank" rel="noreferrer" className="text-blue-600 truncate hover:underline font-semibold">{subLink.title}</a>
                                  {subLink.isRead && <span className="text-emerald-700 font-extrabold text-[8px] uppercase">READ</span>}
                                </div>
                              ))}
                            </div>
                          )}

                        </div>

                        {/* Footer actions */}
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
                            {/* Downgrade/Move to Bookmark choice button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateResource(res.id, {
                                  status: 'check_later',
                                  updatedAt: new Date().toISOString()
                                });
                                setSubviewTab('check_later');
                                setStatusFilter('check_later');
                              }}
                              className="px-1.5 py-0.5 border border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50 text-[8px] rounded text-[#92400E] font-bold cursor-pointer"
                              title="Move resource to Check Later Bookmarks Box"
                            >
                              📚 Save later
                            </button>

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
              )
            ) : (
              <div className="text-center py-16 text-slate-400 font-mono text-[10px] uppercase border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 p-6 flex flex-col items-center justify-center gap-3">
                <span>
                  {subviewTab === 'check_later' ? "Empty Bookmarks Box. Create a bookmark group folder to begin!" : "No pending active queue resources found."}
                </span>
                {subviewTab === 'check_later' && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddResource({
                        title: "New Research Topic Folder",
                        url: "",
                        type: "link",
                        status: "check_later",
                        shortSummary: "A folder group for research links that should be reviewed later.",
                        tags: ["research"],
                        rating: 0,
                        notes: "Bookmarks Folder Group created inside Bookmarks studio.",
                        additionalLinks: []
                      });
                    }}
                    className="bg-[#FEF3C7] hover:bg-amber-100 border border-amber-400 px-3 py-1.5 text-neutral-800 font-mono font-black rounded-lg shadow-sm cursor-pointer"
                  >
                    + Create Topic Folder
                  </button>
                )}
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
                      <option value="check_later">CHECK LATER 📚</option>
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

                {/* Profile Drawer: Nested Sub-Links Bookmarks system */}
                <div className="bg-amber-50/30 border-2 border-[#F59E0B]/50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-black text-[#92400E] uppercase">
                    <span className="flex items-center gap-1">📂 Folder/Group Links ({selectedResource.additionalLinks?.length || 0})</span>
                  </div>
                  
                  <div className="bg-white border-2 border-slate-900 p-2 rounded-md space-y-1.5 shadow-sm">
                    <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-tight">Add Link to this Folder</span>
                    <input
                      type="text"
                      placeholder="Title (e.g., Guide)"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-white border border-slate-300 focus:border-black rounded px-2 py-1 text-[10px] outline-none font-semibold text-slate-800"
                    />
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="https://..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="flex-1 bg-slate-50 hover:bg-white border border-slate-300 focus:border-black rounded px-2 py-1 text-[9px] outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newLinkUrl.trim()) return;
                          const title = newLinkTitle.trim() || 'Link Reference';
                          const url = newLinkUrl.trim().startsWith('http') ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`;
                          const existingLinks = selectedResource.additionalLinks || [];
                          onUpdateResource(selectedResource.id, {
                            additionalLinks: [
                              ...existingLinks,
                              { id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5), title, url }
                            ]
                          });
                          setNewLinkTitle('');
                          setNewLinkUrl('');
                        }}
                        className="bg-black text-white hover:bg-slate-800 px-2.5 py-1 text-[10px] font-mono font-black border border-black rounded cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {selectedResource.additionalLinks && selectedResource.additionalLinks.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedResource.additionalLinks.map((subLink) => (
                        <div key={subLink.id} className="flex items-center justify-between gap-1.5 p-1 bg-white border border-slate-200 rounded text-[9.5px] group/sub">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-slate-400 shrink-0 select-none">🔗</span>
                            <a
                              href={subLink.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-slate-800 hover:text-blue-600 truncate underline"
                              title={subLink.url}
                            >
                              {subLink.title}
                            </a>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(subLink.url);
                              }}
                              className="px-1 py-0.2 text-[8px] bg-slate-50 hover:bg-slate-100 border border-slate-205 rounded font-bold cursor-pointer"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = selectedResource.additionalLinks?.filter(l => l.id !== subLink.id);
                                onUpdateResource(selectedResource.id, { additionalLinks: filtered });
                              }}
                              className="text-red-500 hover:text-red-700 font-bold px-1 text-[11px] cursor-pointer font-mono shrink-0"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-[9px] text-[#92400E]/70 font-mono italic">
                      No bookmarks saved in this folder group yet.
                    </div>
                  )}
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
                <div 
                  className="border-t border-purple-200 pt-4 bg-gradient-to-br from-purple-50 to-fuchsia-50/70 p-3.5 rounded-lg border-2 border-purple-300 select-none shadow-[3.5px_3.5px_0px_#7c3aed] transition-all hover:scale-[1.01]" 
                  id="workspace-move-panel-container"
                >
                  <h3 className="font-black text-purple-950 flex items-center gap-1.5 uppercase font-mono tracking-wider text-[10px] mb-2">
                    <FolderPlus className="w-4 h-4 text-purple-600 animate-pulse" />
                    Move to Canvas Workspace
                  </h3>
                  
                  <p className="text-[9px] text-purple-800 leading-normal mb-3 font-medium">
                    Convert this inbox item into a dynamic structural node on any active workflow canvas. Sets up dynamic relative lines & pointers automatically!
                  </p>

                  {workflows.length > 0 ? (
                    <div className="space-y-2">
                      <div className="max-h-40 overflow-y-auto border-2 border-purple-300 rounded-lg bg-white p-1 space-y-1 shadow-[inner_0px_1px_2.5px_rgba(0,0,0,0.05)]">
                        {workflows.map((wf) => {
                          const isTargetingThis = confirmMoveToWorkflowId === wf.id;
                          return (
                            <div 
                              key={wf.id} 
                              className={`p-1.5 rounded transition-all ${
                                isTargetingThis 
                                  ? 'bg-purple-100 border border-purple-400 shadow-sm' 
                                  : 'hover:bg-purple-50 hover:border-purple-200 border border-transparent'
                              }`}
                            >
                              {!isTargetingThis ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmMoveToWorkflowId(wf.id)}
                                  className="w-full text-left font-mono font-black text-[10px] text-purple-900 hover:text-purple-705 flex items-center justify-between gap-1.5 cursor-pointer"
                                >
                                  <span className="truncate flex items-center gap-1">
                                    <span>📁</span>
                                    <span>{wf.title}</span>
                                  </span>
                                  <span className="text-[7.5px] bg-purple-600 border border-purple-700 text-white px-1.5 py-0.5 rounded font-mono font-black shrink-0 tracking-wide uppercase shadow-[1px_1px_0px_rgba(0,0,0,0.15)] hover:bg-purple-750 transition-colors">
                                    MOVE TO WORKSPACE
                                  </span>
                                </button>
                              ) : (
                                <div className="flex flex-col gap-1.5 p-0.5">
                                  <div className="text-[9.5px] font-sans font-black text-purple-950 flex items-center justify-between">
                                    <span>Deploy resource on "{wf.title}"?</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onMoveToWorkflow(selectedResource.id, wf.id);
                                        setSelectedResourceId(null);
                                        setConfirmMoveToWorkflowId(null);
                                      }}
                                      className="flex-1 bg-purple-720 hover:bg-purple-800 text-white font-mono text-[9px] font-black py-1 px-1.5 rounded border-2 border-black cursor-pointer text-center uppercase shadow-[1px_1px_0px_#000] active:translate-y-[0.5px]"
                                    >
                                      ✓ Confirm Move
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmMoveToWorkflowId(null)}
                                      className="bg-white hover:bg-slate-100 text-slate-700 font-mono text-[9px] font-bold py-1 px-2 rounded border border-slate-350 cursor-pointer"
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
                    <div className="text-center py-2 bg-slate-100 border border-slate-300 rounded font-mono text-[8.5px] text-slate-450 uppercase font-bold">
                      Create a target workspace directory first
                    </div>
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
