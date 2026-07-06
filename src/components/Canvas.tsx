import React, { useState, useRef, useEffect } from 'react';
import { 
  WorkflowNode, 
  NodeLink, 
  NodeType, 
  NodeStatus,
  QueueResource,
  ResourceLinkToNode
} from '../types';
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Trash2, 
  Link2, 
  ExternalLink,
  Layers,
  Sparkles,
  HelpCircle,
  Code,
  FileText,
  Video,
  MousePointer,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Bookmark,
  Star,
  Type,
  Paperclip,
  CheckSquare,
  Mic,
  X,
  Undo,
  Redo,
  Grid,
  Magnet
} from 'lucide-react';

interface CanvasProps {
  nodes: WorkflowNode[];
  links: NodeLink[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number, shouldSave?: boolean) => void;
  onNodeDragStart?: () => void;
  onAddNode: (type: NodeType, x: number, y: number, initialFields?: Partial<WorkflowNode>) => string;
  onDeleteNode: (nodeId: string) => void;
  onAddLink: (fromId: string, toId: string) => void;
  onDeleteLink: (linkId: string) => void;
  onUpdateLink?: (linkId: string, updatedFields: Partial<NodeLink>) => void;
  onUpdateNode: (nodeId: string, updatedFields: Partial<WorkflowNode>) => void;
  searchQuery: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  queueLinks?: ResourceLinkToNode[];
  queueResources?: QueueResource[];
  onNodeLinkClick?: (nodeId: string) => void;
}

// Precompute smart alignment search offsets sorted by Euclidean distance
const GRID_STEP_SIZE = 24;
const SMART_ALIGN_OFFSETS = (() => {
  const offsets: { dx: number; dy: number; dist: number }[] = [];
  // Search within +-12 grid units (up to 288px distance in grid spaces)
  for (let gx = -12; gx <= 12; gx++) {
    for (let gy = -12; gy <= 12; gy++) {
      offsets.push({
        dx: gx * GRID_STEP_SIZE,
        dy: gy * GRID_STEP_SIZE,
        dist: gx * gx + gy * gy
      });
    }
  }
  // Sort from inside out (closest distance to furthest)
  return offsets.sort((a, b) => a.dist - b.dist);
})();

