export type NodeType = 'step' | 'note' | 'link' | 'image' | 'video' | 'tool';
export type NodeStatus = 'trusted' | 'experimental' | 'archived';

export interface Workflow {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'completed' | 'draft';
  rating: number; // 0 to 5
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export interface WorkflowNode {
  id: string;
  workflowId: string;
  type: NodeType;
  title: string;
  content: string;
  summary?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  confidenceScore: number; // 0 to 100
  rating: number; // 1 to 5
  status: NodeStatus;
  positionX: number;
  positionY: number;
  tags: string[];
  reviews?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface NodeLink {
  id: string;
  workflowId: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionName: string;
  createdAt: string;
  nodes: WorkflowNode[];
  links: NodeLink[];
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface NodeReview {
  id: string;
  nodeId: string;
  score: number; // 1 to 5
  notes: string;
  createdAt: string;
}

export type ResourceType = 'article' | 'video' | 'tool' | 'note' | 'link';
export type ResourceStatus = 'inbox' | 'experimental' | 'tested' | 'trusted' | 'archived' | 'deleted';

export interface QueueResource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  shortSummary: string;
  tags: string[];
  rating: number; // 0 to 5
  notes: string;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceReview {
  id: string;
  resourceId: string;
  reviewedAt: string;
  notes: string;
  isUseful: boolean;
}

export interface ResourceLinkToNode {
  id: string;
  resourceId: string;
  workflowId: string;
  nodeId: string;
  linkedAt: string;
}

