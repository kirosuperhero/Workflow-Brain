import React, { useState } from 'react';
import { Workflow, WorkflowNode } from '../types';
import { TEMPLATES, Template } from '../templates';
import { 
  FolderPlus, 
  Search, 
  Star, 
  Trash2, 
  Copy, 
  ArrowRight, 
  Layers, 
  Layout, 
  Sliders, 
  Activity, 
  Bookmark, 
  Code2, 
  CheckCircle, 
  HelpCircle,
  FolderOpen,
  X
} from 'lucide-react';

interface WorkflowListProps {
  workflows: Workflow[];
  nodes: WorkflowNode[];
  onSelectWorkflow: (id: string) => void;
  onAddWorkflow: (title: string, description: string, category: string, isTemplate: boolean, templateNodes?: any[], templateLinks?: any[]) => void;
  onDeleteWorkflow: (id: string) => void;
  onDuplicateWorkflow: (workflowId: string) => void;
  onToggleFavorite: (workflowId: string) => void;
}

export default function WorkflowList({
  workflows,
  nodes,
  onSelectWorkflow,
  onAddWorkflow,
  onDeleteWorkflow,
  onDuplicateWorkflow,
  onToggleFavorite
}: WorkflowListProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Workflow parameters
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Architecture');

  // Compute stats across database
  const totalWorkflows = workflows.filter(w => !w.isTemplate).length;
  const favoriteCount = workflows.filter(w => w.isFavorite && !w.isTemplate).length;
  
  // Trusted nodes score
  const trustedNodesCount = nodes.filter(n => n.status === 'trusted').length;
  const totalNodesCount = nodes.length;
  const confidencePercent = totalNodesCount > 0 
    ? Math.round((trustedNodesCount / totalNodesCount) * 100) 
    : 0;

  // Extract unique categories
  const categories = Array.from(new Set(workflows.map(w => w.category || 'Architecture')));

  // Filter workflows list
  const filteredWorkflows = workflows.filter(w => {
    if (w.isTemplate) return false; // Hide direct templates from active list
    if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = w.title.toLowerCase().includes(q);
      const matchDesc = w.description.toLowerCase().includes(q);
      const matchCat = w.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const handleCreateNewWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddWorkflow(
      newTitle, 
      newDesc || 'Custom workspace for solo engineering planning.', 
      newCategory, 
      false
    );
    // Restart inputs
    setNewTitle('');
    setNewDesc('');
    setNewCategory('Architecture');
    setShowCreateModal(false);
  };

  const handleLaunchTemplate = (tpl: Template) => {
    onAddWorkflow(
      `${tpl.title} (Scaffold)`,
      tpl.description,
      tpl.category,
      false,
      tpl.nodes,
      tpl.links
    );
    setShowTemplateModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-0 py-4 select-none" id="workflow-list-screen">
      
      {/* Welcome Banner and Core Stats Widget */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border-2 border-black p-6 rounded-lg shadow-[4px_4px_0px_#000] relative overflow-hidden" id="dashboard-hero-banner">
        
        {/* Abstract background graphics to mimic tech style */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/[0.03] via-transparent to-transparent pointer-events-none" />
        
        <div className="space-y-1.5 z-10" id="hero-welcome">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-black flex items-center gap-2">
            <Layout className="w-6 h-6 text-blue-600" />
            Workflow Brain
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl leading-normal font-medium">
            Turn disorganized bookmarks, notes, tools, and commands into beautiful, modular execution flowcharts. Map dependencies, manage trust indexes, and reuse components.
          </p>
        </div>

        <div className="flex flex-row gap-3 w-full md:w-auto z-10" id="hero-actions">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex-1 md:flex-none py-2 px-4 bg-white hover:bg-slate-50 text-black border-2 border-black rounded-lg cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            id="open-templates-modal-btn"
          >
            <Code2 className="w-4 h-4 text-blue-600" />
            Launch Template
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 md:flex-none py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white border-2 border-black rounded-lg cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            id="open-create-modal-btn"
          >
            <FolderPlus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      {/* Bento-grid Statistics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-bento-stats">
        
        <div className="bg-white border-2 border-black rounded-lg p-4 flex items-center gap-3.5 shadow-[3px_3px_0px_#000]" id="stat-total-workflows">
          <div className="p-2.5 bg-blue-50 border-2 border-black rounded-lg text-blue-600 shadow-[1px_1px_0px_#000]">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Workspaces</span>
            <span className="text-sm font-mono font-black text-slate-800">{totalWorkflows} Active</span>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 flex items-center gap-3.5 shadow-[3px_3px_0px_#000]" id="stat-trusted-nodes">
          <div className="p-2.5 bg-emerald-50 border-2 border-black rounded-lg text-emerald-600 shadow-[1px_1px_0px_#000]">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Trust Ratio</span>
            <span className="text-sm font-mono font-black text-slate-800">{confidencePercent}% Certified</span>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 flex items-center gap-3.5 shadow-[3px_3px_0px_#000]" id="stat-favorites">
          <div className="p-2.5 bg-amber-50 border-2 border-black rounded-lg text-amber-600 shadow-[1px_1px_0px_#000]">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Favorites</span>
            <span className="text-sm font-mono font-black text-slate-800">{favoriteCount} Pinned</span>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-4 flex items-center gap-3.5 shadow-[3px_3px_0px_#000]" id="stat-knowledge-index">
          <div className="p-2.5 bg-purple-50 border-2 border-black rounded-lg text-purple-600 shadow-[1px_1px_0px_#000]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Knowledge base</span>
            <span className="text-sm font-mono font-black text-slate-800">{totalNodesCount} Nodes</span>
          </div>
        </div>

      </div>

      {/* Workspace search, categories filter panel */}
      <div className="bg-white p-4 border-2 border-black rounded-lg shadow-[3px_3px_0px_#000] flex flex-col md:flex-row gap-3 items-center justify-between" id="dashboard-search-panel">
        <div className="relative w-full md:w-96" id="search-input-wrapper">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          <input 
            type="text" 
            placeholder="Search workspaces or metadata..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border-2 border-black rounded-lg text-slate-800 font-medium placeholder-slate-400 text-xs focus:bg-white outline-none"
            id="global-search-input"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0" id="search-category-filter">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border-2 border-black cursor-pointer transition-all active:translate-y-[1px] ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white shadow-[1px_1px_0px_#000]'
                : 'bg-white hover:bg-slate-50 text-slate-700 shadow-[2px_2px_0px_#000]'
            }`}
            id="category-filter-all"
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border-2 border-black cursor-pointer transition-all active:translate-y-[1px] ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white shadow-[1px_1px_0px_#000]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 shadow-[2px_2px_0px_#000]'
              }`}
              id={`category-filter-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid display of active Workflows */}
      {filteredWorkflows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="active-workspaces-grid">
          {filteredWorkflows.map((item) => {
            const currentWorkflowNodes = nodes.filter(n => n.workflowId === item.id);
            const trustedCount = currentWorkflowNodes.filter(n => n.status === 'trusted').length;
            const expCount = currentWorkflowNodes.filter(n => n.status === 'experimental').length;

            return (
              <div 
                key={item.id}
                onClick={() => onSelectWorkflow(item.id)}
                className="bento-card bento-card-hover p-5 flex flex-col justify-between cursor-pointer hover:bg-slate-50/40 relative group"
                id={`workflow-card-${item.id}`}
              >
                <div id={`workflow-card-body-${item.id}`}>
                  
                  {/* Category, Favorite stars */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-b border-slate-100 pb-2 mb-3" id={`workflow-meta-${item.id}`}>
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 border-1.5 border-black rounded">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5" id={`favorite-toggle-area-${item.id}`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item.id);
                        }}
                        className="p-1 hover:scale-110 text-slate-400 hover:text-amber-500 transition-all rounded"
                        title={item.isFavorite ? 'Unfavorite' : 'Make Favorite'}
                        id={`favorite-toggle-btn-${item.id}`}
                      >
                        <Star className={`w-4 h-4 ${item.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-400'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Title and descriptions */}
                  <h3 className="text-sm font-bold text-black tracking-tight group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-1.5 leading-normal">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100" id={`workflow-card-foot-${item.id}`}>
                  {/* Stats regarding nodes metrics */}
                  <div className="flex justify-between items-center" id={`workflow-card-stats-${item.id}`}>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      Index: <span className="font-extrabold text-slate-800">{currentWorkflowNodes.length} nodes</span>
                    </span>

                    <div className="flex items-center gap-2" id={`pills-trust-status-${item.id}`}>
                      {trustedCount > 0 && (
                        <span className="status-badge text-emerald-600 border-emerald-600 bg-emerald-50">
                          {trustedCount} Trusted
                        </span>
                      )}
                      {expCount > 0 && (
                        <span className="status-badge text-blue-600 border-blue-600 bg-blue-50">
                          {expCount} Exp
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Operational Utility Controls */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3" id={`workflow-operations-${item.id}`}>
                    <div className="flex gap-1.5" id={`operational-buttons-${item.id}`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateWorkflow(item.id);
                        }}
                        className="p-1.5 bg-white hover:bg-slate-50 border-2 border-black text-slate-700 hover:text-black rounded-lg cursor-pointer transition-all shadow-[1px_1px_0px_#000]"
                        title="Duplicate Workspace"
                        id={`duplicate-wf-btn-${item.id}`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this workspace? All mapped node relationships will be permanently removed.')) {
                            onDeleteWorkflow(item.id);
                          }
                        }}
                        className="p-1.5 bg-white hover:bg-red-50 border-2 border-black text-slate-600 hover:text-red-600 rounded-lg cursor-pointer transition-all shadow-[1px_1px_0px_#000]"
                        title="Delete Workspace"
                        id={`delete-wf-btn-${item.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[11px] text-blue-600 font-extrabold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Enter workspace
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty Dashboard Display state */
        <div className="bg-white border-2 border-dashed border-black rounded-lg p-12 text-center shadow-[3px_3px_0px_#000]" id="empty-dashboard">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800">No Mapped Workspaces Found</h3>
          <p className="text-xs text-slate-550 mt-1 max-w-md mx-auto font-medium">
            {searchQuery ? 'Adjust your search queries or select another filter parameter.' : 'Get started by spawning a workspace from our developer presets or scaffold a blank blueprint!'}
          </p>
          {!searchQuery && (
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="py-2 px-4 bg-white hover:bg-slate-50 border-2 border-black text-black font-bold text-xs rounded-lg cursor-pointer shadow-[2px_2px_0px_#000]"
                id="empty-templates-btn"
              >
                Browse Presets
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="py-2 px-5 bg-blue-600 hover:bg-blue-500 border-2 border-black text-white font-bold text-xs rounded-lg cursor-pointer shadow-[2px_2px_0px_#000]"
                id="empty-create-btn"
              >
                Create Blank Blueprint
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preset Modals (Launch Canvas Scaffold from templates) */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="templates-modal">
          <div className="bg-white border-2 border-black rounded-lg w-full max-w-2xl p-6 relative flex flex-col max-h-[90vh] shadow-[6px_6px_0px_#000]">
            
            <button 
              onClick={() => setShowTemplateModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-550 hover:text-black hover:border-black border border-transparent rounded-lg transition-colors cursor-pointer"
              id="close-templates-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pr-6" id="templates-modal-header">
              <h2 className="text-base font-black text-black flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-600" />
                Select Canvas Blueprint Scaffold
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Kickstart an interactive workspace with pre-populated developer steps, trusted libraries, and citation anchors.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1" id="templates-list-panel">
              {TEMPLATES.map((tpl) => (
                <div 
                  key={tpl.id}
                  onClick={() => handleLaunchTemplate(tpl)}
                  className="bg-white hover:bg-blue-50/20 border-2 border-black p-4 rounded-lg cursor-pointer transition-all flex flex-col justify-between group shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] active:translate-x-[1px]"
                  id={`template-item-${tpl.id}`}
                >
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-blue-600 font-bold mb-1">
                      <span>{tpl.category} Scaffold</span>
                      <span className="font-semibold text-slate-500">{tpl.nodes.length} wired nodes</span>
                    </div>
                    <h3 className="text-xs font-bold text-black group-hover:text-blue-600 transition-colors">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-slate-650 mt-1 leading-normal font-medium">
                      {tpl.description}
                    </p>
                  </div>
                  <div className="flex justify-end mt-3 border-t border-slate-100 pt-2 text-[10px] font-extrabold text-blue-600 items-center gap-1 uppercase tracking-tight">
                    Instantiate Scaffold
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Workflow Create Modal Form */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="add-workflow-modal">
          <div className="bg-white border-2 border-black rounded-lg w-full max-w-md p-6 relative shadow-[6px_6px_0px_#000]">
            
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-550 hover:text-black hover:border-black border border-transparent rounded-lg transition-colors cursor-pointer"
              id="close-add-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-sm font-mono font-bold text-black mb-4 uppercase tracking-wider flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-blue-600" />
              New Workspace Blueprint
            </h2>

            <form onSubmit={handleCreateNewWorkflow} className="space-y-4" id="add-workflow-form">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-500 mb-1">Workspace Title *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g., Stripe Payment Pipeline"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black text-slate-900 font-medium text-xs rounded-lg px-3 py-2.5 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-500 mb-1">Mission / Description</label>
                <textarea 
                  rows={3}
                  placeholder="Summarize the core execution goals of this wireflow."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black text-slate-900 font-medium text-xs rounded-lg px-3 py-2.5 focus:bg-white outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-500 mb-1">Domain category</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g., Marketing, AI Agent Pipeline, SaaS Dev..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-black text-slate-900 font-bold text-xs rounded-lg px-3 py-2.5 focus:bg-white outline-none"
                    id="new-workflow-category-input"
                  />
                  
                  {/* Dynamic suggestions pills */}
                  <div className="space-y-1">
                    <span className="block text-[9px] font-mono text-slate-400 uppercase font-bold">Suggestions / Pre-existing Domains:</span>
                    <div className="flex flex-wrap gap-1.5" id="creation-category-pills">
                      {Array.from(new Set([
                        'Architecture', 
                        'AI Pipeline', 
                        'Database schema', 
                        'SaaS Dev', 
                        'Devops',
                        ...categories
                      ])).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`px-2 py-0.5 text-[10px] font-mono border rounded transition-colors cursor-pointer ${
                            newCategory === cat
                              ? 'bg-blue-600 text-white border-black font-extrabold shadow-[1px_1px_0px_#000]'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-3" id="create-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 hover:text-black border-2 border-black text-xs font-bold rounded-lg cursor-pointer shadow-[2px_2px_0px_#000]"
                  id="cancel-create-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white border-2 border-black text-xs font-bold rounded-lg cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-[1px]"
                  id="submit-create-btn"
                >
                  Bootstrap Workflow
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