export default function Canvas({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePosition,
  onNodeDragStart,
  onAddNode,
  onDeleteNode,
  onAddLink,
  onDeleteLink,
  onUpdateLink,
  onUpdateNode,
  searchQuery,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  queueLinks = [],
  queueResources = [],
  onNodeLinkClick
}: CanvasProps) {
  // Navigation: Panning and Zooming
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [originPan, setOriginPan] = useState({ x: 0, y: 0 });

  // Full-screen image preview lightbox
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');

  // Expandable text note reader / editor notepad modal
  const [activeExpandedNode, setActiveExpandedNode] = useState<WorkflowNode | null>(null);

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

  // Alignment guides state for smart alignment
  const [alignGuidesX, setAlignGuidesX] = useState<number[]>([]);
  const [alignGuidesY, setAlignGuidesY] = useState<number[]>([]);

  // Smart alignment / collision avoidance mode
  const [smartAlign, setSmartAlign] = useState<boolean>(() => {
    const saved = localStorage.getItem('canvas_smart_align_v2');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('canvas_smart_align_v2', String(smartAlign));
  }, [smartAlign]);

  // Snap to grid setting for precision node alignment
  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => {
    const saved = localStorage.getItem('canvas_snap_to_grid_v2');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('canvas_snap_to_grid_v2', String(snapToGrid));
  }, [snapToGrid]);

  // Node Linking State
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);

  // Connection Link Editing State
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [tempLinkLabel, setTempLinkLabel] = useState('');
  const [tempLinkBidirectional, setTempLinkBidirectional] = useState(false);
  const [confirmingDeleteNodeId, setConfirmingDeleteNodeId] = useState<string | null>(null);

  // Filter local state
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(1200);

  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  // Clean linking source if node gets deleted or deselected
  useEffect(() => {
    if (linkingSourceId && !nodes.some(n => n.id === linkingSourceId)) {
      setLinkingSourceId(null);
    }
  }, [nodes, linkingSourceId]);

  // Track cursor position to spawn pasted nodes directly under the mouse pointer
  const mouseClientPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const trackMouse = (e: MouseEvent) => {
      mouseClientPosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', trackMouse);
    return () => {
      window.removeEventListener('mousemove', trackMouse);
    };
  }, []);

  // Internal visual clipboard node representation for iframe-friendly local backup
  const localCopiedNodeRef = useRef<WorkflowNode | null>(null);

  // Safely avoid capturing canvas shortcuts when the user is editing data inside fields or inputs
  const isInputActive = () => {
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    const tagName = activeEl.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || activeEl.hasAttribute('contenteditable');
  };

  // Helper to extract clean titles for pasted or dropped video URLs
  const extractVideoTitle = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
        let videoId = '';
        if (parsed.hostname.includes('youtu.be')) {
          videoId = parsed.pathname.slice(1);
        } else {
          videoId = parsed.searchParams.get('v') || '';
        }
        if (videoId) {
          return `YouTube Video [${videoId}]`;
        }
        return 'YouTube Video Reference';
      }
      if (parsed.hostname.includes('vimeo.com')) {
        const segment = parsed.pathname.split('/').pop();
        if (segment) return `Vimeo Video [${segment}]`;
        return 'Vimeo Video Reference';
      }
      const fileName = parsed.pathname.split('/').pop();
      if (fileName) {
        return `Video: ${decodeURIComponent(fileName)}`;
      }
    } catch (_) {}
    return 'Pasted Video Link';
  };

  // Central intelligent parser for pasted text
  const handlePastedText = (text: string, spawnX: number, spawnY: number) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // A. Check if copied text represents our serialized workflow-brain JSON format
    try {
      if (trimmed.startsWith('{') && trimmed.includes('"type"') && trimmed.includes('"workflow-brain-copied-node"')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && parsed.node) {
          const cNode = parsed.node;
          onAddNode(cNode.type, spawnX, spawnY, {
            title: `${cNode.title} (Copy)`,
            content: cNode.content,
            summary: cNode.summary,
            sourceUrl: cNode.sourceUrl,
            sourceTitle: cNode.sourceTitle,
            confidenceScore: cNode.confidenceScore,
            rating: cNode.rating,
            status: cNode.status,
            tags: [...(cNode.tags || [])]
          });
          return;
        }
      }
    } catch (_) {
      // Not JSON, continue to regex format analyzer
    }

    // B. Analyze text to auto-classify card classifications
    
    // 1. Image reference auto-detection
    const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(trimmed) || trimmed.startsWith('data:image/');
    if (isImage) {
      onAddNode('image', spawnX, spawnY, {
        title: 'Pasted Image Reference',
        content: trimmed,
        summary: 'Pasted custom image source locator.',
        tags: ['pasted', 'image']
      });
      return;
    }

    // 2. Video frame auto-detection
    const isVideo = /youtube\.com|youtu\.be|vimeo\.com|twitch\.tv|\.(mp4|webm|mov|avi)$/i.test(trimmed);
    if (isVideo) {
      const vTitle = extractVideoTitle(trimmed);
      onAddNode('video', spawnX, spawnY, {
        title: vTitle,
        content: trimmed,
        sourceUrl: trimmed,
        sourceTitle: 'Video Url Source',
        summary: 'Pasted external video player web source.',
        tags: ['pasted', 'video']
      });
      return;
    }

    // 3. Web URL Link auto-detection
    const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i.test(trimmed) || trimmed.startsWith('http://') || trimmed.startsWith('https://');
    if (isUrl) {
      let absoluteUrl = trimmed;
      if (!/^https?:\/\//i.test(trimmed)) {
        absoluteUrl = 'https://' + trimmed;
      }
      let domain = 'Link';
      try {
        const parsedUrl = new URL(absoluteUrl);
        domain = parsedUrl.hostname.replace('www.', '');
      } catch (_) {}

      onAddNode('link', spawnX, spawnY, {
        title: `Link: ${domain}`,
        content: `Pasted reference web connection resource.`,
        sourceUrl: absoluteUrl,
        sourceTitle: domain,
        tags: ['pasted', 'web-link']
      });
      return;
    }

    // 4. Code / Tool command/terminal auto-detection
    const isCode = trimmed.startsWith('```') || 
                   trimmed.includes('const ') || 
                   trimmed.includes('let ') || 
                   trimmed.includes('function ') || 
                   trimmed.includes('import ') || 
                   trimmed.startsWith('$ ') || 
                   trimmed.startsWith('npm ') || 
                   trimmed.includes('curl ') ||
                   (trimmed.includes('{') && trimmed.includes('}'));
    if (isCode) {
      const codeCleaned = trimmed.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
      onAddNode('tool', spawnX, spawnY, {
        title: 'Pasted Code Snippet',
        content: codeCleaned,
        summary: 'Pasted developer command or engineering code context block.',
        tags: ['pasted', 'code']
      });
      return;
    }

    // 5. Question/Note advice auto-detection
    const isQuestion = trimmed.endsWith('?') || 
                       /^(how|what|why|who|where|when|can|should|is|are)\s/i.test(trimmed) || 
                       trimmed.length < 120;
    if (isQuestion) {
      onAddNode('note', spawnX, spawnY, {
        title: trimmed.length < 35 ? trimmed : (trimmed.substring(0, 32) + '...'),
        content: trimmed,
        summary: 'Pasted task advice notes or question prompt card.',
        tags: ['pasted', 'note']
      });
      return;
    }

    // 6. Generic fallback -> Step Card
    onAddNode('step', spawnX, spawnY, {
      title: trimmed.length < 30 ? trimmed : (trimmed.substring(0, 27) + '...'),
      content: trimmed,
      summary: 'Automatically created text step based on clipboard input.',
      tags: ['pasted', 'step']
    });
  };

  // Drag and drop handler for files or URL text from desktop
  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const spawnX = Math.round((mouseX - pan.x) / zoom - 100);
    const spawnY = Math.round((mouseY - pan.y) / zoom - 60);

    // If text/URLs are dropped (like a drag-and-drop link or YouTube URL from another tab)
    const textData = e.dataTransfer.getData('text');
    if (textData) {
      handlePastedText(textData, spawnX, spawnY);
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const isImgFile = file.type.startsWith('image/');
      const isVideoFile = file.type.startsWith('video/');

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const type: NodeType = isImgFile ? 'image' : (isVideoFile ? 'video' : 'step');
          onAddNode(type, spawnX, spawnY, {
            title: file.name,
            content: event.target.result as string,
            sourceUrl: isVideoFile ? (event.target.result as string) : undefined,
            summary: `Dropped desktop ${file.type || 'file'}: ${file.name}.`,
            tags: ['desktop-dropped']
          });
        }
      };
      
      if (isImgFile || isVideoFile) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
  };

  // Register native OS copy-paste event intercepts
  useEffect(() => {
    const handleGlobalCopy = (e: ClipboardEvent) => {
      if (isInputActive()) return;
      if (!selectedNodeId) return;

      const activeNode = nodes.find(n => n.id === selectedNodeId);
      if (!activeNode) return;

      const serialized = {
        type: 'workflow-brain-copied-node',
        node: activeNode
      };

      localCopiedNodeRef.current = activeNode;

      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', JSON.stringify(serialized));
        e.preventDefault();
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (isInputActive()) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = mouseClientPosRef.current.x - rect.left;
      const mouseY = mouseClientPosRef.current.y - rect.top;

      const isInsideCanvas = mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height;

      const spawnX = isInsideCanvas 
        ? Math.round((mouseX - pan.x) / zoom - 100)
        : Math.round((rect.width / 2 - pan.x) / zoom - 100);
      const spawnY = isInsideCanvas 
        ? Math.round((mouseY - pan.y) / zoom - 60)
        : Math.round((rect.height / 2 - pan.y) / zoom - 60);

      // Check for file clipboard transfers (images, screenshots, notes files)
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        const isImgFile = file.type.startsWith('image/');
        const isVideoFile = file.type.startsWith('video/');
        
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const nodeType: NodeType = isImgFile ? 'image' : (isVideoFile ? 'video' : 'step');
            onAddNode(nodeType, spawnX, spawnY, {
              title: file.name,
              content: event.target.result as string,
              sourceUrl: isVideoFile ? (event.target.result as string) : undefined,
              summary: `Pasted data file: ${file.name}.`,
              tags: ['pasted-file']
            });
          }
        };
        if (isImgFile || isVideoFile) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
        return;
      }

      // Clipboard fallback items list (e.g. Win + Shift + S screenshots)
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  onAddNode('image', spawnX, spawnY, {
                    title: 'Pasted Clipboard Image',
                    content: event.target.result as string,
                    summary: 'Pasted machine clipboard image.',
                    tags: ['pasted-image']
                  });
                }
              };
              reader.readAsDataURL(file);
              return;
            }
          }
        }
      }

      // Attempt standard OS transfer parsing
      if (e.clipboardData) {
        const text = e.clipboardData.getData('text');
        if (text) {
          e.preventDefault();
          handlePastedText(text, spawnX, spawnY);
          return;
        }
      }

      // Local container fallback mechanism for extra robustness inside isolated iframes
      if (localCopiedNodeRef.current) {
        const cNode = localCopiedNodeRef.current;
        onAddNode(cNode.type, spawnX, spawnY, {
          title: `${cNode.title} (Copy)`,
          content: cNode.content,
          summary: cNode.summary,
          sourceUrl: cNode.sourceUrl,
          sourceTitle: cNode.sourceTitle,
          confidenceScore: cNode.confidenceScore,
          rating: cNode.rating,
          status: cNode.status,
          tags: [...(cNode.tags || [])]
        });
      }
    };

    document.addEventListener('copy', handleGlobalCopy);
    document.addEventListener('paste', handleGlobalPaste);

    return () => {
      document.removeEventListener('copy', handleGlobalCopy);
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [selectedNodeId, nodes, pan, zoom]);

  // Zoom with scroll wheel
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleRawWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest('#notepad-expanded-overlay') || target.closest('#image-lightbox-overlay'))) {
        return; // Allow standard scroll behavior within modals
      }

      e.preventDefault();
      const rect = canvasEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const beforeZoomX = (mouseX - pan.x) / zoom;
      const beforeZoomY = (mouseY - pan.y) / zoom;

      const zoomFactor = 1.05;
      let nextZoom = zoom;
      if (e.deltaY < 0) {
        nextZoom = Math.min(2, zoom * zoomFactor);
      } else {
        nextZoom = Math.max(0.4, zoom / zoomFactor);
      }

      const nextPanX = mouseX - beforeZoomX * nextZoom;
      const nextPanY = mouseY - beforeZoomY * nextZoom;

      setZoom(nextZoom);
      setPan({ x: nextPanX, y: nextPanY });
    };

    canvasEl.addEventListener('wheel', handleRawWheel, { passive: false });
    return () => {
      canvasEl.removeEventListener('wheel', handleRawWheel);
    };
  }, [zoom, pan]);

  // Global Workspace Keyboard Shortcuts (Undo, Redo, Delete selected node)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputActive()) return;

      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || '');
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          onRedo();
        } else {
          e.preventDefault();
          onUndo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          onDeleteNode(selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, onUndo, onRedo, onDeleteNode]);

  // Handle Dragging / Panning on Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      
      // Calculate cursor position in coordinates mapped to the workspace scale/pan
      const currX = (e.clientX - rect.left - pan.x) / zoom;
      const currY = (e.clientY - rect.top - pan.y) / zoom;

      let targetX = Math.round(currX - dragStartOffset.x);
      let targetY = Math.round(currY - dragStartOffset.y);

      // Snap to grid if enabled (before checking smart alignments and collisions)
      if (snapToGrid) {
        targetX = Math.round(targetX / 24) * 24;
        targetY = Math.round(targetY / 24) * 24;
      }

      const activeDraggedNode = nodes.find(n => n.id === draggingNodeId);
      let finalX = targetX;
      let finalY = targetY;
      let guidesX: number[] = [];
      let guidesY: number[] = [];

      // Determine if smart alignment and overlap prevention are active
      const isSmartAlignActive = smartAlign && !e.altKey && !e.shiftKey;

      if (activeDraggedNode) {
        const otherNodes = nodes.filter(n => n.id !== draggingNodeId);
        const dragW = 240;
        const dragH = activeDraggedNode.type === 'image' ? 300 : (activeDraggedNode.type === 'video' ? 250 : 168);

        if (isSmartAlignActive) {
          // First step: Resolve overlaps and collisions using our outwards spiral search
          let resolvedX = targetX;
          let resolvedY = targetY;
          let foundCollisionFree = false;

          for (const offset of SMART_ALIGN_OFFSETS) {
            const candidateX = targetX + offset.dx;
            const candidateY = targetY + offset.dy;

            // Check if candidate position overlaps any other node
            let intersects = false;
            for (const other of otherNodes) {
              const otherW = 240;
              const otherH = other.type === 'image' ? 300 : (other.type === 'video' ? 250 : 168);
              
              // Buffer spaces between nodes to look extremely polished
              const buffer = 12;
              if (
                candidateX < other.positionX + otherW + buffer &&
                candidateX + dragW + buffer > other.positionX &&
                candidateY < other.positionY + otherH + buffer &&
                candidateY + dragH + buffer > other.positionY
              ) {
                intersects = true;
                break;
              }
            }

            if (!intersects) {
              resolvedX = candidateX;
              resolvedY = candidateY;
              foundCollisionFree = true;
              break;
            }
          }

          if (foundCollisionFree) {
            finalX = resolvedX;
            finalY = resolvedY;
          }

          // Second step: Find matching alignment lines for the final non-overlapping position
          // This calculates if any edge or center of our resolved node aligns with another card
          const tolerance = 6;
          for (const other of otherNodes) {
            const otherW = 120 * 2; // width: 240
            const otherH = other.type === 'image' ? 300 : (other.type === 'video' ? 250 : 168);

            // Horizontal/Vertical alignment reference lines
            const otherLeft = other.positionX;
            const otherCenter = other.positionX + otherW / 2;
            const otherRight = other.positionX + otherW;

            const otherTop = other.positionY;
            const otherCenterY = other.positionY + otherH / 2;
            const otherBottom = other.positionY + otherH;

            // X guides
            if (Math.abs(finalX - otherLeft) < tolerance) {
              guidesX.push(otherLeft);
            } else if (Math.abs(finalX - otherRight) < tolerance) {
              guidesX.push(otherRight);
            } else if (Math.abs((finalX + dragW) - otherLeft) < tolerance) {
              guidesX.push(otherLeft);
            } else if (Math.abs((finalX + dragW) - otherRight) < tolerance) {
              guidesX.push(otherRight);
            } else if (Math.abs((finalX + dragW / 2) - otherCenter) < tolerance) {
              guidesX.push(otherCenter);
            }

            // Y guides
            if (Math.abs(finalY - otherTop) < tolerance) {
              guidesY.push(otherTop);
            } else if (Math.abs(finalY - otherBottom) < tolerance) {
              guidesY.push(otherBottom);
            } else if (Math.abs((finalY + dragH) - otherTop) < tolerance) {
              guidesY.push(otherTop);
            } else if (Math.abs((finalY + dragH) - otherBottom) < tolerance) {
              guidesY.push(otherBottom);
            } else if (Math.abs((finalY + dragH / 2) - otherCenterY) < tolerance) {
              guidesY.push(otherCenterY);
            }
          }
        }
      }

      setAlignGuidesX(guidesX);
      setAlignGuidesY(guidesY);

      // Keep nodes within logical bounds
      onUpdateNodePosition(
        draggingNodeId, 
        Math.max(-500, Math.min(2500, finalX)), 
        Math.max(-500, Math.min(2000, finalY)),
        false // defer saves during active dragging moves
      );
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({
        x: originPan.x + dx,
        y: originPan.y + dy
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      const draggedNode = nodes.find(n => n.id === draggingNodeId);
      if (draggedNode) {
        onUpdateNodePosition(draggingNodeId, draggedNode.positionX, draggedNode.positionY, true);
      }
      setDraggingNodeId(null);
      setAlignGuidesX([]);
      setAlignGuidesY([]);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Click handler on Canvas background
  const handleMouseDownOnBackground = (e: React.MouseEvent) => {
    // If clicking a selection or button, don't trigger canvas panning
    if ((e.target as HTMLElement).closest('.canvas-node') || (e.target as HTMLElement).closest('.canvas-controls')) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setOriginPan({ x: pan.x, y: pan.y });
    onSelectNode(null); // Deselect current node
  };

  // Double click canvas to spawn a node
  const handleDoubleClickBackground = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-node') || (e.target as HTMLElement).closest('.canvas-controls')) {
      return;
    }
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const spawnX = Math.round((e.clientX - rect.left - pan.x) / zoom - 100);
    const spawnY = Math.round((e.clientY - rect.top - pan.y) / zoom - 40);
    
    // Default to a 'step' on double click
    onAddNode('step', spawnX, spawnY);
  };

  // Node Drag Trigger
  const handleNodeDragStart = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    if (linkingSourceId) {
      // If we clicked A then B in connecting mode, tie them together
      if (linkingSourceId !== node.id) {
        onAddLink(linkingSourceId, node.id);
      }
      setLinkingSourceId(null);
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Coordinates inside workspace grid
    const zoomCursorX = (e.clientX - rect.left - pan.x) / zoom;
    const zoomCursorY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingNodeId(node.id);
    setDragStartOffset({
      x: zoomCursorX - node.positionX,
      y: zoomCursorY - node.positionY
    });
    onSelectNode(node.id);
    if (onNodeDragStart) {
      onNodeDragStart();
    }
  };

  // Zoom control utils
  const zoomIn = () => setZoom(prev => Math.min(2, prev + 0.1));
  const zoomOut = () => setZoom(prev => Math.max(0.4, prev - 0.1));
  const resetZoomPan = () => {
    setZoom(1);
    setPan({ x: 50, y: 50 });
  };
  const fitAllIntoView = () => {
    if (nodes.length === 0) {
      resetZoomPan();
      return;
    }
    const paddingX = 80;
    const paddingY = 80;
    const minX = Math.min(...nodes.map(n => n.positionX));
    const maxX = Math.max(...nodes.map(n => n.positionX + 260));
    const minY = Math.min(...nodes.map(n => n.positionY));
    const maxY = Math.max(...nodes.map(n => n.positionY + 160));
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const contentW = maxX - minX + paddingX * 2;
      const contentH = maxY - minY + paddingY * 2;
      
      const nextZoom = Math.max(0.4, Math.min(1.5, Math.min(rect.width / contentW, rect.height / contentH)));
      const nextPanX = rect.width / 2 - (minX + (maxX - minX) / 2) * nextZoom;
      const nextPanY = rect.height / 2 - (minY + (maxY - minY) / 2) * nextZoom;
      
      setZoom(nextZoom);
      setPan({ x: nextPanX, y: nextPanY });
    }
  };

  // Node categorization icons
  const getNodeIcon = (type: NodeType) => {
    switch(type) {
      case 'step': return <FileText className="w-4 h-4 text-blue-600" id={`icon-step`} />;
      case 'note': return <HelpCircle className="w-4 h-4 text-emerald-600" id={`icon-note`} />;
      case 'link': return <Link2 className="w-4 h-4 text-indigo-600" id={`icon-link`} />;
      case 'image': return <Plus className="w-4 h-4 text-amber-500 rotate-45" id={`icon-image`} />;
      case 'video': return <Video className="w-4 h-4 text-rose-500" id={`icon-video`} />;
      case 'tool': return <Code className="w-4 h-4 text-purple-600" id={`icon-tool`} />;
      default: return <FileText className="w-4 h-4 text-slate-500" id={`icon-default`} />;
    }
  };

  // Node status labels and styles
  const getStatusBadge = (status: NodeStatus) => {
    switch (status) {
      case 'trusted':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-500 px-1.5 py-0.5 rounded" id={`badge-trusted`}>
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            trusted
          </span>
        );
      case 'experimental':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-500 px-1.5 py-0.5 rounded" id={`badge-experimental`}>
            <Sparkles className="w-2.5 h-2.5 text-blue-500 animate-pulse" />
            experimental
          </span>
        );
      case 'archived':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-400 px-1.5 py-0.5 rounded" id={`badge-archived`}>
            <Archive className="w-2.5 h-2.5 text-slate-500" />
            archived
          </span>
        );
      case 'check_later':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#92400E] bg-[#FEF3C7] border border-[#F59E0B] px-1.5 py-0.5 rounded" id={`badge-check-later`}>
            <Bookmark className="w-2.5 h-2.5 text-[#D97706]" />
            check later
          </span>
        );
    }
  };

  // Filters logic
  const filteredNodes = nodes.filter(node => {
    // Type Filter
    if (filterType !== 'all' && node.type !== filterType) return false;
    // Status Filter
    if (filterStatus !== 'all' && node.status !== filterStatus) return false;
    // Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = node.title.toLowerCase().includes(q);
      const matchContent = node.content.toLowerCase().includes(q);
      const matchTags = node.tags.some(tag => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }
    return true;
  });

  // Hotspot anchor points for connections (width node: 240, height node: variable offset)
  const getNodePorts = (node: WorkflowNode) => {
    return {
      left: { x: node.positionX, y: node.positionY + 68 },
      right: { x: node.positionX + 246, y: node.positionY + 68 }
    };
  };

  return (
    <div className="flex-1 w-full h-full bg-[#f3f4f6] overflow-hidden relative select-none" id="canvas-container-root">
      
      {/* Floating Filters Card - Top Right of Canvas */}
      <div className="absolute top-4 right-4 bg-white border-2 border-black p-1.5 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] z-30 flex items-center gap-2 px-3 canvas-controls select-none" id="canvas-floating-filters">
        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 font-bold uppercase">
          <Layers className="w-3.5 h-3.5 text-blue-600" /> Filters:
        </span>
        
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-800 font-bold text-[10px] rounded px-1 px-1.5 outline-none cursor-pointer"
          id="filter-type-select"
        >
          <option value="all">All Types</option>
          <option value="step">Step</option>
          <option value="note">Note</option>
          <option value="link">Link</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="tool">Tool</option>
        </select>

        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-800 font-bold text-[10px] rounded px-1 px-1.5 outline-none cursor-pointer"
          id="filter-status-select"
        >
          <option value="all">All Status</option>
          <option value="trusted">Trusted Only</option>
          <option value="experimental">Experimental Only</option>
          <option value="archived">Archived Only</option>
        </select>

        <div className="text-[10px] font-mono font-bold text-slate-500 border-l border-slate-200 pl-2">
          <span className="text-black font-extrabold">{filteredNodes.length}</span>/{nodes.length} nodes
        </div>
      </div>

      {/* Connection Tool Floating Reminder */}
      {linkingSourceId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-purple-105 border-2 border-black text-purple-900 font-bold rounded-lg py-1 px-3 text-xs shadow-[3px_3px_0px_#000] z-35 animate-bounce" id="active-connection-prompt">
          <Link2 className="w-3.5 h-3.5 text-purple-600" />
          <span>Tap target node to connect...</span>
          <button 
            onClick={() => setLinkingSourceId(null)} 
            className="text-purple-700 hover:text-purple-900 underline ml-1 cursor-pointer font-black"
            id="cancel-connection-btn"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Interactive Canvas Stage */}
      <div 
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDownOnBackground}
        onDoubleClick={handleDoubleClickBackground}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropFile}
        className="w-full h-full relative overflow-hidden select-none canvas-bg cursor-grab active:cursor-grabbing bg-slate-50"
        id="interactive-canvas-screen"
      >
        {/* Navigation / Control Panel Overlays - Bottom Left */}
        <div className="absolute bottom-6 left-6 flex items-center gap-1 bg-white border-2 border-black p-1 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] z-30 canvas-controls" id="canvas-zoom-controls">
          <button 
            type="button"
            onClick={zoomIn} 
            className="p-1 px-1.5 text-xs bg-white hover:bg-slate-50 text-black border border-slate-200 hover:border-black rounded-md cursor-pointer flex items-center transition-all h-7 shadow-[1px_1px_0px_rgba(0,0,0,0.05)] active:translate-y-[1px]"
            title="Increase Zoom"
            id="zoom-in-control"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <div className="px-1.5 text-xs font-mono text-black font-black w-12 text-center select-none" id="zoom-value-display">
            {Math.round(zoom * 100)}%
          </div>
          
          <button 
            type="button"
            onClick={zoomOut} 
            className="p-1 px-1.5 text-xs bg-white hover:bg-slate-50 text-black border border-slate-200 hover:border-black rounded-md cursor-pointer flex items-center transition-all h-7 shadow-[1px_1px_0px_rgba(0,0,0,0.05)] active:translate-y-[1px]"
            title="Decrease Zoom"
            id="zoom-out-control"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          {canvasWidth >= 850 && <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />}
          
          <button 
            type="button"
            onClick={fitAllIntoView} 
            className="p-1 px-1.5 bg-white hover:bg-slate-50 text-black border border-slate-200 hover:border-black rounded-md cursor-pointer flex items-center gap-1 active:translate-y-[1px] transition-all h-7"
            title="Fit Workspace"
            id="fit-all-control"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {canvasWidth >= 850 && <span className="text-[10px] font-mono font-bold">Fit All</span>}
          </button>
          
          <button 
            type="button"
            onClick={resetZoomPan} 
            className="p-1 px-1.5 bg-white hover:bg-slate-50 text-black border border-slate-200 hover:border-black rounded-md cursor-pointer flex items-center gap-1 active:translate-y-[1px] transition-all h-7"
            title="Reset Scope"
            id="reset-canvas-control"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {canvasWidth >= 850 && <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />}

          <button 
            type="button"
            onClick={() => setSnapToGrid(prev => !prev)} 
            className={`p-1 px-1.5 border rounded-md flex items-center gap-1 transition-all h-7 select-none ${
              snapToGrid 
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 shadow-[1px_1px_0px_rgba(37,99,235,0.2)] active:translate-y-[1px] cursor-pointer' 
                : 'bg-white hover:bg-slate-50 text-black border-slate-200 hover:border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,0.05)] active:translate-y-[1px] cursor-pointer'
            }`}
            title={snapToGrid ? "Snap to Grid Enabled (24px)" : "Snap to Grid Disabled"}
            id="snap-grid-canvas-control"
          >
            <Grid className="w-3.5 h-3.5" />
            {canvasWidth >= 850 && <span className="text-[10px] font-mono font-bold">Snap</span>}
          </button>

          {canvasWidth >= 850 && <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />}

          <button 
            type="button"
            onClick={() => setSmartAlign(prev => !prev)} 
            className={`p-1 px-1.5 border rounded-md flex items-center gap-1 transition-all h-7 select-none ${
              smartAlign 
                ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300 shadow-[1px_1px_0px_rgba(168,85,247,0.2)] active:translate-y-[1px] cursor-pointer font-bold' 
                : 'bg-white hover:bg-slate-50 text-black border-slate-200 hover:border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,0.05)] active:translate-y-[1px] cursor-pointer'
            }`}
            title={smartAlign ? "Smart Align Enabled: Avoids Overlaps/Collisions (Hold Shift/Alt to override)" : "Free Move Mode: No Collision Guards or Alignment"}
            id="smart-align-canvas-control"
          >
            <Magnet className="w-3.5 h-3.5" />
            {canvasWidth >= 850 && <span className="text-[10px] font-mono font-bold">{smartAlign ? "Smart" : "Free Move"}</span>}
          </button>

          {canvasWidth >= 850 && <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />}

          <button 
            type="button"
            onClick={onUndo} 
            disabled={!canUndo}
            className={`p-1 px-1.5 border border-black rounded-md flex items-center gap-1 transition-all h-7 ${
              canUndo 
                ? 'bg-white hover:bg-slate-100 text-black cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px]' 
                : 'bg-slate-50 text-slate-350 cursor-not-allowed opacity-40 border-slate-200'
            }`}
            title="Undo (Ctrl+Z)"
            id="undo-canvas-control"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>

          <button 
            type="button"
            onClick={onRedo} 
            disabled={!canRedo}
            className={`p-1 px-1.5 border border-black rounded-md flex items-center gap-1 transition-all h-7 ${
              canRedo 
                ? 'bg-white hover:bg-slate-100 text-black cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px]' 
                : 'bg-slate-50 text-slate-350 cursor-not-allowed opacity-40 border-slate-200'
            }`}
            title="Redo (Ctrl+Y)"
            id="redo-canvas-control"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Whiteboard Bottom Floating Toolbar (Miro/Weje style) */}
        <div 
          className={`absolute bg-white border-2 border-black p-1.5 rounded-full shadow-[4px_4px_0px_rgba(0,0,0,1)] z-30 flex items-center gap-1 transition-all duration-300 ${
            canvasWidth < 1000 
              ? 'bottom-20 left-6 transform-none' 
              : 'bottom-6 left-1/2 -translate-x-1/2'
          }`} 
          id="canvas-bottom-floating-toolbar"
        >
          {canvasWidth >= 640 && (
            <span className="text-[9px] font-mono text-slate-400 pl-3 uppercase tracking-wider font-extrabold select-none pr-1" id="tools-label-text">Tools:</span>
          )}
          
          <button 
            type="button"
            onClick={() => {
              if (canvasRef.current) {
                const r = canvasRef.current.getBoundingClientRect();
                onAddNode('step', Math.round((r.width / 2 - pan.x)/zoom - 100), Math.round((r.height / 2 - pan.y)/zoom - 60));
              }
            }}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-black text-black rounded-full cursor-pointer text-xs flex items-center justify-center w-9 h-9 transition-colors"
            title="Add Step Card [FileText]"
            id="add-node-step-toolbar"
          >
            <FileText className="w-4 h-4 text-blue-600" />
          </button>

          <button 
            type="button"
            onClick={() => {
              if (canvasRef.current) {
                const r = canvasRef.current.getBoundingClientRect();
                onAddNode('note', Math.round((r.width / 2 - pan.x)/zoom - 100), Math.round((r.height / 2 - pan.y)/zoom - 60));
              }
            }}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-black text-black rounded-full cursor-pointer text-xs flex items-center justify-center w-9 h-9 transition-colors"
            title="Add Note Card [HelpCircle]"
            id="add-node-note-toolbar"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600" />
          </button>

          <button 
            type="button"
            onClick={() => {
              if (canvasRef.current) {
                const r = canvasRef.current.getBoundingClientRect();
                onAddNode('link', Math.round((r.width / 2 - pan.x)/zoom - 100), Math.round((r.height / 2 - pan.y)/zoom - 60));
              }
            }}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-black text-black rounded-full cursor-pointer text-xs flex items-center justify-center w-9 h-9 transition-colors"
            title="Add URL Link [Link2]"
            id="add-node-link-toolbar"
          >
            <Link2 className="w-4 h-4 text-indigo-650" />
          </button>

          <button 
            type="button"
            onClick={() => {
              if (canvasRef.current) {
                const r = canvasRef.current.getBoundingClientRect();
                onAddNode('image', Math.round((r.width / 2 - pan.x)/zoom - 100), Math.round((r.height / 2 - pan.y)/zoom - 60));
              }
            }}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-black text-black rounded-full cursor-pointer text-xs flex items-center justify-center w-9 h-9 transition-colors"
            title="Add Image Reference [Plus]"
            id="add-node-image-toolbar"
          >
            <Plus className="w-4 h-4 text-amber-500 rotate-45" />
          </button>

          <button 
            type="button"
            onClick={() => {
              if (canvasRef.current) {
                const r = canvasRef.current.getBoundingClientRect();
                onAddNode('video', Math.round((r.width / 2 - pan.x)/zoom - 100), Math.round((r.height / 2 - pan.y)/zoom - 60));
              }
            }}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-black text-black rounded-full cursor-pointer text-xs flex items-center justify-center w-9 h-9 transition-colors"
            title="Add Video Frame [Video]"
            id="add-node-video-toolbar"
          >
            <Video className="w-4 h-4 text-rose-500" />
          </button>

          <button 
            type="button"
            onClick={() => {
              if (canvasRef.current) {
                const r = canvasRef.current.getBoundingClientRect();
                onAddNode('tool', Math.round((r.width / 2 - pan.x)/zoom - 100), Math.round((r.height / 2 - pan.y)/zoom - 60));
              }
            }}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-black text-black rounded-full cursor-pointer text-xs flex items-center justify-center w-9 h-9 transition-colors mr-1"
            title="Add Tool Command [Code]"
            id="add-node-tool-toolbar"
          >
            <Code className="w-4 h-4 text-purple-600" />
          </button>
        </div>

        {/* Hint text bottom right */}
        {canvasWidth >= 1400 && (
          <div className="absolute bottom-6 right-6 text-[10px] font-mono text-slate-500 bg-white border-2 border-black px-2.5 py-1.5 rounded-lg pointer-events-none shadow-[2px_2px_0px_rgba(0,0,0,1)] z-30 animate-fade-in" id="canvas-hud-instructions">
            Double-click empty space to draw card • Ctrl+C / Ctrl+V to Copy-Paste • Drag to arrange
          </div>
        )}

        {/* SVG connection edges overlay */}
        <div 
          className="absolute inset-0 pointer-events-none select-none z-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
          id="svg-edges-group-container"
        >
          <svg className="w-full h-full overflow-visible" id="canvas-edges-svg">
            <defs>
              <marker 
                id="arrow-trusted" 
                viewBox="0 0 10 10" 
                refX="6" 
                refY="5" 
                markerWidth="6" 
                markerHeight="6" 
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
              </marker>
              <marker 
                id="arrow-experimental" 
                viewBox="0 0 10 10" 
                refX="6" 
                refY="5" 
                markerWidth="6" 
                markerHeight="6" 
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
              </marker>
              <marker 
                id="arrow-default" 
                viewBox="0 0 10 10" 
                refX="6" 
                refY="5" 
                markerWidth="6" 
                markerHeight="6" 
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b" />
              </marker>
            </defs>

            {links.map((link) => {
              const fromNode = filteredNodes.find(n => n.id === link.fromNodeId);
              const toNode = filteredNodes.find(n => n.id === link.toNodeId);
              if (!fromNode || !toNode) return null;

              const ports = {
                from: getNodePorts(fromNode),
                to: getNodePorts(toNode)
              };

              // Calculate clean curve nodes
              const startX = ports.from.right.x;
              const startY = ports.from.right.y;
              const endX = ports.to.left.x;
              const endY = ports.to.left.y;

              const cp1x = startX + Math.max(50, (endX - startX) * 0.45);
              const cp1y = startY;
              const cp2x = endX - Math.max(50, (endX - startX) * 0.45);
              const cp2y = endY;

              const dAttribute = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

              // Determine edge color based on source node trust levels
              const isSourceTrusted = fromNode.status === 'trusted';
              const strokeColor = isSourceTrusted ? '#059669' : (fromNode.status === 'experimental' ? '#2563eb' : '#1e293b');
              const markerId = isSourceTrusted ? 'arrow-trusted' : (fromNode.status === 'experimental' ? 'arrow-experimental' : 'arrow-default');

              // Badge middle points
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;

              return (
                <g key={link.id} className="pointer-events-auto" id={`g-link-${link.id}`}>
                  {/* Outer glow background line */}
                  <path 
                    d={dAttribute}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="4"
                    className="opacity-0 hover:opacity-20 transition-opacity duration-200 cursor-pointer"
                  />
                  {/* Core connection indicator */}
                  <path 
                    d={dAttribute}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeDasharray={fromNode.status === 'experimental' ? '5 4' : undefined}
                    className="transition-colors duration-200"
                    markerEnd={`url(#${markerId})`}
                    markerStart={link.isBidirectional ? `url(#${markerId})` : undefined}
                  />

                  {/* Flowing Animation Particles */}
                  {/* Forward Request Flow Particle */}
                  <circle r="3" fill={strokeColor} opacity="0.85">
                    <animateMotion dur="3.5s" repeatCount="indefinite" path={dAttribute} />
                  </circle>

                  {/* Reverse Return Flow Particle (only for bidirectional) */}
                  {link.isBidirectional && (
                    <circle r="3" fill="#f59e0b" opacity="0.9">
                      <animateMotion 
                        dur="3.5s" 
                        repeatCount="indefinite" 
                        path={dAttribute} 
                        keyPoints="1;0" 
                        keyTimes="0;1" 
                        calcMode="linear" 
                      />
                    </circle>
                  )}

                  {/* Detach / Settings Link Badge Button in the middle */}
                  <g 
                    transform={`translate(${midX}, ${midY})`}
                    className="cursor-pointer group pointer-events-auto animate-fade-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLinkId(link.id);
                      setTempLinkLabel(link.label || '');
                      setTempLinkBidirectional(!!link.isBidirectional);
                    }}
                  >
                    <title>Connection settings (Click to edit label or toggle Bidirectional Round-Trip mode)</title>
                    <rect 
                      x={link.label ? -32 : -16} 
                      y="-11" 
                      width={link.label ? 64 : 32} 
                      height="22" 
                      rx="11" 
                      fill={link.isBidirectional ? "#fef3c7" : "#ffffff"} 
                      stroke={link.isBidirectional ? "#d97706" : "#475569"} 
                      strokeWidth="1.5"
                      className="group-hover:fill-amber-50 group-hover:stroke-amber-600 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
                    />
                    {link.isBidirectional ? (
                      <text 
                        className="text-[10px] select-none text-amber-600" 
                        textAnchor="middle" 
                        dominantBaseline="middle"
                        y="1"
                      >
                        🔄
                      </text>
                    ) : (
                      <path 
                        d="M -5 0 L 5 0 M 1 -3 L 5 0 L 1 3" 
                        fill="none" 
                        stroke="#475569" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="group-hover:stroke-black"
                      />
                    )}
                    {link.label ? (
                      <text 
                        className="text-[8px] font-mono font-black select-none bg-white p-1" 
                        fill="#1e293b" 
                        textAnchor="middle" 
                        dominantBaseline="middle"
                        y="-17"
                      >
                        {link.label}
                      </text>
                    ) : null}
                  </g>
                </g>
              );
            })}

            {/* Smart Alignment Guidelines */}
            {alignGuidesX.map((xVal, index) => (
              <line
                key={`align-guide-x-${index}`}
                x1={xVal}
                y1={-1000}
                x2={xVal}
                y2={3000}
                stroke="#2563eb"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                className="opacity-60"
              />
            ))}
            {alignGuidesY.map((yVal, index) => (
              <line
                key={`align-guide-y-${index}`}
                x1={-1000}
                y1={yVal}
                x2={3000}
                y2={yVal}
                stroke="#2563eb"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                className="opacity-60"
              />
            ))}
          </svg>
        </div>

        {/* Dynamic Nodes Workspace Layer */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
          id="canvas-active-cards-layer"
        >
          {filteredNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isTargetOfConnectState = linkingSourceId !== null && linkingSourceId !== node.id;
            
            return (
              <div
                key={node.id}
                style={{
                  left: node.positionX,
                  top: node.positionY,
                  position: 'absolute',
                  zIndex: draggingNodeId === node.id ? 100 : (isSelected ? 50 : 10)
                }}
                onMouseDown={(e) => handleNodeDragStart(e, node)}
                className={`canvas-node w-60 bg-white border-2 text-slate-800 rounded-lg pointer-events-auto flex flex-col group transition-[background-color,border-color,box-shadow,opacity] duration-150 shadow-md ${
                  isSelected 
                    ? 'border-blue-600 shadow-[4px_4px_0px_#2563eb] ring-2 ring-blue-600/15' 
                    : isTargetOfConnectState
                    ? 'border-purple-600 shadow-[4px_4px_0px_#a855f7] ring-4 ring-purple-500/15 animate-pulse'
                    : node.status === 'trusted'
                    ? 'border-black hover:border-emerald-600 shadow-[4px_4px_0px_#10b981]'
                    : node.status === 'experimental'
                    ? 'border-black hover:border-purple-600 shadow-[4px_4px_0px_#a855f7]'
                    : node.status === 'check_later'
                    ? 'border-black hover:border-[#D97706] shadow-[4px_4px_0px_#F59E0B]'
                    : 'border-slate-400 opacity-85 shadow-[3px_3px_0px_#000]'
                }`}
                id={`card-node-${node.id}`}
              >
                {/* Header info with inline delete */}
                <div className="flex items-center justify-between border-b-2 border-black px-3 py-2 bg-slate-50 rounded-t-lg" id={`node-head-${node.id}`}>
                  <div className="flex items-center gap-1.5" id={`node-title-group-${node.id}`}>
                    <span className="p-1 bg-white border border-slate-300 rounded shadow-[1px_1px_0px_#000]">
                      {getNodeIcon(node.type)}
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 select-none">
                      {node.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 select-none" onClick={(e) => e.stopPropagation()}>
                    {getStatusBadge(node.status)}
                    {confirmingDeleteNodeId === node.id ? (
                      <div className="flex items-center gap-1 bg-red-100 border border-red-300 px-1 py-0.5 rounded animate-fade-in text-[9px] font-bold font-mono text-red-700 shadow-sm" id={`delete-confirm-box-${node.id}`}>
                        <span className="mr-0.5 select-none">Sure?</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNode(node.id);
                            setConfirmingDeleteNodeId(null);
                          }}
                          className="px-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors cursor-pointer"
                          title="Confirm node deletion"
                          id={`delete-confirm-yes-${node.id}`}
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingDeleteNodeId(null);
                          }}
                          className="px-1 bg-slate-200 text-slate-800 rounded hover:bg-slate-300 transition-colors cursor-pointer"
                          title="Cancel"
                          id={`delete-confirm-no-${node.id}`}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingDeleteNodeId(node.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded cursor-pointer transition-colors"
                        title="Delete Node"
                        id={`delete-btn-${node.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Node body content */}
                <div className="p-3 flex-1 flex flex-col justify-between bg-white animate-fade-in" id={`node-body-${node.id}`}>
                  <div id={`node-info-${node.id}`}>
                    <h3 className="text-xs font-black text-black line-clamp-1 select-text">
                      {node.title || <span className="italic text-slate-400 font-medium">Untitled Node</span>}
                    </h3>

                    {(() => {
                      const matchingQueueLink = queueLinks.find(l => l.nodeId === node.id);
                      const matchingQueueResource = matchingQueueLink ? queueResources.find(r => r.id === matchingQueueLink.resourceId) : null;

                      if (!matchingQueueResource) return null;
                      return (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="mt-1.5 flex items-center gap-1 text-[8px] font-mono font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 rounded px-1.5 py-0.5 select-none w-max max-w-full pointer-events-auto transition-all cursor-help" 
                          title={`Linked Experimental Inbox Resource: ${matchingQueueResource.title}\nClick the Maximize/Expand Notebook icon or see Inspector to view details.`}
                        >
                          <span className="shrink-0">⚡ INBOX:</span>
                          <span className="truncate">{matchingQueueResource.title}</span>
                        </div>
                      );
                    })()}

                    {/* Tool specific Pricing Tier & Usage capacity badges */}
                    {node.type === 'tool' && (() => {
                      const tier = node.pricingTier || 'Free';
                      let tierBg = 'bg-purple-50/50 border-purple-200';
                      let badgeCls = 'text-purple-700 bg-purple-100 border-purple-250';
                      
                      if (tier === 'Free') {
                        tierBg = 'bg-emerald-50/40 border-emerald-200';
                        badgeCls = 'text-emerald-700 bg-emerald-100 border-emerald-150';
                      } else if (tier === 'Daily credits') {
                        tierBg = 'bg-indigo-50/40 border-indigo-200';
                        badgeCls = 'text-indigo-700 bg-indigo-100 border-indigo-150';
                      } else if (tier === 'Monthly credits') {
                        tierBg = 'bg-amber-50/40 border-amber-205';
                        badgeCls = 'text-amber-800 bg-amber-100 border-amber-150';
                      }
                      
                      return (
                        <div className={`mt-1.5 p-1 px-1.5 border rounded flex flex-col gap-0.5 text-[8.5px] font-mono leading-none ${tierBg}`} id={`tool-pricing-card-${node.id}`}>
                          <div className="flex items-center gap-1">
                            <span className={`font-extrabold uppercase tracking-tight px-1 py-0.5 rounded border ${badgeCls}`}>
                              ⚙️ {tier}
                            </span>
                          </div>
                          {node.approximateUses && (
                            <div className="text-[8px] font-bold text-slate-500 mt-1 truncate" title={`Approximate capacity limit: ${node.approximateUses}`}>
                              Capacity: <span className="text-slate-800">{node.approximateUses}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Image rendering inside image nodes */}
                    {node.type === 'image' && node.content && (
                      <div 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setPreviewImageUrl(node.content); 
                          setPreviewImageTitle(node.title || 'Image Preview'); 
                        }} 
                        onMouseDown={(e) => e.stopPropagation()}
                        className="my-1.5 border border-slate-200 rounded overflow-hidden max-h-32 bg-slate-50 flex items-center justify-center cursor-zoom-in select-none shadow-inner group/img relative" 
                        id={`node-image-container-${node.id}`}
                        title="Click to view full screen preview"
                      >
                        <img 
                          src={node.content} 
                          alt={node.title} 
                          referrerPolicy="no-referrer" 
                          className="object-contain w-full h-full max-h-32 transition-transform hover:scale-105" 
                          id={`node-image-img-${node.id}`}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold font-mono uppercase tracking-wider">
                          🔍 Click to Preview
                        </div>
                      </div>
                    )}

                    {/* Video embedding preview player or player trigger inside video nodes */}
                    {node.type === 'video' && (node.sourceUrl || node.content) && (
                      <div className="my-1.5 border border-slate-200 rounded overflow-hidden bg-slate-50 p-1 shadow-inner" id={`node-video-container-${node.id}`}>
                        {(() => {
                          const vidUrl = node.sourceUrl || node.content || '';
                          let ytId = '';
                          try {
                            const p = new URL(vidUrl);
                            if (p.hostname.includes('youtube.com')) {
                              ytId = p.searchParams.get('v') || '';
                            } else if (p.hostname.includes('youtu.be')) {
                              ytId = p.pathname.slice(1);
                            }
                          } catch (_) {}

                          if (ytId) {
                            return (
                              <iframe 
                                src={`https://www.youtube.com/embed/${ytId}`}
                                className="w-full h-24 rounded border-0 select-none pointer-events-auto"
                                title="Video Embed"
                                allowFullScreen
                                onMouseDown={(e) => e.stopPropagation()}
                                id={`node-video-iframe-${node.id}`}
                              />
                            );
                          }
                          return (
                            <a 
                              href={vidUrl} 
                              target="_blank" 
                              rel="referrer" 
                              className="text-[9px] text-rose-700 font-bold block bg-rose-50 hover:bg-rose-100 p-2 text-center rounded border border-rose-200 transition-all uppercase font-mono select-none pointer-events-auto"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              id={`node-video-action-${node.id}`}
                            >
                              ▶ View Media Source Link
                            </a>
                          );
                        })()}
                      </div>
                    )}

                    <p 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNodeDragStart) {
                          onNodeDragStart();
                        }
                        setActiveExpandedNode(node);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="text-[11px] text-slate-650 font-medium line-clamp-3 my-1.5 select-text leading-relaxed hover:bg-slate-50 hover:text-blue-700 p-1 rounded cursor-pointer transition-all border border-transparent hover:border-slate-200"
                      title="Click to expand details or edit"
                    >
                      {node.content || <span className="italic text-slate-400 font-mono">No content or details entered. Click to edit/expand notepad.</span>}
                    </p>
                  </div>

                  {/* Progress indicators and source URL if available */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between select-none" id={`node-meta-${node.id}`}>
                    <div className="flex items-center gap-3" id={`node-stats-${node.id}`}>
                      {node.rating > 0 && (
                        <div className="flex items-center gap-0.5" title={`Rating: ${node.rating}`}>
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                          <span className="text-[10px] font-mono font-bold text-slate-700">{node.rating}</span>
                        </div>
                      )}
                      {node.confidenceScore > 0 && (
                        <div className="flex items-center gap-1" title={`Confidence: ${node.confidenceScore}%`}>
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">C:</span>
                          <span className={`text-[10px] font-mono font-extrabold ${
                            node.confidenceScore >= 80 ? 'text-emerald-600' : (node.confidenceScore >= 50 ? 'text-amber-600' : 'text-rose-600')
                          }`}>
                            {node.confidenceScore}%
                          </span>
                        </div>
                      )}
                      
                      {/* Detailed edit notepad expand button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNodeDragStart) {
                            onNodeDragStart();
                          }
                          setActiveExpandedNode(node);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 hover:bg-neutral-900 hover:text-white border border-slate-300 hover:border-black rounded text-[9px] font-mono font-bold text-slate-700 transition-all cursor-pointer shadow-[1px_1px_0px_#000]"
                        title="Open full expanded document notepad"
                        id={`expand-notepad-btn-${node.id}`}
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                        <span>EXPAND</span>
                      </button>
                    </div>

                    {node.sourceUrl ? (
                      <a 
                        href={node.sourceUrl} 
                        target="_blank" 
                        rel="referrer" 
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors border border-transparent hover:border-slate-200"
                        title={node.sourceTitle || node.sourceUrl}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNodeLinkClick) onNodeLinkClick(node.id);
                        }}
                        id={`external-link-node-${node.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : null}
                  </div>
                </div>

                {/* Drawer bottom spacing placeholder */}
                <div className="h-2 bg-white rounded-b-lg" />

                {/* Decorative Anchor Output Port node right */}
                <div 
                  className="absolute -right-2 top-1/2 -mt-1.5 w-3 h-3 bg-white border-2 border-black hover:bg-black rounded-full cursor-crosshair z-20 transition-all pointer-events-auto"
                  title="Source connection edge anchor"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setLinkingSourceId(node.id);
                  }}
                  id={`anchor-right-${node.id}`}
                />

                {/* Decorative Anchor Input Port node left */}
                <div 
                  className="absolute -left-2 top-1/2 -mt-1.5 w-3 h-3 bg-white border-2 border-black hover:bg-black rounded-full cursor-crosshair z-20 transition-all pointer-events-auto"
                  title="Target connection edge anchor"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (linkingSourceId && linkingSourceId !== node.id) {
                      onAddLink(linkingSourceId, node.id);
                      setLinkingSourceId(null);
                    } else {
                      setLinkingSourceId(node.id);
                    }
                  }}
                  id={`anchor-left-${node.id}`}
                />

              </div>
            );
          })}

          {/* Connection Link Edit Popover */}
          {editingLinkId && (() => {
            const editingLink = links.find(l => l.id === editingLinkId);
            if (!editingLink) return null;
            
            const fromNode = filteredNodes.find(n => n.id === editingLink.fromNodeId);
            const toNode = filteredNodes.find(n => n.id === editingLink.toNodeId);
            if (!fromNode || !toNode) return null;

            const ports = {
              from: getNodePorts(fromNode),
              to: getNodePorts(toNode)
            };

            const startX = ports.from.right.x;
            const startY = ports.from.right.y;
            const endX = ports.to.left.x;
            const endY = ports.to.left.y;
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${midX}px`,
                  top: `${midY}px`,
                  transform: 'translate(-50%, -100%) translateY(-15px)',
                  zIndex: 9999,
                }}
                className="bg-white border-2 border-black rounded-lg p-3 w-64 shadow-[4px_4px_0px_#000] pointer-events-auto select-text animate-fade-in text-xs font-sans"
                onClick={(e) => e.stopPropagation()}
                id="link-details-popover-card"
              >
                <div className="flex items-center justify-between border-b pb-1.5 mb-2 font-mono text-[9px] uppercase tracking-wider font-extrabold text-slate-800">
                  <span>🔗 Link Properties</span>
                  <button 
                    type="button" 
                    onClick={() => setEditingLinkId(null)}
                    className="text-slate-400 hover:text-black font-extrabold cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Source -> destination description */}
                  <div className="text-[10px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-150">
                    From: <span className="font-bold text-slate-800">{fromNode.title}</span><br />
                    To: <span className="font-bold text-slate-800">{toNode.title}</span>
                  </div>

                  {/* Label Input */}
                  <div>
                    <label className="block text-[9px] font-sans font-bold uppercase tracking-wide text-slate-700 mb-1">
                      Connection Label
                    </label>
                    <input
                      type="text"
                      value={tempLinkLabel}
                      onChange={(e) => setTempLinkLabel(e.target.value)}
                      placeholder="e.g. Request payload, triggers, returns etc."
                      className="w-full bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-black rounded px-2 py-1 outline-none text-[11px] font-medium"
                    />
                  </div>

                  {/* Bidirectional Option Toggle */}
                  <div>
                    <label className="block text-[9px] font-sans font-bold uppercase tracking-wide text-slate-700 mb-1">
                      Flow Direction & Type
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-start gap-2 p-1.5 rounded border-2 border-slate-200 hover:border-black cursor-pointer bg-slate-50 hover:bg-amber-50/20">
                        <input
                          type="radio"
                          name="directionality"
                          checked={!tempLinkBidirectional}
                          onChange={() => setTempLinkBidirectional(false)}
                          className="mt-0.5 accent-amber-600 cursor-pointer"
                        />
                        <div className="leading-tight">
                          <span className="font-extrabold text-slate-800 text-[10.5px]">➡️ One-Way Flow</span>
                          <p className="text-[9px] text-slate-500 font-medium">Continuous forward pipeline progression</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-1.5 rounded border-2 border-slate-200 hover:border-black cursor-pointer bg-slate-50 hover:bg-amber-50/20">
                        <input
                          type="radio"
                          name="directionality"
                          checked={tempLinkBidirectional}
                          onChange={() => setTempLinkBidirectional(true)}
                          className="mt-0.5 accent-amber-600 cursor-pointer"
                        />
                        <div className="leading-tight">
                          <span className="font-extrabold text-amber-800 text-[10.5px]">🔄 Round-Trip / Bidirectional</span>
                          <p className="text-[9px] text-slate-500 font-medium">Sends request forward and returns a response/result backward</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Save and Delete Actions */}
                  <div className="flex items-center justify-between pt-2 border-t font-mono text-[9px]">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteLink(editingLink.id);
                        setEditingLinkId(null);
                      }}
                      className="flex items-center gap-1 hover:text-red-600 font-bold text-red-500 cursor-pointer"
                      title="Delete this link connection completely"
                    >
                      🗑️ Detach
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateLink) {
                          onUpdateLink(editingLink.id, {
                            label: tempLinkLabel.trim(),
                            isBidirectional: tempLinkBidirectional
                          });
                        }
                        setEditingLinkId(null);
                      }}
                      className="bg-black text-white px-2.5 py-1 rounded border border-black hover:bg-slate-800 font-bold cursor-pointer"
                    >
                      Apply Changes
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Full-screen Image Preview Lightbox Overlay */}
        {previewImageUrl && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 z-[999] animate-fade-in cursor-zoom-out select-none"
            onClick={() => setPreviewImageUrl(null)}
            id="image-lightbox-overlay"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(null); }}
              className="absolute top-5 right-5 p-3 bg-white/10 hover:bg-white/25 border border-white/20 hover:border-white text-white rounded-full transition-all cursor-pointer shadow-lg active:scale-95"
              title="Close Full Screen Preview"
              id="close-lightbox-btn"
            >
              <X className="w-6 h-6" />
            </button>

            <div 
              className="max-w-4xl max-h-[80vh] flex items-center justify-center border-4 border-white bg-slate-900 shadow-2xl rounded-lg overflow-hidden animate-scale-up" 
              onClick={(e) => e.stopPropagation()}
              id="lightbox-image-border"
            >
              <img 
                src={previewImageUrl} 
                alt={previewImageTitle} 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] object-contain cursor-default" 
                id="lightbox-main-img"
              />
            </div>

            <div className="mt-4 bg-white/95 border-2 border-black text-black px-6 py-2.5 rounded-lg shadow-[4px_4px_0px_#000] text-center max-w-lg select-text font-mono font-bold text-xs uppercase cursor-default" onClick={(e) => e.stopPropagation()}>
              🎨 {previewImageTitle || "Image Detail File"}
            </div>
          </div>
        )}

        {/* Detailed Notepad Reader & Editor Overlay Modal */}
        {(() => {
          const activeExpandedNodeCurrent = nodes.find(n => n.id === activeExpandedNode?.id) || null;
          if (!activeExpandedNodeCurrent) return null;

          return (
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[998] animate-fade-in pointer-events-auto"
              onClick={() => setActiveExpandedNode(null)}
              id="notepad-expanded-overlay"
            >
              <div 
                className="w-full max-w-2xl bg-[#fcfbf9] border-3 border-black rounded-lg shadow-[8px_8px_0px_#000] flex flex-col max-h-[85vh] overflow-hidden animate-scale-up pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                id="notepad-expanded-modal-box"
              >
                {/* Modal Header */}
                <div className="bg-amber-50/50 border-b-3 border-black px-5 py-4 flex items-center justify-between" id="notepad-modal-header">
                  <div className="flex items-center gap-2" id="notepad-modal-header-badge">
                    <span className="p-1 px-2.5 bg-black text-white text-[10px] font-mono font-black uppercase rounded tracking-wide">
                      {activeExpandedNodeCurrent.type} notepad
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      ID: {activeExpandedNodeCurrent.id}
                    </span>
                  </div>
                  <button 
                    onClick={() => setActiveExpandedNode(null)}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-black rounded border border-transparent hover:border-slate-300 transition-all cursor-pointer"
                    title="Close Notepad Overlay"
                    id="close-notepad-modal-btn"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body Scroll Container */}
                <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto" id="notepad-modal-body-container">
                  <div className="space-y-1" id="notepad-title-input-section">
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-500">Document Card Title</label>
                    <input 
                      type="text"
                      value={activeExpandedNodeCurrent.title}
                      onChange={(e) => onUpdateNode(activeExpandedNodeCurrent.id, { title: e.target.value })}
                      className="w-full bg-white border-2 border-black rounded-lg px-4 py-2.5 font-bold text-sm text-black outline-none focus:ring-2 focus:ring-blue-500/10 placeholder-slate-400"
                      placeholder="Enter document title..."
                      id="notepad-title-text-field"
                    />
                  </div>

                  {(() => {
                    const matchingQueueLinkCurrent = queueLinks.find(l => l.nodeId === activeExpandedNodeCurrent.id);
                    const matchingQueueResourceCurrent = matchingQueueLinkCurrent ? queueResources.find(r => r.id === matchingQueueLinkCurrent.resourceId) : null;

                    if (!matchingQueueResourceCurrent) return null;
                    return (
                      <div className="bg-purple-50 border-2 border-purple-200 p-3 rounded-lg flex flex-col gap-1 select-none animate-fade-in text-[11px] font-mono text-purple-950">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold uppercase tracking-wide text-[9px] text-purple-700 flex items-center gap-1">
                            ⚡ LINKED EXPERIMENTAL INBOX RESOURCE
                          </span>
                          <span className="text-[8px] bg-purple-100 border border-purple-300 px-1 py-0.5 rounded uppercase font-black">
                            {matchingQueueResourceCurrent.type}
                          </span>
                        </div>
                        <div className="font-bold text-black text-xs font-sans mt-1">
                          {matchingQueueResourceCurrent.title}
                        </div>
                        {matchingQueueResourceCurrent.shortSummary && (
                          <div className="text-[10px] text-purple-800 mt-0.5 leading-relaxed font-sans">
                            {matchingQueueResourceCurrent.shortSummary}
                          </div>
                        )}
                        {matchingQueueResourceCurrent.url && (
                          <a 
                            href={matchingQueueResourceCurrent.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 mt-2 font-bold text-purple-600 hover:text-purple-900 border border-purple-300 hover:border-purple-600 rounded bg-white px-2 py-0.5 self-start text-[9px] pointer-events-auto"
                          >
                            🔗 Launch Original Source
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex-1 flex flex-col gap-1 min-h-[250px]" id="notepad-desc-input-section">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Document Body Content (Fully Scrollable Reader & Editor)</label>
                      <span className="text-[9px] font-mono font-bold text-slate-400">Autosaves live</span>
                    </div>
                    <textarea 
                      value={activeExpandedNodeCurrent.content}
                      onChange={(e) => onUpdateNode(activeExpandedNodeCurrent.id, { content: e.target.value })}
                      className="w-full flex-1 bg-white border-2 border-black rounded-lg p-4 font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/10 leading-relaxed resize-none h-full shadow-inner"
                      placeholder="Type or paste your markdown note, checklists, guides, or workspace descriptions here..."
                      id="notepad-body-textarea-field"
                    />
                  </div>

                  {/* Additional Helper info */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-slate-500 font-mono text-[9px]" id="notepad-meta-grid">
                    <div>
                      <span className="font-bold uppercase block text-slate-400">Created At</span>
                      <span>{new Date(activeExpandedNodeCurrent.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-bold uppercase block text-slate-400">Last Revised</span>
                      <span>{new Date(activeExpandedNodeCurrent.updatedAt || activeExpandedNodeCurrent.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="border-t-3 border-black bg-slate-50 px-6 py-4 flex items-center justify-between" id="notepad-modal-footer">
                  <span className="text-[10px] font-mono text-slate-500">
                    ⚡ Type freely. Changes are saved back to your canvas board live.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveExpandedNode(null)}
                    className="py-2 px-5 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-lg border-2 border-black cursor-pointer shadow-[3px_3px_0px_#bbb] active:translate-y-[1px] active:shadow-[1px_1px_0px_#bbb]"
                    id="close-notepad-modal-footer-btn"
                  >
                    Done Editing
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
