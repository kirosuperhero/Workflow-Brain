import React, { useState, useEffect } from 'react';
import { 
  Workflow, 
  WorkflowNode, 
  NodeLink, 
  WorkflowVersion, 
  NodeType, 
  NodeStatus,
  QueueResource,
  ResourceReview,
  ResourceLinkToNode,
  ResourceStatus
} from './types';
import { TEMPLATES } from './templates';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import ImportExport from './components/ImportExport';
import ExperimentalQueue from './components/ExperimentalQueue';
import { 
  Brain, 
  ChevronLeft, 
  Search, 
  Star, 
  Trash2, 
  Copy, 
  Plus, 
  Menu, 
  HelpCircle, 
  X, 
  ExternalLink, 
  Layers, 
  Activity, 
  CheckCircle, 
  Download, 
  History, 
  Settings, 
  Sparkles, 
  PanelLeftClose, 
  PanelLeftOpen, 
  SlidersHorizontal, 
  UserPlus, 
  FolderPlus, 
  BookOpen, 
  Info,
  Maximize2,
  Minimize2,
  ChevronRight,
  Sliders,
  LayoutDashboard,
  Layout,
  Tag
} from 'lucide-react';

const LOCAL_STORAGE_PREFIX = 'workflow_brain_v2';

const SEED_RESOURCES: QueueResource[] = [
  {
    id: 'res-seed-1',
    title: 'Multi-Agent Grounding Orchestrator with Gemini SDK',
    url: 'https://github.com/google/generative-ai-js',
    type: 'tool',
    shortSummary: 'Official TypeScript library for the new Google GenAI SDK. Highly optimal for building RAG applications.',
    tags: ['ai', 'agent', 'gemini', 'tool'],
    rating: 4,
    notes: 'To install run: npm install @google/genai\nSupports full-duplex Live API streaming and fast search grounding overlays.',
    status: 'experimental',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'res-seed-2',
    title: 'Framer Motion Layout Animations Best Practices Checklist',
    url: 'https://motion.dev/docs/layout-animations',
    type: 'article',
    shortSummary: 'Step-by-step checklist guide to implementing visual transitions, layout shifts, and route transitions without cumulative layout shift.',
    tags: ['react', 'animation', 'ux'],
    rating: 5,
    notes: 'Excellent documentation for layouts scaling on canvas components. Highlights using layoutId prop for smooth transfers.',
    status: 'trusted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'res-seed-3',
    title: 'Tailwind CSS v4.0 Alpha Review',
    url: 'https://v4.tailwindcss.com',
    type: 'article',
    shortSummary: 'Exploring native Rust-based compiler engine upgrades and custom CSS variables definitions of layout states.',
    tags: ['css', 'tailwind', 'frontend'],
    rating: 3,
    notes: 'Configures entirely inside global CSS with `@import "tailwindcss";` directive instead of standard js config files.',
    status: 'inbox',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'res-seed-4',
    title: 'Whiteboard Collision Avoidance Heuristic Note',
    url: '',
    type: 'note',
    shortSummary: 'Theoretical plan for Smart Align overlapping calculation using bounding boxes offset indices.',
    tags: ['math', 'canvas', 'note'],
    rating: 0,
    notes: 'Keep dragging grids responsive with light bounds coordinates checks. Hold shift/alt to bypass smart collision alignments.',
    status: 'inbox',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'workspaces' | 'queue'>('workspaces');
  const [queueResources, setQueueResources] = useState<QueueResource[]>([]);
  const [queueReviews, setQueueReviews] = useState<ResourceReview[]>([]);
  const [queueLinks, setQueueLinks] = useState<ResourceLinkToNode[]>([]);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [links, setLinks] = useState<NodeLink[]>([]);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);

  // Undo / Redo History stack layers
  const [undoStack, setUndoStack] = useState<{ nodes: WorkflowNode[]; links: NodeLink[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ nodes: WorkflowNode[]; links: NodeLink[] }[]>([]);
  
  // Navigation Routing States
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Left Sidebar collapsible options
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCatFilter, setSidebarCatFilter] = useState('All');

  // Search history & suggestions state
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sidebar_recent_queries');
      return stored ? JSON.parse(stored) : ['architecture', 'ai pipeline', 'database schema', 'saas dev', 'devops'];
    } catch {
      return ['architecture', 'ai pipeline', 'database schema', 'saas dev', 'devops'];
    }
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const addRecentQuery = (query: string) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    setRecentQueries(prev => {
      const next = [trimmed, ...prev.filter(q => q !== trimmed)].slice(0, 8); // Keep up to 8
      localStorage.setItem('sidebar_recent_queries', JSON.stringify(next));
      return next;
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addRecentQuery(sidebarSearch);
    }
  };

  // Deletion & drag reordering states
  const [confirmDeleteWorkflowId, setConfirmDeleteWorkflowId] = useState<string | null>(null);
  const [draggedWorkflowId, setDraggedWorkflowId] = useState<string | null>(null);
  const [dragOverWorkflowId, setDragOverWorkflowId] = useState<string | null>(null);
  
  // Overlay Modals trigger states
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDonateBanner, setShowDonateBanner] = useState(true);
  
  // Dynamic Canvas options
  const [showCanvasSidebar, setShowCanvasSidebar] = useState(true);

  // Auto select first workflow if nothing is selected or active
  useEffect(() => {
    if (!selectedWorkflowId && workflows.length > 0) {
      const favorite = workflows.find(w => w.isFavorite);
      setSelectedWorkflowId(favorite ? favorite.id : workflows[0].id);
    }
  }, [workflows, selectedWorkflowId]);

  // Auto reset active selection when entering another workflow
  useEffect(() => {
    setSelectedNodeId(null);
    setUndoStack([]);
    setRedoStack([]);
  }, [selectedWorkflowId]);

  // Helper UUID substitute creator
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // First mounting: bootstrap storage or parse presets
  useEffect(() => {
    const rawWorkflows = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_workflows`);
    const rawNodes = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_nodes`);
    const rawLinks = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_links`);
    const rawVersions = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_versions`);

    if (rawWorkflows && rawNodes && rawLinks) {
      setWorkflows(JSON.parse(rawWorkflows));
      setNodes(JSON.parse(rawNodes));
      setLinks(JSON.parse(rawLinks));
      setVersions(rawVersions ? JSON.parse(rawVersions) : []);
    } else {
      // First load: seed database using templates values
      seedInitialDatabase();
    }

    // Load Experimental Queue data
    const rawResources = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_queue_resources`);
    const rawQueueReviews = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_queue_reviews`);
    const rawQueueLinks = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_queue_links`);

    if (rawResources) {
      setQueueResources(JSON.parse(rawResources));
      setQueueReviews(rawQueueReviews ? JSON.parse(rawQueueReviews) : []);
      setQueueLinks(rawQueueLinks ? JSON.parse(rawQueueLinks) : []);
    } else {
      setQueueResources(SEED_RESOURCES);
      setQueueReviews([]);
      setQueueLinks([]);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_queue_resources`, JSON.stringify(SEED_RESOURCES));
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_queue_reviews`, JSON.stringify([]));
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_queue_links`, JSON.stringify([]));
    }
  }, []);

  // Sync to database triggers
  const saveStateToStorage = (nextWorkflows: Workflow[], nextNodes: WorkflowNode[], nextLinks: NodeLink[], nextVersions: WorkflowVersion[]) => {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_workflows`, JSON.stringify(nextWorkflows));
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_nodes`, JSON.stringify(nextNodes));
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_links`, JSON.stringify(nextLinks));
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_versions`, JSON.stringify(nextVersions));
  };

  const saveQueueStateToStorage = (nextResources: QueueResource[], nextReviews: ResourceReview[], nextLinks: ResourceLinkToNode[]) => {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_queue_resources`, JSON.stringify(nextResources));
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_queue_reviews`, JSON.stringify(nextReviews));
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_queue_links`, JSON.stringify(nextLinks));
  };

  const seedInitialDatabase = () => {
    const freshWorkflows: Workflow[] = [];
    const freshNodes: WorkflowNode[] = [];
    const freshLinks: NodeLink[] = [];

    TEMPLATES.forEach((tpl, idx) => {
      const wId = `w-${tpl.id}`;
      freshWorkflows.push({
        id: wId,
        title: tpl.title,
        description: tpl.description,
        category: tpl.category,
        status: 'active',
        rating: 4,
        isTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: idx === 0 // Make the first one favorite as a seed
      });

      // Track mapped IDs
      const indexToGeneratedIdMap: { [key: number]: string } = {};

      tpl.nodes.forEach((tplNode, nodeIdx) => {
        const nodeId = `node-${tpl.id}-${nodeIdx}`;
        indexToGeneratedIdMap[nodeIdx] = nodeId;

        freshNodes.push({
          id: nodeId,
          workflowId: wId,
          type: tplNode.type,
          title: tplNode.title,
          content: tplNode.content,
          summary: tplNode.summary,
          sourceUrl: tplNode.sourceUrl,
          sourceTitle: tplNode.sourceTitle,
          confidenceScore: tplNode.confidenceScore,
          rating: tplNode.rating,
          status: tplNode.status,
          positionX: tplNode.positionX,
          positionY: tplNode.positionY,
          tags: tplNode.tags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      tpl.links.forEach((tplLink, linkIdx) => {
        const fromId = indexToGeneratedIdMap[parseInt(tplLink.fromNodeId)];
        const toId = indexToGeneratedIdMap[parseInt(tplLink.toNodeId)];
        if (fromId && toId) {
          freshLinks.push({
            id: `link-${tpl.id}-${linkIdx}`,
            workflowId: wId,
            fromNodeId: fromId,
            toNodeId: toId,
            label: tplLink.label
          });
        }
      });
    });

    setWorkflows(freshWorkflows);
    setNodes(freshNodes);
    setLinks(freshLinks);
    setVersions([]);
    saveStateToStorage(freshWorkflows, freshNodes, freshLinks, []);
  };

  // State manipulation triggers

  // Create workspace either blank or with initial seeded structures
  const handleAddWorkflow = (
    title: string, 
    description: string, 
    category: string, 
    isTemplate: boolean,
    templateNodes?: any[],
    templateLinks?: any[]
  ) => {
    const wId = `w-${generateId()}`;
    const freshWorkflow: Workflow = {
      id: wId,
      title,
      description,
      category,
      status: 'active',
      rating: 5,
      isTemplate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextWorkflows = [freshWorkflow, ...workflows];
    let nextNodes = [...nodes];
    let nextLinks = [...links];

    // Seed initial nodes if launched from a template scaffold
    if (templateNodes && templateNodes.length > 0) {
      const indexToGeneratedIdMap: { [key: number]: string } = {};
      
      templateNodes.forEach((tplNode, idx) => {
        const nodeId = `node-u-${generateId()}`;
        indexToGeneratedIdMap[idx] = nodeId;

        nextNodes.push({
          ...tplNode,
          id: nodeId,
          workflowId: wId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      if (templateLinks && templateLinks.length > 0) {
        templateLinks.forEach((tplLink) => {
          const fromId = indexToGeneratedIdMap[parseInt(tplLink.fromNodeId)];
          const toId = indexToGeneratedIdMap[parseInt(tplLink.toNodeId)];
          if (fromId && toId) {
            nextLinks.push({
              id: `link-u-${generateId()}`,
              workflowId: wId,
              fromNodeId: fromId,
              toNodeId: toId,
              label: tplLink.label
            });
          }
        });
      }
    } else {
      // Create a single default Step to guide the blank canvas
      const defaultNodeId = `node-u-${generateId()}`;
      nextNodes.push({
        id: defaultNodeId,
        workflowId: wId,
        type: 'step',
        title: 'Initial Concept',
        content: `Start mapping out features or links for ${title}.`,
        summary: 'Double click on empty canvas grid to add more modular nodes.',
        confidenceScore: 85,
        rating: 3,
        status: 'experimental',
        positionX: 300,
        positionY: 200,
        tags: ['starter'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    setWorkflows(nextWorkflows);
    setNodes(nextNodes);
    setLinks(nextLinks);
    saveStateToStorage(nextWorkflows, nextNodes, nextLinks, versions);
    setSelectedWorkflowId(wId);
  };

  const handleDeleteWorkflow = (id: string) => {
    const nextWorkflows = workflows.filter(w => w.id !== id);
    const nextNodes = nodes.filter(n => n.workflowId !== id);
    const nextLinks = links.filter(l => l.workflowId !== id);
    const nextVersions = versions.filter(v => v.workflowId !== id);

    setWorkflows(nextWorkflows);
    setNodes(nextNodes);
    setLinks(nextLinks);
    setVersions(nextVersions);
    
    if (selectedWorkflowId === id) {
      setSelectedWorkflowId(nextWorkflows.length > 0 ? nextWorkflows[0].id : null);
      setSelectedNodeId(null);
    }
    saveStateToStorage(nextWorkflows, nextNodes, nextLinks, nextVersions);
  };

  const handleDuplicateWorkflow = (id: string) => {
    const sourceW = workflows.find(w => w.id === id);
    if (!sourceW) return;

    const newWId = `w-${generateId()}`;
    const duplicatedWorkflow: Workflow = {
      ...sourceW,
      id: newWId,
      title: `${sourceW.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false
    };

    const wNodes = nodes.filter(n => n.workflowId === id);
    const wLinks = links.filter(l => l.workflowId === id);

    const matchOldIdToNewId: { [key: string]: string } = {};
    const duplicatedNodes: WorkflowNode[] = wNodes.map((n) => {
      const generatedId = `node-d-${generateId()}`;
      matchOldIdToNewId[n.id] = generatedId;
      return {
        ...n,
        id: generatedId,
        workflowId: newWId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    const duplicatedLinks: NodeLink[] = wLinks.map((l) => {
      const fromId = matchOldIdToNewId[l.fromNodeId];
      const toId = matchOldIdToNewId[l.toNodeId];
      return {
        ...l,
        id: `link-d-${generateId()}`,
        workflowId: newWId,
        fromNodeId: fromId || l.fromNodeId,
        toNodeId: toId || l.toNodeId
      };
    });

    const nextWorkflows = [...workflows, duplicatedWorkflow];
    const nextNodes = [...nodes, ...duplicatedNodes];
    const nextLinks = [...links, ...duplicatedLinks];

    setWorkflows(nextWorkflows);
    setNodes(nextNodes);
    setLinks(nextLinks);
    saveStateToStorage(nextWorkflows, nextNodes, nextLinks, versions);
    setSelectedWorkflowId(newWId);
  };

  const handleToggleFavorite = (id: string) => {
    const nextW = workflows.map(w => {
      if (w.id === id) {
        return { ...w, isFavorite: !w.isFavorite };
      }
      return w;
    });
    setWorkflows(nextW);
    saveStateToStorage(nextW, nodes, links, versions);
  };

  const handleUpdateWorkflowDetails = (id: string, nextTitle: string, nextDesc: string, nextCat: string) => {
    const nextW = workflows.map(w => {
      if (w.id === id) {
        return {
          ...w,
          title: nextTitle,
          description: nextDesc,
          category: nextCat,
          updatedAt: new Date().toISOString()
        };
      }
      return w;
    });
    setWorkflows(nextW);
    saveStateToStorage(nextW, nodes, links, versions);
  };

  // Node operations
  const pushToHistory = (customNodes = nodes, customLinks = links) => {
    if (customNodes.length === 0) return;
    setUndoStack(prev => {
      const next = [...prev, { nodes: customNodes, links: customLinks }];
      if (next.length > 50) {
        return next.slice(next.length - 50);
      }
      return next;
    });
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, undoStack.length - 1);

    setRedoStack(prev => [{ nodes, links }, ...prev].slice(0, 50));
    setUndoStack(newUndoStack);

    setNodes(previous.nodes);
    setLinks(previous.links);
    saveStateToStorage(workflows, previous.nodes, previous.links, versions);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setUndoStack(prev => [...prev, { nodes, links }].slice(0, 50));
    setRedoStack(newRedoStack);

    setNodes(nextState.nodes);
    setLinks(nextState.links);
    saveStateToStorage(workflows, nextState.nodes, nextState.links, versions);
  };

  const handleUpdateNodePosition = (nodeId: string, x: number, y: number) => {
    const nextNodes = nodes.map(n => {
      if (n.id === nodeId) {
        return { ...n, positionX: x, positionY: y, updatedAt: new Date().toISOString() };
      }
      return n;
    });
    setNodes(nextNodes);
    saveStateToStorage(workflows, nextNodes, links, versions);
  };

  const handleUpdateNodeData = (nodeId: string, updatedFields: Partial<WorkflowNode>) => {
    const nextNodes = nodes.map(n => {
      if (n.id === nodeId) {
        return { ...n, ...updatedFields, updatedAt: new Date().toISOString() };
      }
      return n;
    });
    setNodes(nextNodes);
    saveStateToStorage(workflows, nextNodes, links, versions);
  };

  const handleRemoveTagGlobally = (tagToRemove: string) => {
    pushToHistory(nodes, links);
    const nextNodes = nodes.map(n => {
      if (n.tags && Array.isArray(n.tags) && n.tags.includes(tagToRemove)) {
        return {
          ...n,
          tags: n.tags.filter(t => t !== tagToRemove),
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    setNodes(nextNodes);
    saveStateToStorage(workflows, nextNodes, links, versions);
  };

  const handleAddNode = (node: Omit<WorkflowNode, 'id' | 'createdAt' | 'updatedAt'>) => {
    pushToHistory(nodes, links);
    const freshId = `node-n-${generateId()}`;
    const nextNodes = [
      ...nodes,
      {
        ...node,
        id: freshId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    setNodes(nextNodes);
    saveStateToStorage(workflows, nextNodes, links, versions);
    setSelectedNodeId(freshId);
    return freshId;
  };

  const handleDeleteNode = (nodeId: string) => {
    pushToHistory(nodes, links);
    const nextNodes = nodes.filter(n => n.id !== nodeId);
    const nextLinks = links.filter(l => l.fromNodeId !== nodeId && l.toNodeId !== nodeId);
    setNodes(nextNodes);
    setLinks(nextLinks);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    saveStateToStorage(workflows, nextNodes, nextLinks, versions);
  };

  const handleAddLink = (fromNodeId: string, toNodeId: string) => {
    // Avoid duplicates or simple cycles
    const exists = links.some(l => l.workflowId === selectedWorkflowId && l.fromNodeId === fromNodeId && l.toNodeId === toNodeId);
    if (exists || fromNodeId === toNodeId) return;

    pushToHistory(nodes, links);
    const freshLink: NodeLink = {
      id: `link-n-${generateId()}`,
      workflowId: selectedWorkflowId || '',
      fromNodeId,
      toNodeId,
      label: ''
    };

    const nextLinks = [...links, freshLink];
    setLinks(nextLinks);
    saveStateToStorage(workflows, nodes, nextLinks, versions);
  };

  const handleDeleteLink = (linkId: string) => {
    pushToHistory(nodes, links);
    const nextLinks = links.filter(l => l.id !== linkId);
    setLinks(nextLinks);
    saveStateToStorage(workflows, nodes, nextLinks, versions);
  };

  // snap/restore
  const handleSaveVersion = (wfId: string, versionName: string) => {
    const wfNodes = nodes.filter(n => n.workflowId === wfId);
    const wfLinks = links.filter(l => l.workflowId === wfId);

    const newV: WorkflowVersion = {
      id: `ver-${generateId()}`,
      workflowId: wfId,
      versionName,
      createdAt: new Date().toISOString(),
      nodes: wfNodes,
      links: wfLinks
    };

    const nextVersions = [newV, ...versions];
    setVersions(nextVersions);
    saveStateToStorage(workflows, nodes, links, nextVersions);
  };

  const handleRestoreVersion = (version: WorkflowVersion) => {
    const filteredNodes = nodes.filter(n => n.workflowId !== version.workflowId);
    const filteredLinks = links.filter(l => l.workflowId !== version.workflowId);

    const restoredNodes = version.nodes.map(n => ({
      ...n,
      updatedAt: new Date().toISOString()
    }));
    const restoredLinks = version.links;

    const nextNodes = [...filteredNodes, ...restoredNodes];
    const nextLinks = [...filteredLinks, ...restoredLinks];

    setNodes(nextNodes);
    setLinks(nextLinks);
    setSelectedNodeId(null);
    saveStateToStorage(workflows, nextNodes, nextLinks, versions);
  };

  const resetAllState = () => {
    console.warn('Resetting local storage database to seeds configuration.');
    seedInitialDatabase();
    setSelectedWorkflowId(null);
    setSelectedNodeId(null);
  };

  const handleAddQueueResource = (resource: Omit<QueueResource, 'id' | 'createdAt' | 'updatedAt'>) => {
    setQueueResources(prev => {
      const newRes: QueueResource = {
        ...resource,
        id: `queue-res-${generateId()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const nextResources = [newRes, ...prev];
      saveQueueStateToStorage(nextResources, queueReviews, queueLinks);
      return nextResources;
    });
  };

  const handleUpdateQueueResource = (id: string, updatedFields: Partial<QueueResource>) => {
    const nextResources = queueResources.map(r => {
      if (r.id === id) {
        return { ...r, ...updatedFields, updatedAt: new Date().toISOString() };
      }
      return r;
    });
    setQueueResources(nextResources);
    saveQueueStateToStorage(nextResources, queueReviews, queueLinks);
  };

  const handleDeleteQueueResource = (id: string) => {
    const nextResources = queueResources.filter(r => r.id !== id);
    const nextReviews = queueReviews.filter(rev => rev.resourceId !== id);
    const nextLinks = queueLinks.filter(l => l.resourceId !== id);
    setQueueResources(nextResources);
    setQueueReviews(nextReviews);
    setQueueLinks(nextLinks);
    saveQueueStateToStorage(nextResources, nextReviews, nextLinks);
  };

  const handleAddResourceReview = (review: Omit<ResourceReview, 'id' | 'reviewedAt'>) => {
    const newRev: ResourceReview = {
      ...review,
      id: `queue-rev-${generateId()}`,
      reviewedAt: new Date().toISOString()
    };
    const nextReviews = [newRev, ...queueReviews];
    setQueueReviews(nextReviews);
    saveQueueStateToStorage(queueResources, nextReviews, queueLinks);
  };

  const handleMoveResourceToWorkflow = (resourceId: string, workflowId: string) => {
    const res = queueResources.find(r => r.id === resourceId);
    if (!res) return;

    let nodeType: NodeType = 'link';
    if (res.type === 'video') nodeType = 'video';
    else if (res.type === 'tool') nodeType = 'tool';
    else if (res.type === 'note') nodeType = 'note';

    const newNode: Omit<WorkflowNode, 'id' | 'createdAt' | 'updatedAt'> = {
      workflowId,
      type: nodeType,
      title: res.title || `Imported ${res.type}`,
      content: res.notes || `Description: ${res.shortSummary}`,
      summary: res.shortSummary || 'Imported from Experimental Queue.',
      sourceUrl: res.url || undefined,
      sourceTitle: res.type ? `${res.type.toUpperCase()}` : undefined,
      confidenceScore: res.rating > 0 ? res.rating * 20 : 70,
      rating: res.rating > 0 ? res.rating : 3,
      status: res.status === 'trusted' ? 'trusted' : 'experimental',
      positionX: 300 + Math.random() * 80,
      positionY: 200 + Math.random() * 80,
      tags: res.tags || []
    };

    const createdNodeId = handleAddNode(newNode);

    const newLink: ResourceLinkToNode = {
      id: `queue-link-${generateId()}`,
      resourceId,
      workflowId,
      nodeId: createdNodeId,
      linkedAt: new Date().toISOString()
    };

    const nextResources = queueResources.map(r => {
      if (r.id === resourceId) {
        return {
          ...r,
          status: 'tested' as ResourceStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });

    const nextLinks = [...queueLinks, newLink];
    setQueueResources(nextResources);
    setQueueLinks(nextLinks);
    saveQueueStateToStorage(nextResources, queueReviews, nextLinks);

    setSelectedWorkflowId(workflowId);
    setActiveTab('workspaces');
    setSelectedNodeId(createdNodeId);
  };

  const handleDuplicateNodeToWorkflow = (nodeId: string, targetWorkflowId: string) => {
    const originalNode = nodes.find(n => n.id === nodeId);
    if (!originalNode) return;

    const clonedNodeData: Omit<WorkflowNode, 'id' | 'createdAt' | 'updatedAt'> = {
      workflowId: targetWorkflowId,
      type: originalNode.type,
      title: `${originalNode.title} (Copy)`,
      content: originalNode.content,
      summary: originalNode.summary,
      confidenceScore: originalNode.confidenceScore,
      rating: originalNode.rating,
      status: originalNode.status,
      positionX: originalNode.positionX + 40,
      positionY: originalNode.positionY + 40,
      tags: [...originalNode.tags],
      sourceTitle: originalNode.sourceTitle,
      sourceUrl: originalNode.sourceUrl,
      pricingTier: originalNode.pricingTier,
      approximateUses: originalNode.approximateUses
    };

    const duplicateId = handleAddNode(clonedNodeData);

    setSelectedWorkflowId(targetWorkflowId);
    setSelectedNodeId(duplicateId);
  };

  // Nav calculations
  const activeWorkflow = workflows.find(w => w.id === selectedWorkflowId);
  const activeWorkflowNodes = nodes.filter(n => n.workflowId === selectedWorkflowId);
  const activeWorkflowLinks = links.filter(l => l.workflowId === selectedWorkflowId);
  const activeSelectedNode = nodes.find(n => n.id === selectedNodeId);

  // Statistics summaries inside active canvas editor
  const activeTrustedPercent = activeWorkflowNodes.length > 0 
    ? Math.round((activeWorkflowNodes.filter(n => n.status === 'trusted').length / activeWorkflowNodes.length) * 100)
    : 0;

  const handleInstantCreateWorkflow = () => {
    const title = `Whiteboard Workflow ${workflows.length + 1}`;
    const desc = "Interactive developer whiteboard for planning, tools, and links.";
    const cat = "Architecture";
    handleAddWorkflow(title, desc, cat, false);
  };

  const listableWorkflows = workflows.filter(w => {
    if (sidebarCatFilter !== 'All') {
      const wTags = (w.category || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!wTags.includes(sidebarCatFilter)) return false;
    }
    if (sidebarSearch.trim() !== '') {
      const q = sidebarSearch.toLowerCase();
      return w.title.toLowerCase().includes(q) || w.description.toLowerCase().includes(q) || (w.category && w.category.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f5f6f8] text-slate-800 font-sans selection:bg-blue-600/15 selection:text-slate-900" id="workflow-brain-root">
      
      {/* 1. COLLAPSIBLE LEFT WORKSPACE LIST SIDEBAR */}
      {showLeftSidebar ? (
        <div className="w-80 bg-white border-r-2 border-black flex flex-col h-full shrink-0 z-25 shadow-[4px_0_0_rgba(0,0,0,0.05)]" id="sidebar-panel-group">
          
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-black bg-slate-50 select-none">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-600 border-2 border-black rounded-lg flex items-center justify-center text-white">
                  <Brain className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xs font-black text-black leading-none uppercase tracking-wider">
                  Workflow Brain
                </h1>
                <span className="text-[9px] font-mono text-slate-400 font-bold block uppercase mt-1 leading-none">Scaffolding Planner</span>
              </div>
            </div>

            <button 
              onClick={() => setShowLeftSidebar(false)}
              className="p-1.5 hover:bg-slate-100 border-2 border-black rounded-lg transition-colors cursor-pointer shadow-[1px_1px_0px_#000] bg-white text-slate-700"
              title="Collapse Sidepanel"
              id="collapse-sidepanel-trigger"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Tab Swapping workspaces / queue */}
          <div className="flex border-b-2 border-black bg-slate-100 select-none shrink-0">
            <button 
              onClick={() => setActiveTab('workspaces')}
              className={`flex-1 py-2 text-[10px] font-mono font-black uppercase text-center cursor-pointer transition-all ${
                activeTab === 'workspaces' 
                  ? 'bg-white text-black border-r-2 border-black' 
                  : 'text-slate-500 hover:bg-slate-50 border-r-2 border-black border-b border-black'
              }`}
            >
              📁 Workspaces
            </button>
            <button 
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-2 text-[10px] font-mono font-black uppercase text-center cursor-pointer transition-all ${
                activeTab === 'queue' 
                  ? 'bg-white text-black' 
                  : 'text-slate-500 hover:bg-slate-50 border-b border-black'
              }`}
              id="experimental-queue-tab"
            >
              ⚡ Inbox Queue ({queueResources.length})
            </button>
          </div>

          {activeTab === 'workspaces' ? (
            <>
              {/* Search Box with options indicators */}
              <div className="p-4 border-b border-slate-200 select-none">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text"
                    placeholder="Search documents, tags, URLs..."
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 220)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full bg-slate-50 border-2 border-black rounded-lg pl-8 pr-10 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white"
                    id="sidebar-search-box"
                    autoComplete="off"
                  />
                  
                  <div className="absolute right-2.5 top-2.5 flex items-center gap-1 text-slate-400">
                    <span title="Config view"><SlidersHorizontal className="w-3.5 h-3.5 hover:text-black cursor-pointer" /></span>
                    <span title="Invite partners"><UserPlus className="w-3.5 h-3.5 hover:text-black cursor-pointer" /></span>
                  </div>

                  {isSearchFocused && (
                    <div 
                      className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_#000] z-50 overflow-hidden max-h-[350px] overflow-y-auto"
                      id="search-suggestions-dropdown"
                    >
                      {/* 1. Tag auto-completions section */}
                      <div className="bg-slate-50 border-b border-slate-100 p-2">
                        <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider mb-1.5">🏷️ Suggested Domains/Tags</span>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const allUniqueTags = Array.from(new Set([
                              ...workflows.flatMap(w => (w.category || '').split(',').map(s => s.trim()).filter(Boolean)),
                              ...nodes.flatMap(n => n.tags || []),
                              ...queueResources.flatMap(r => r.tags || [])
                            ])).filter(Boolean);
                            
                            const queryLower = sidebarSearch.trim().toLowerCase();
                            const matching = queryLower 
                              ? allUniqueTags.filter(t => t.toLowerCase().includes(queryLower)).slice(0, 6)
                              : allUniqueTags.slice(0, 6);

                            if (matching.length === 0) {
                              return <span className="text-[9px] font-mono text-slate-400">No matching tags</span>;
                            }

                            return matching.map(tg => (
                              <button
                                key={tg}
                                type="button"
                                onMouseDown={() => {
                                  setSidebarSearch(tg);
                                  addRecentQuery(tg);
                                }}
                                className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white hover:bg-slate-200 border border-slate-300 rounded shadow-xs text-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <Tag className="w-2.5 h-2.5 text-blue-500" />
                                <span>{tg}</span>
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                      {/* 2. Recent search queries */}
                      {recentQueries.length > 0 && (
                        <div className="border-b border-slate-100 py-1.5">
                          <div className="flex items-center justify-between px-3 pb-1">
                            <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider">🕒 Recent Searches</span>
                            <button
                              type="button"
                              onMouseDown={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                setRecentQueries([]);
                                localStorage.setItem('sidebar_recent_queries', JSON.stringify([]));
                              }}
                              className="text-[8px] font-mono font-bold text-red-500 hover:text-red-700 uppercase cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="space-y-0.5">
                            {recentQueries.map((rq, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-0.5 hover:bg-slate-50">
                                <button
                                  type="button"
                                  onMouseDown={() => {
                                    setSidebarSearch(rq);
                                    addRecentQuery(rq);
                                  }}
                                  className="flex-1 text-left py-0.5 text-[10px] font-mono font-black text-slate-600 hover:text-blue-600 truncate cursor-pointer"
                                >
                                  {rq}
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    setRecentQueries(prev => {
                                      const next = prev.filter(q => q !== rq);
                                      localStorage.setItem('sidebar_recent_queries', JSON.stringify(next));
                                      return next;
                                    });
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                                  title="Remove query"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Matching Workspace Cards & Node Titles */}
                      {(() => {
                        const queryLower = sidebarSearch.trim().toLowerCase();
                        if (!queryLower) return null;

                        const matchingWF = workflows.filter(w => 
                          w.title.toLowerCase().includes(queryLower) || 
                          (w.description && w.description.toLowerCase().includes(queryLower))
                        ).slice(0, 3);

                        const matchingND = nodes.filter(n => 
                          n.title.toLowerCase().includes(queryLower) || 
                          (n.content && n.content.toLowerCase().includes(queryLower))
                        ).slice(0, 3);

                        if (matchingWF.length === 0 && matchingND.length === 0) return null;

                        return (
                          <div className="border-b border-slate-100 py-1.5 bg-slate-50/30">
                            <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider px-3 pb-1">📝 Matching Cards & Workspaces</span>
                            
                            <div className="space-y-0.5">
                              {/* Workspaces */}
                              {matchingWF.map(w => (
                                <button
                                  key={w.id}
                                  type="button"
                                  onMouseDown={() => {
                                    setSelectedWorkflowId(w.id);
                                    addRecentQuery(w.title);
                                  }}
                                  className="w-full text-left px-3 py-1 hover:bg-slate-100 flex flex-col border-b border-dotted border-slate-100 last:border-b-0 cursor-pointer"
                                >
                                  <span className="text-[10px] font-black text-slate-800 truncate flex items-center gap-1">
                                    <LayoutDashboard className="w-3" style={{ height: '12px' }} />
                                    <span>{w.title}</span>
                                  </span>
                                  <span className="text-[8px] text-slate-400 truncate pl-4">
                                    Workspace • {(w.category || 'Architecture').split(',')[0]}
                                  </span>
                                </button>
                              ))}

                              {/* Nodes on Whiteboard */}
                              {matchingND.map(n => {
                                const targetWf = workflows.find(w => w.id === n.workflowId);
                                return (
                                  <button
                                    key={n.id}
                                    type="button"
                                    onMouseDown={() => {
                                      setSelectedWorkflowId(n.workflowId);
                                      setSelectedNodeId(n.id);
                                      addRecentQuery(n.title);
                                    }}
                                    className="w-full text-left px-3 py-1 hover:bg-slate-100 flex flex-col border-b border-dotted border-slate-100 last:border-b-0 cursor-pointer"
                                  >
                                    <span className="text-[10px] font-bold text-slate-700 truncate flex items-center gap-1">
                                      <Brain className="w-3" style={{ height: '12px' }} />
                                      <span>{n.title}</span>
                                    </span>
                                    <span className="text-[8px] text-slate-400 truncate pl-4">
                                      Card in Workspace: <span className="font-semibold text-slate-600">{targetWf ? targetWf.title : 'Architecture'}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 4. External source URLs matches */}
                      {(() => {
                        const queryLower = sidebarSearch.trim().toLowerCase();
                        if (!queryLower) return null;

                        const sourceUrlsFromNodes = nodes.filter(n => n.sourceUrl && n.sourceUrl.toLowerCase().includes(queryLower)).map(n => ({
                          title: n.sourceTitle || n.title || 'Source URL',
                          url: n.sourceUrl!,
                          workflowId: n.workflowId,
                          nodeId: n.id,
                          context: 'Whiteboard Card Link'
                        }));

                        const sourceUrlsFromQueue = queueResources.filter(r => r.url && r.url.toLowerCase().includes(queryLower)).map(r => ({
                          title: r.title || 'Queue Connection',
                          url: r.url,
                          workflowId: null,
                          nodeId: r.id,
                          context: 'Inbox Link'
                        }));

                        const combinedUrls = [...sourceUrlsFromNodes, ...sourceUrlsFromQueue].slice(0, 4);

                        if (combinedUrls.length === 0) return null;

                        return (
                          <div className="py-1.5">
                            <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider px-3 pb-1">🌐 Matching Source URLs</span>
                            <div className="space-y-0.5">
                              {combinedUrls.map((ur, uIdx) => (
                                <a
                                  key={uIdx}
                                  href={ur.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onMouseDown={(e) => {
                                    // Let it open normally, but register the query and selection
                                    addRecentQuery(ur.title);
                                    if (ur.workflowId) {
                                      setSelectedWorkflowId(ur.workflowId);
                                      if (ur.nodeId) {
                                        setSelectedNodeId(ur.nodeId);
                                      }
                                    }
                                  }}
                                  className="block px-3 py-1 hover:bg-slate-100 border-b border-dotted border-slate-150 last:border-b-0 cursor-pointer"
                                >
                                  <div className="text-[10px] font-black text-slate-800 truncate flex items-center gap-1.5">
                                    <ExternalLink className="w-2.5 h-2.5 text-emerald-650 shrink-0" />
                                    <span>{ur.title}</span>
                                  </div>
                                  <div className="text-[8px] font-mono text-slate-450 truncate pl-4 leading-normal">
                                    {ur.url}
                                  </div>
                                  <div className="flex items-center gap-1 pl-4 mt-0.5">
                                    <span className="text-[7.5px] uppercase font-mono px-1 py-0.2 bg-emerald-50 border border-emerald-105 text-emerald-700 rounded scale-95">
                                      {ur.context}
                                    </span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Domain Category Horizontal Pills Selector (Issue #1 Solution) */}
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 select-none">
                <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest mb-1.5">Project Scopes:</span>
                
                <div className="flex flex-wrap gap-1 max-h-[72px] overflow-y-auto pr-1 overflow-x-hidden">
                  <button
                    onClick={() => setSidebarCatFilter('All')}
                    className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                      sidebarCatFilter === 'All'
                        ? 'bg-blue-600 text-white border-black font-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white hover:bg-slate-100 text-slate-655 border-slate-300'
                    }`}
                  >
                    All
                  </button>
                  
                  {Array.from(new Set(
                    workflows.flatMap(w => (w.category || '').split(',').map(s => s.trim()).filter(Boolean))
                  )).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSidebarCatFilter(cat)}
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                        sidebarCatFilter === cat
                          ? 'bg-blue-600 text-white border-black font-black shadow-[1px_1px_0px_#000]'
                          : 'bg-white hover:bg-slate-100 text-slate-655 border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workspaces Scrollable List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 select-none" id="sidebar-documents-list">
                <span className="block text-[8px] font-mono font-extrabold text-slate-400 uppercase tracking-widest mb-1">Documents ({listableWorkflows.length}):</span>
                
                {listableWorkflows.length > 0 ? (
                  listableWorkflows.map((w) => {
                    const isActive = w.id === selectedWorkflowId;
                    const firstLetter = w.title ? w.title.charAt(0).toUpperCase() : 'W';
                    const dateStr = new Date(w.updatedAt || w.createdAt).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric' 
                    });

                    // Status percentages calculation
                    const wNodes = nodes.filter(n => n.workflowId === w.id);
                    const numTrusted = wNodes.filter(n => n.status === 'trusted').length;
                    const numExperimental = wNodes.filter(n => n.status === 'experimental').length;
                    const numArchived = wNodes.filter(n => n.status === 'archived').length;
                    
                    const pTrusted = wNodes.length > 0 ? Math.round((numTrusted / wNodes.length) * 100) : 0;
                    const pExperimental = wNodes.length > 0 ? Math.round((numExperimental / wNodes.length) * 100) : 0;
                    const pArchived = wNodes.length > 0 ? Math.round((numArchived / wNodes.length) * 100) : 0;
                    
                    return (
                      <div
                        key={w.id}
                        onClick={() => setSelectedWorkflowId(w.id)}
                        draggable
                        onDragStart={(e) => {
                          setDraggedWorkflowId(w.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', w.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDragEnd={() => {
                          setDraggedWorkflowId(null);
                          setDragOverWorkflowId(null);
                        }}
                        onDragEnter={(e) => {
                          if (draggedWorkflowId && draggedWorkflowId !== w.id) {
                            setDragOverWorkflowId(w.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverWorkflowId === w.id) {
                            setDragOverWorkflowId(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverWorkflowId(null);
                          if (!draggedWorkflowId || draggedWorkflowId === w.id) return;
                          
                          const sourceIdx = workflows.findIndex(item => item.id === draggedWorkflowId);
                          const targetIdx = workflows.findIndex(item => item.id === w.id);
                          
                          if (sourceIdx !== -1 && targetIdx !== -1) {
                            const nextWorkflows = [...workflows];
                            const [removed] = nextWorkflows.splice(sourceIdx, 1);
                            nextWorkflows.splice(targetIdx, 0, removed);
                            
                            setWorkflows(nextWorkflows);
                            saveStateToStorage(nextWorkflows, nodes, links, versions);
                          }
                          setDraggedWorkflowId(null);
                        }}
                        className={`p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all flex flex-col gap-2 group relative overflow-visible ${
                          dragOverWorkflowId === w.id 
                            ? 'border-dashed border-blue-500 bg-blue-50 scale-[0.98]' 
                            : (isActive 
                                ? 'bg-blue-50/40 border-blue-600 shadow-[3px_3px_0px_#2563eb]' 
                                : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_transparent] hover:shadow-[2px_2px_0px_#000]')
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {/* Avatar initial letters */}
                            <div className={`w-9 h-9 border border-black rounded flex items-center justify-center font-black font-mono shadow-[1px_1px_0px_#000] text-sm shrink-0 ${
                              isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {firstLetter}
                            </div>
                            
                            {/* Description column */}
                            <div className="min-w-0">
                              <h3 className="text-xs font-extrabold text-black leading-tight truncate font-sans">
                                {w.title}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[8px] font-mono font-bold uppercase text-slate-400 truncate max-w-[120px]" title={w.category}>
                                  {w.category ? w.category.split(',')[0].trim() : 'Architecture'}
                                  {w.category && w.category.split(',').length > 1 ? ` +${w.category.split(',').length - 1}` : ''}
                                </span>
                                <span className="text-[8px] font-mono font-medium text-slate-300 shrink-0">•</span>
                                <span className="text-[8px] font-mono text-slate-450 font-bold shrink-0">
                                  {dateStr}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions on Hover */}
                          <div className={`flex items-center gap-1 shrink-0 bg-white border border-slate-200 rounded p-0.5 absolute right-2 top-3 z-10 shadow-[1px_1px_0px_#000] transition-opacity ${
                            confirmDeleteWorkflowId === w.id ? 'opacity-100 z-20' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(w.id);
                              }}
                              className="p-1 hover:bg-slate-100 text-amber-500 rounded cursor-pointer"
                              title="Set as Favorite"
                            >
                              <Star className={`w-3 h-3 ${w.isFavorite ? 'fill-amber-400' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateWorkflow(w.id);
                              }}
                              className="p-1 hover:bg-slate-100 text-blue-600 rounded cursor-pointer"
                              title="Duplicate Document"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            
                            {confirmDeleteWorkflowId === w.id ? (
                              <div className="flex items-center gap-1 bg-red-50 p-0.5 rounded border border-red-250 animate-fade-in">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorkflow(w.id);
                                    setConfirmDeleteWorkflowId(null);
                                  }}
                                  className="bg-red-650 hover:bg-red-700 text-white text-[8px] font-mono font-black px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#000] cursor-pointer"
                                  title="Delete permanently"
                                >
                                  Sure?
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteWorkflowId(null);
                                  }}
                                  className="bg-white hover:bg-slate-100 text-slate-700 text-[8px] font-mono font-bold px-1.5 py-0.5 border border-slate-350 rounded cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              workflows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteWorkflowId(w.id);
                                  }}
                                  className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                                  title="Delete Workspace"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Progress details & colors (Trusted, Experimental, Archived metrics) */}
                        {wNodes.length > 0 && (
                          <div className="mt-1 pb-0.5 border-t border-slate-100 pt-1.5 block w-full" id={`w-progress-box-${w.id}`}>
                            {/* Segmented color bars */}
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex" title={`${pTrusted}% Trusted, ${pExperimental}% Experimental, ${pArchived}% Archived`}>
                              {numTrusted > 0 && (
                                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${pTrusted}%` }} />
                              )}
                              {numExperimental > 0 && (
                                <div className="bg-blue-500 h-full transition-all" style={{ width: `${pExperimental}%` }} />
                              )}
                              {numArchived > 0 && (
                                <div className="bg-slate-400 h-full transition-all" style={{ width: `${pArchived}%` }} />
                              )}
                            </div>
                            {/* Small percent list info labels */}
                            <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-500 mt-1">
                              <span className="text-emerald-600 block shrink-0">{pTrusted}% Trusted</span>
                              <span className="text-blue-600 block shrink-0">{pExperimental}% Exp</span>
                              <span className="text-slate-500 block shrink-0">{pArchived}% Arch</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 font-mono text-[10px] uppercase border border-dashed border-slate-300 rounded-lg bg-slate-50 p-4">
                    No matching documents
                  </div>
                )}
              </div>

              {/* Floating plus to create blank whiteboard */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-center select-none shrink-0">
                <button
                  onClick={handleInstantCreateWorkflow}
                  className="w-11 h-11 bg-black hover:bg-slate-900 border-2 border-black text-white rounded-full flex items-center justify-center cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all"
                  title="Add a new blank document instantly"
                  id="instant-create-btn"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 select-none font-mono text-[10px] text-slate-500 bg-slate-50/20" id="queue-status-sidebar-panel">
              <div className="border-2 border-black bg-white rounded-lg p-3 space-y-2.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] animate-fade-in">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Inbox Progress Matrix:</span>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between font-bold text-black border-b border-dashed border-slate-100 pb-1">
                    <span>Pending Inbox:</span>
                    <span className="text-amber-600 px-1.5 bg-amber-50 border border-amber-200 rounded">{queueResources.filter(r => r.status === 'inbox').length} items</span>
                  </div>
                  <div className="flex justify-between font-bold text-black border-b border-dashed border-slate-100 pb-1">
                    <span>Experimental:</span>
                    <span className="text-blue-600 px-1.5 bg-blue-50 border border-blue-200 rounded">{queueResources.filter(r => r.status === 'experimental').length} items</span>
                  </div>
                  <div className="flex justify-between font-bold text-black border-b border-dashed border-slate-100 pb-1">
                    <span>Certified Trusted:</span>
                    <span className="text-emerald-600 px-1.5 bg-emerald-50 border border-emerald-200 rounded">{queueResources.filter(r => r.status === 'trusted').length} items</span>
                  </div>
                  <div className="flex justify-between font-bold text-black border-b border-dashed border-slate-100 pb-1">
                    <span>Tested or Archived:</span>
                    <span className="text-slate-600 px-1.5 bg-slate-50 border border-slate-200 rounded">{queueResources.filter(r => r.status === 'tested' || r.status === 'archived').length} items</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-200 text-blue-700 text-[10px] leading-relaxed rounded-lg animate-fade-in">
                💡 <strong>Tip:</strong> Keep workflows focused by moving useful tools and tested links straight onto visual diagrams using the Move feature!
              </div>
            </div>
          )}

        </div>
      ) : null}

      {/* 2. DYNAMIC MAIN VISUAL BOARD (100% FLOATING VIEWPORT) */}
      <div className="flex-1 h-full relative flex flex-col overflow-hidden animate-fade-in" id="cognitive-core-stage">
        
        {/* Absolute Floated Sidebar Opener indicator if sidebar is folded */}
        {!showLeftSidebar ? (
          <button
            onClick={() => setShowLeftSidebar(true)}
            className="absolute top-4 left-4 p-2 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] cursor-pointer z-40 text-slate-800 hover:text-blue-600 active:scale-95 transition-all flex items-center justify-center"
            title="Expand Workspaces Sidepanel Selector"
            id="sidebar-unfold-btn"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : null}

        {activeTab === 'queue' ? (
          <ExperimentalQueue 
            workflows={workflows}
            resources={queueResources}
            reviews={queueReviews}
            linksToNodes={queueLinks}
            onAddResource={handleAddQueueResource}
            onUpdateResource={handleUpdateQueueResource}
            onDeleteResource={handleDeleteQueueResource}
            onAddReview={handleAddResourceReview}
            onMoveToWorkflow={handleMoveResourceToWorkflow}
          />
        ) : activeWorkflow ? (
          <>
            {/* Elegant Floating Top Title & Config Bar (Google Docs/Weje Style) */}
            <div 
              className={`absolute top-4 z-30 pointer-events-none flex items-center justify-between px-4 transition-all duration-300 ${
                showLeftSidebar ? 'left-4 right-4' : 'left-16 right-4'
              }`}
              id="canvas-active-header"
            >
              <div className="flex items-center gap-2.5 pointer-events-auto bg-white border-2 border-black p-1.5 px-3 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)]" id="header-floater">
                <Brain className="w-4 h-4 text-blue-600 shrink-0" />
                
                {/* Editable Title Box */}
                <input 
                  type="text"
                  value={activeWorkflow.title}
                  onChange={(e) => {
                    handleUpdateWorkflowDetails(activeWorkflow.id, e.target.value, activeWorkflow.description, activeWorkflow.category);
                  }}
                  className="text-xs font-black text-black bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-black max-w-[140px] md:max-w-[200px] py-0.5 truncate shrink-0"
                  title="Click to rename document"
                />

                <span className="text-slate-300 text-[10px] select-none shrink-0 border-l border-slate-200 h-4 pl-2">|</span>

                {/* Inline Domain Category select to edit domain tags on-the-fly! (Issue #1 Solution!) */}
                <span className="text-[8px] font-mono text-slate-400 font-extrabold select-none shrink-0 uppercase">Scopes:</span>
                <input 
                  type="text"
                  value={activeWorkflow.category}
                  onChange={(e) => {
                    handleUpdateWorkflowDetails(activeWorkflow.id, activeWorkflow.title, activeWorkflow.description, e.target.value);
                  }}
                  className="text-[9px] font-mono font-bold uppercase tracking-wider bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded outline-none w-28 text-center focus:bg-white focus:border-blue-500 shrink-0"
                  title="Edit category tags (comma separated) directly on-the-fly"
                />

                <span className="text-slate-300 text-[10px] select-none shrink-0 border-l border-slate-200 h-4 pl-2 font-bold">|</span>

                {/* Info / Description Modal Trigger */}
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded text-slate-650 hover:text-black flex items-center gap-1 cursor-pointer transition-colors text-[9px] font-mono font-bold"
                  title="Inspect goals mission description details"
                >
                  <BookOpen className="w-3 h-3 text-slate-600" />
                  <span>Goals</span>
                </button>

                {/* Backup & Exporters Modal Trigger */}
                <button
                  onClick={() => setShowSnapshotsModal(true)}
                  className="p-1 px-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded text-sky-800 hover:text-sky-900 flex items-center gap-1 cursor-pointer transition-colors text-[9px] font-mono font-bold"
                  title="Save Snapshot backup or Export Markdown"
                >
                  <History className="w-3 h-3 text-sky-600 animate-pulse" />
                  <span>Saves</span>
                </button>

                <span className="text-slate-300 text-[10px] select-none shrink-0 border-l border-slate-200 h-4 pl-2 hidden md:inline">|</span>

                {/* Right collapsible stats */}
                <div className="hidden md:flex items-center gap-2 select-none" title="Trust index index analysis">
                  <span className="text-[9px] font-mono text-slate-450 uppercase font-black">Trust:</span>
                  <span className={`text-[10px] font-mono font-black ${activeTrustedPercent >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {activeTrustedPercent}% Certified
                  </span>
                </div>
              </div>

               {/* Utility reset buttons in the top right floating section */}
              <div className="flex items-center gap-2 pointer-events-auto select-none" id="dashboard-right-menu">
              </div>
            </div>

            {/* INTERACTIVE INFINITE DYNAMIC CANVAS SCENE */}
            <div className="flex-1 w-full h-full relative" id="infinite-drawing-core">
              <Canvas 
                nodes={activeWorkflowNodes}
                links={activeWorkflowLinks}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onUpdateNodePosition={handleUpdateNodePosition}
                onNodeDragStart={() => pushToHistory(nodes, links)}
                onAddNode={(type, x, y, initialFields) => {
                  return handleAddNode({
                    workflowId: selectedWorkflowId || '',
                    type,
                    title: `New ${type}`,
                    content: '',
                    summary: '',
                    confidenceScore: 70,
                    rating: 3,
                    status: 'experimental',
                    positionX: x,
                    positionY: y,
                    tags: [],
                    ...initialFields
                  });
                }}
                onDeleteNode={handleDeleteNode}
                onAddLink={handleAddLink}
                onDeleteLink={handleDeleteLink}
                onUpdateNode={handleUpdateNodeData}
                searchQuery={sidebarSearch}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                queueLinks={queueLinks}
                queueResources={queueResources}
              />
            </div>
          </>
        ) : (
          /* EMPTY WHITEBOARD ONBOARDING SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none" id="empty-onboarding-hud">
            <Brain className="w-16 h-16 text-slate-300 mb-4 animate-bounce" />
            <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Workspace Database Empty</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm font-medium leading-relaxed">
              No plan boards were found. Click the floating black <span className="font-extrabold underline cursor-pointer" onClick={handleInstantCreateWorkflow}>Add (+)</span> button at the bottom left sidepanel to establish an interactive development workbench!
            </p>
          </div>
        )}

      </div>

      {/* 3. SPLITTED COLLAPSIBLE RIGHT SIDEBAR FOR DETAILED NODE INSPECTION */}
      {activeTab === 'workspaces' && selectedNodeId && activeSelectedNode && showCanvasSidebar ? (
        <div className="w-80 md:w-96 bg-white border-l-2 border-black flex flex-col h-full shrink-0 z-25 shadow-[-4px_0_0_rgba(0,0,0,0.05)]" id="sidebar-inspector-row">
          
          {/* Collapse inspector panel layout wrapper */}
          <div className="flex items-center justify-between p-3 border-b-2 border-slate-900 bg-slate-50 text-slate-700 select-none shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider">
            <span>Inspector Card</span>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="p-1 hover:bg-slate-200 rounded border border-slate-300 hover:border-black cursor-pointer text-black"
              title="Close Details Profile View"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto" id="node-scrolling-inspector">
            <Sidebar 
              node={activeSelectedNode}
              allNodes={activeWorkflowNodes}
              globalNodes={nodes}
              links={activeWorkflowLinks}
              onUpdateNode={(node) => handleUpdateNodeData(node.id, node)}
              onDeleteNode={handleDeleteNode}
              onClose={() => setSelectedNodeId(null)}
              queueLinks={queueLinks}
              queueResources={queueResources}
              onAddNode={handleAddNode}
              onAddLink={handleAddLink}
              workflows={workflows}
              onDuplicateNodeToWorkflow={handleDuplicateNodeToWorkflow}
              onRemoveTagGlobally={handleRemoveTagGlobally}
            />
          </div>
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* 4. MODALS AND OVERLAYS SECTION */}
      {/* ========================================================= */}

      {/* LOCAL VERSION BACKUP PIN SNAPSHOT & DATA JSON EXPORTERS MODAL */}
      {showSnapshotsModal && activeWorkflow && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-55 flex items-center justify-center p-4" id="snapshots-modal-container">
          <div className="bg-white border-2 border-black rounded-lg w-full max-w-4xl p-6 relative shadow-[6px_6px_0px_#000] animate-scale-up max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setShowSnapshotsModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg border-2 border-black hover:bg-slate-100 cursor-pointer shadow-[1px_1px_0px_#000] text-black"
              id="close-saves-modal-btn"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="mb-4" id="saves-header-meta">
              <h2 className="text-xs font-mono font-black text-black uppercase tracking-widest flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600 animate-pulse" />
                Snapshot Backups & Documentation Portability
              </h2>
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block mt-1">Compile portable schemas or revert backups securely</span>
            </div>

            <ImportExport 
              workflow={activeWorkflow}
              nodes={activeWorkflowNodes}
              links={activeWorkflowLinks}
              versions={versions}
              onSaveVersion={(verName) => handleSaveVersion(activeWorkflow.id, verName)}
              onRestoreVersion={handleRestoreVersion}
            />
          </div>
        </div>
      )}

      {/* METADATA SUMMARY & DESCRIPTION INTENTS MODAL */}
      {showInfoModal && activeWorkflow && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-55 flex items-center justify-center p-4 animate-fade-in" id="goals-info-modal-container">
          <div className="bg-white border-2 border-black rounded-lg w-full max-w-md p-6 relative shadow-[5px_5px_0px_#000] animate-scale-up">
            
            <button 
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg border-2 border-black hover:bg-slate-100 cursor-pointer shadow-[1px_1px_0px_#000] text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <h2 className="text-xs font-mono font-black text-black mb-5 uppercase tracking-wider flex items-center gap-1.5 border-b-2 border-black pb-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              Recalibrate Project Objectives
            </h2>

            <div className="space-y-4" id="info-modal-form-fields">
              <div>
                <label className="block text-[10px] font-mono font-black text-slate-500 mb-1 uppercase tracking-tight">Mission / Summary description</label>
                <textarea 
                  rows={4}
                  value={activeWorkflow.description}
                  onChange={(e) => {
                    handleUpdateWorkflowDetails(activeWorkflow.id, activeWorkflow.title, e.target.value, activeWorkflow.category);
                  }}
                  placeholder="Record execution goals, planning specifications, or testing strategies for team whiteboard layout."
                  className="w-full bg-slate-50 border-2 border-black text-slate-900 font-medium text-xs rounded-lg px-3 py-2.5 outline-none focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-slate-500 mb-1 uppercase tracking-tight">Scope Domain Tag(s) (Comma separated)</label>
                <input 
                  type="text"
                  value={activeWorkflow.category}
                  onChange={(e) => {
                    handleUpdateWorkflowDetails(activeWorkflow.id, activeWorkflow.title, activeWorkflow.description, e.target.value);
                  }}
                  placeholder="e.g., Architecture, SaaS Dev, Devops..."
                  className="w-full bg-slate-50 border-2 border-black text-slate-900 font-bold text-xs rounded-lg px-3 py-2 outline-none focus:bg-white"
                  id="metadata-scope-cat-input"
                />
                
                <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-2.5 mb-1.5 font-bold">Suggested categories (Toggle to multi-select):</span>
                <div className="flex flex-wrap gap-1" id="metadata-suggestions-pills">
                  {(() => {
                    const activeWorkflowTags = (activeWorkflow.category || '')
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean);

                    const allIndividualCategories = workflows.flatMap(w => 
                      (w.category || '').split(',').map(s => s.trim()).filter(Boolean)
                    );

                    return Array.from(new Set([
                      'Architecture', 
                      'AI Pipeline', 
                      'Database schema', 
                      'SaaS Dev', 
                      'Devops',
                      ...allIndividualCategories
                    ])).map((item) => {
                      const isSelected = activeWorkflowTags.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            let updatedTags;
                            if (isSelected) {
                              updatedTags = activeWorkflowTags.filter(t => t !== item);
                            } else {
                              updatedTags = [...activeWorkflowTags, item];
                            }
                            handleUpdateWorkflowDetails(activeWorkflow.id, activeWorkflow.title, activeWorkflow.description, updatedTags.join(', '));
                          }}
                          className={`px-2.5 py-1 text-[9px] font-mono border-2 rounded-md transition-all cursor-pointer font-bold ${
                            isSelected
                              ? 'bg-blue-600 text-white border-black font-extrabold shadow-[1.5px_1.5px_0px_#000] active:translate-y-[0.5px]'
                              : 'bg-white hover:bg-slate-150 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isSelected ? `✓ ${item}` : item}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-150 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="py-1.5 px-4 bg-black text-white hover:bg-slate-900 text-xs font-mono font-black border-2 border-black rounded-lg cursor-pointer shadow-[2px_2px_0px_#000]"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
