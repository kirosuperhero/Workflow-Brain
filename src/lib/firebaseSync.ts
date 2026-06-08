import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Workflow, WorkflowNode, NodeLink, WorkflowVersion, QueueResource, ResourceReview, ResourceLinkToNode } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CloudWorkspace {
  workflows: Workflow[];
  nodes: WorkflowNode[];
  links: NodeLink[];
  versions: WorkflowVersion[];
}

export interface CloudQueue {
  queueResources: QueueResource[];
  queueReviews: ResourceReview[];
  queueLinks: ResourceLinkToNode[];
}

/**
 * Saves the entire workspace configuration to Firestore under a consolidated document path
 * to maximize performance, save network queries, and bypass quota limits while ensuring complete consistency.
 */
export async function saveWorkspaceToCloud(
  userId: string,
  workflows: Workflow[],
  nodes: WorkflowNode[],
  links: NodeLink[],
  versions: WorkflowVersion[]
): Promise<void> {
  const path = `users/${userId}/state/workspace`;
  try {
    const docRef = doc(db, 'users', userId, 'state', 'workspace');
    await setDoc(docRef, {
      workflows,
      nodes,
      links,
      versions,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Loads the user workspace configuration from Firestore
 */
export async function loadWorkspaceFromCloud(userId: string): Promise<CloudWorkspace | null> {
  const path = `users/${userId}/state/workspace`;
  try {
    const docRef = doc(db, 'users', userId, 'state', 'workspace');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        workflows: data.workflows || [],
        nodes: data.nodes || [],
        links: data.links || [],
        versions: data.versions || []
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Saves the experimental queue lists to the cloud
 */
export async function saveQueueToCloud(
  userId: string,
  queueResources: QueueResource[],
  queueReviews: ResourceReview[],
  queueLinks: ResourceLinkToNode[]
): Promise<void> {
  const path = `users/${userId}/state/queue_resources`;
  try {
    const docRef = doc(db, 'users', userId, 'state', 'queue_resources');
    await setDoc(docRef, {
      queueResources,
      queueReviews,
      queueLinks,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Loads the experimental queue configuration from Firestore
 */
export async function loadQueueFromCloud(userId: string): Promise<CloudQueue | null> {
  const path = `users/${userId}/state/queue_resources`;
  try {
    const docRef = doc(db, 'users', userId, 'state', 'queue_resources');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        queueResources: data.queueResources || [],
        queueReviews: data.queueReviews || [],
        queueLinks: data.queueLinks || []
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}
