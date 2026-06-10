import React, { useState } from 'react';
import { 
  WorkflowNode, 
  Workflow 
} from '../types';
import { 
  TrendingUp, 
  History, 
  ExternalLink, 
  MapPin, 
  Compass, 
  Calendar,
  Grid,
  Sparkles,
  Link2,
  Folder,
  MousePointerClick,
  BarChart2,
  Bookmark,
  Award
} from 'lucide-react';

interface InsightsDashboardProps {
  nodes: WorkflowNode[];
  workflows: Workflow[];
  onNavigateToWorkspace?: (workflowId: string, nodeId?: string) => void;
}

export default function InsightsDashboard({
  nodes,
  workflows,
  onNavigateToWorkspace
}: InsightsDashboardProps) {
  const [filterType, setFilterType] = useState<'all' | 'tool' | 'link' | 'step'>('all');

  // Find workflow name heler
  const getWorkflowTitle = (id: string) => {
    const wf = workflows.find(w => w.id === id);
    return wf ? wf.title : 'Unknown Workspace';
  };

  // Normalize a name for matching duplications across workspaces
  const normalizeName = (name: string) => {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  };

  // 1. General Stats
  const totalNodes = nodes.length;
  const toolNodes = nodes.filter(n => n.type === 'tool');
  const linkNodes = nodes.filter(n => n.type === 'link');
  const stepNodes = nodes.filter(n => n.type === 'step');
  
  const totalClicks = nodes.reduce((sum, n) => sum + (n.clickCount || 0), 0);
  const clickableNodesCount = nodes.filter(n => !!n.sourceUrl).length;

  // Filter nodes based on type selection for listings
  const listableNodes = nodes.filter(n => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  // 2. Leaderboard of Most Clicked/Used links
  const clickedLeaderboard = [...listableNodes]
    .filter(n => n.sourceUrl)
    .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));

  // 3. Leaderboard of Cross-Workspace Duplicated/Reused Tools ("deep seek in A and B")
  // Group by normalized title
  const toolGroupMap = new Map<string, { 
    title: string; 
    type: string;
    occurrences: { nodeId: string; workflowId: string; title: string; createdAt: string }[];
    totalClicks: number;
    url?: string;
  }>();

  nodes.forEach(n => {
    // Only group named nodes (ignore completely blank or defaults if empty)
    if (!n.title || n.title.trim() === '' || n.title.toLowerCase().startsWith('new ')) return;
    
    // Group everything, but can highlight type === 'tool' specifically
    const key = normalizeName(n.title);
    const existing = toolGroupMap.get(key);
    
    if (existing) {
      existing.occurrences.push({
        nodeId: n.id,
        workflowId: n.workflowId,
        title: n.title,
        createdAt: n.createdAt
      });
      existing.totalClicks += (n.clickCount || 0);
      if (!existing.url && n.sourceUrl) {
        existing.url = n.sourceUrl;
      }
    } else {
      toolGroupMap.set(key, {
        title: n.title,
        type: n.type,
        occurrences: [{
          nodeId: n.id,
          workflowId: n.workflowId,
          title: n.title,
          createdAt: n.createdAt
        }],
        totalClicks: n.clickCount || 0,
        url: n.sourceUrl || undefined
      });
    }
  });

  // Convert to array and filter for those with >= 1 occurrences, sorted by frequency, then clicks
  const crossWorkspaceLeaderboard = Array.from(toolGroupMap.values())
    .filter(g => g.occurrences.length > 0)
    .sort((a, b) => {
      if (b.occurrences.length !== a.occurrences.length) {
        return b.occurrences.length - a.occurrences.length;
      }
      return b.totalClicks - a.totalClicks;
    });

  // 4. Recently Added Tools / Cards with exact creation date
  const timelineNodes = [...listableNodes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15); // Show top 15 recent

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 font-sans select-text" id="insights-dashboard-main">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Hero panel */}
        <div className="bg-white border-2 border-black p-6 rounded-xl shadow-[4px_4px_0px_#000] relative overflow-hidden" id="insights-hero-banner">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 -mr-8 -mt-8 animate-pulse" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-60 -mb-8 animate-pulse" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-block">
                ⚡ BRAIN TELEMETRY
              </span>
              <h2 className="text-xl md:text-2xl font-black text-black uppercase tracking-tight font-sans">
                App-Wide Resource Insights
              </h2>
              <p className="text-xs text-slate-500 font-medium max-w-xl">
                Track tool utilization frequency, link click triggers, timeline creations, and redundant workflow deployments to gauge resource priorities.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-800 text-[10px] font-mono leading-tight max-w-xs shrink-0 self-start md:self-auto">
              <Award className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Click tracking increments dynamically when jumping to documentation pages.</span>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Grid cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard-metric-bento">
          
          <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0px_#000] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black uppercase text-slate-400">Total Cards</span>
              <div className="p-1 bg-slate-100 border border-slate-300 rounded"><Grid className="w-3.5 h-3.5 text-slate-600" /></div>
            </div>
            <div className="mt-2 text-2xl font-black text-black">{totalNodes}</div>
            <div className="mt-1 text-[9px] font-mono text-slate-500 leading-none">
              {toolNodes.length} Tools • {linkNodes.length} Links • {stepNodes.length} Steps
            </div>
          </div>

          <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0px_#000] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black uppercase text-blue-500">Link Clicks</span>
              <div className="p-1 bg-blue-50 border border-blue-300 rounded"><MousePointerClick className="w-3.5 h-3.5 text-blue-600" /></div>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-600">{totalClicks}</div>
            <div className="mt-1 text-[9px] font-mono text-slate-500 leading-none">
              Across {clickableNodesCount} clickable anchors
            </div>
          </div>

          <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0px_#000] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black uppercase text-emerald-500">Workspaces</span>
              <div className="p-1 bg-emerald-50 border border-emerald-300 rounded"><Folder className="w-3.5 h-3.5 text-emerald-600" /></div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700">{workflows.length}</div>
            <div className="mt-1 text-[9px] font-mono text-slate-500 leading-none">
              Active plan collections & categories
            </div>
          </div>

          <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0px_#000] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black uppercase text-purple-500">Reuse Ratio</span>
              <div className="p-1 bg-purple-50 border border-purple-300 rounded"><Bookmark className="w-3.5 h-3.5 text-purple-600" /></div>
            </div>
            <div className="mt-2 text-2xl font-black text-purple-600">
              {totalNodes > 0 ? (100 - Math.round((toolGroupMap.size / totalNodes) * 100)) : 0}%
            </div>
            <div className="mt-1 text-[9px] font-mono text-slate-500 leading-none">
              {toolGroupMap.size} unique resource identities
            </div>
          </div>

        </div>

        {/* Primary Row: Top Used Links (Left) & Cross-Workspace Importance Leaderboard (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="insights-leaderboards-shelf">
          
          {/* Card 1: Click Leaderboard */}
          <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden flex flex-col">
            <div className="p-4 border-b-2 border-black bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-black uppercase font-mono tracking-wider text-black">
                  🔥 Link Frequency Click-Through
                </h3>
              </div>
              <div className="bg-blue-100 text-blue-800 text-[8px] font-mono px-2 py-0.5 rounded border border-blue-300 font-extrabold uppercase">
                Usage Ranking
              </div>
            </div>

            {/* Type selector toggle */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto text-[9px] font-mono">
              <span className="text-slate-400 font-bold uppercase shrink-0">Filter List:</span>
              {(['all', 'tool', 'link', 'step'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 rounded cursor-pointer capitalize font-bold border transition-all ${
                    filterType === t 
                      ? 'bg-black text-white border-black shadow-[1px_1px_0px_#000]' 
                      : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-100'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>

            <div className="p-4 flex-1 space-y-3 max-h-[360px] overflow-y-auto">
              {clickedLeaderboard.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  No clickable links matched this filters settings yet.
                </div>
              ) : (
                clickedLeaderboard.map((item, index) => {
                  const wfName = getWorkflowTitle(item.workflowId);
                  return (
                    <div 
                      key={item.id} 
                      className="group flex items-center justify-between p-3 border-2 border-slate-100 hover:border-black rounded-lg transition-all hover:bg-slate-50"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-slate-100 border border-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-655 font-mono shrink-0">
                            {index + 1}
                          </span>
                          <span className={`text-[8px] uppercase font-mono px-1 border rounded shrink-0 font-bold ${
                            item.type === 'tool' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            item.type === 'link' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                            'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            {item.type}
                          </span>
                          <h4 
                            className="text-xs font-bold text-black truncate cursor-pointer hover:text-blue-600"
                            onClick={() => onNavigateToWorkspace?.(item.workflowId, item.id)}
                            title="Click to jump to workspace card location"
                          >
                            {item.title || 'Untitled Card'}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold font-mono">
                          <Compass className="w-2.5 h-2.5" />
                          <span className="truncate">{wfName}</span>
                          <span>•</span>
                          <span className="text-[8px] truncate">{item.sourceUrl}</span>
                        </div>
                      </div>

                      {/* Score badge indicator */}
                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md font-mono font-black text-xs">
                          {item.clickCount || 0}
                          <span className="text-[8px] text-blue-400 font-bold uppercase">clicks</span>
                        </div>
                        <div className="text-[8px] font-mono font-bold text-slate-400 mt-0.5">
                          Added {formatDate(item.createdAt).split(',')[0]}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Workspace Ubiquity / Cross-Workspace Frequency Leaderboard */}
          <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden flex flex-col">
            <div className="p-4 border-b-2 border-black bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-600 animate-bounce" />
                <h3 className="text-xs font-black uppercase font-mono tracking-wider text-black">
                  🌐 App-Wide Omnipresent Tools
                </h3>
              </div>
              <div className="bg-purple-100 text-purple-800 text-[8px] font-mono px-2 py-0.5 rounded border border-purple-300 font-extrabold uppercase">
                Ubiquity Rank
              </div>
            </div>

            <div className="p-4 flex-1 space-y-3 max-h-[415px] overflow-y-auto">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[9px] text-slate-500 font-mono leading-relaxed mb-1">
                📌 Normalizes resources across separate workspaces. A resource used in 3 workspaces exhibits high versatile value compared to localized custom singletons.
              </div>

              {crossWorkspaceLeaderboard.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  No named cards or tools have been defined yet.
                </div>
              ) : (
                crossWorkspaceLeaderboard.map((item, index) => {
                  const countColor = item.occurrences.length > 2 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    item.occurrences.length > 1 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-slate-50 text-slate-600 border-slate-200';
                  
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col p-3 border-2 border-slate-100 hover:border-violet-300 rounded-lg transition-all hover:bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 bg-slate-100 border border-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 font-mono shrink-0">
                            {index + 1}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 truncate" title={item.title}>
                            {item.title}
                          </h4>
                          <span className={`text-[8px] uppercase font-mono px-1 border rounded shrink-0 font-bold ${
                            item.type === 'tool' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-201 text-slate-600'
                          }`}>
                            {item.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className={`px-2 py-0.5 rounded border text-[9px] font-mono font-black ${countColor}`}>
                            In {item.occurrences.length} {item.occurrences.length === 1 ? 'workspace' : 'workspaces'}
                          </div>
                        </div>
                      </div>

                      {/* Display occurrences locations pills in bottom */}
                      <div className="mt-2.5 flex flex-wrap gap-1 items-center">
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase mr-1">Locations:</span>
                        {item.occurrences.map((occ, oIdx) => {
                          const wfTitle = getWorkflowTitle(occ.workflowId);
                          return (
                            <button
                              key={occ.nodeId}
                              onClick={() => {
                                if (onNavigateToWorkspace) {
                                  onNavigateToWorkspace(occ.workflowId, occ.nodeId);
                                }
                              }}
                              className="text-[8px] font-mono font-extrabold bg-white hover:bg-neutral-900 hover:text-white text-slate-655 border border-slate-300 hover:border-black px-1.5 py-0.5 rounded transition-all cursor-pointer truncate max-w-[120px]"
                              title={`Jump to this instance in: ${wfTitle}`}
                            >
                              📁 {wfTitle}
                            </button>
                          );
                        })}
                      </div>

                      {item.url && (
                        <div className="mt-1.5 text-[8px] font-mono text-slate-400 truncate max-w-full flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5 text-slate-300 shrink-0" />
                          <span className="truncate">{item.url}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Secondary Row: Timeline of Added Cards, displaying when they were created */}
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden" id="insights-timeline-panel">
          <div className="p-4 border-b-2 border-black bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase font-mono tracking-wider text-black">
                📅 Workspace Card Creation Timeline
              </h3>
            </div>
            <div className="bg-emerald-100 text-emerald-800 text-[8px] font-mono px-2 py-0.5 rounded border border-emerald-300 font-extrabold uppercase">
              Added Timestamps
            </div>
          </div>

          <div className="p-5 max-h-[350px] overflow-y-auto">
            <div className="relative border-l-2 border-slate-200 pl-4 space-y-6">
              {timelineNodes.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium border-l border-transparent">
                  No workspace cards have been initialized yet.
                </div>
              ) : (
                timelineNodes.map((node) => {
                  const wfName = getWorkflowTitle(node.workflowId);
                  return (
                    <div key={node.id} className="relative group">
                      
                      {/* Timeline Dot Indicator */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-black bg-white group-hover:bg-emerald-500 transition-all z-10" />

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-mono font-bold text-slate-400">
                              [{formatDate(node.createdAt)}]
                            </span>
                            <span className={`text-[8px] uppercase font-mono px-1 border rounded font-semibold ${
                              node.type === 'tool' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              node.type === 'link' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                              'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                              {node.type}
                            </span>
                            <h4 
                              onClick={() => onNavigateToWorkspace?.(node.workflowId, node.id)}
                              className="text-xs font-black text-slate-800 hover:text-emerald-600 cursor-pointer transition-colors"
                              title="Click to locate on interactive whiteboard"
                            >
                              {node.title || 'Untitled Card'}
                            </h4>
                          </div>

                          <div className="mt-0.5 text-[10px] text-slate-500 line-clamp-1">
                            {node.content ? node.content.slice(0, 150) : <span className="italic text-slate-400">Empty workspace card summary content</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-start md:self-auto uppercase font-mono text-[8.5px] font-extrabold">
                          <span className="text-slate-400">In Workspace:</span>
                          <button
                            onClick={() => onNavigateToWorkspace?.(node.workflowId, node.id)}
                            className="bg-slate-100 hover:bg-neutral-900 border border-slate-300 hover:border-black text-slate-750 hover:text-white px-2 py-0.5 rounded font-black transition-all cursor-pointer"
                          >
                            📁 {wfName}
                          </button>
                          
                          {node.clickCount && node.clickCount > 0 ? (
                            <span className="bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded">
                              {node.clickCount} Clicks
                            </span>
                          ) : null}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
