/**
 * Firestore operations for chat threads and messages
 */

import { getFirestore } from "./client";
import type {
  ChatThread,
  ChatMessage,
  CreateThreadInput,
  CreateMessageInput,
} from "@/models/ChatThread";

const THREADS_COLLECTION = "threads";

/**
 * Get or create a thread for a recipe (original or variant)
 */
export async function getOrCreateThread(
  input: CreateThreadInput
): Promise<ChatThread> {
  const db = getFirestore();
  const threadsRef = db.collection(THREADS_COLLECTION);

  // Try to find existing thread
  const existingQuery = await threadsRef
    .where("scope", "==", input.scope)
    .where("targetId", "==", input.targetId)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    return existingQuery.docs[0].data() as ChatThread;
  }

  // Create new thread
  const threadId = `t_${input.scope}_${input.targetId}`;
  const now = Date.now();

  const newThread: ChatThread = {
    id: threadId,
    scope: input.scope,
    targetId: input.targetId,
    rootId: input.rootId,
    title: input.title,
    lastMessageAt: now,
    createdBy: input.createdBy,
    createdAt: now,
  };

  await threadsRef.doc(threadId).set(newThread);

  return newThread;
}

/**
 * Get thread by ID
 */
export async function getThread(threadId: string): Promise<ChatThread | null> {
  const db = getFirestore();
  const doc = await db.collection(THREADS_COLLECTION).doc(threadId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as ChatThread;
}

/**
 * Find thread by scope and targetId without creating it
 */
export async function findThread(
  scope: "original" | "variant",
  targetId: string
): Promise<ChatThread | null> {
  const db = getFirestore();
  const threadsRef = db.collection(THREADS_COLLECTION);

  const query = await threadsRef
    .where("scope", "==", scope)
    .where("targetId", "==", targetId)
    .limit(1)
    .get();

  if (query.empty) {
    return null;
  }

  return query.docs[0].data() as ChatThread;
}

/**
 * Get all threads for a recipe (original and all variants)
 */
export async function getThreadsForRecipe(
  rootId: string
): Promise<ChatThread[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection(THREADS_COLLECTION)
    .where("rootId", "==", rootId)
    .orderBy("lastMessageAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as ChatThread);
}

/**
 * Add a message to a thread
 */
export async function addMessage(
  threadId: string,
  input: CreateMessageInput
): Promise<ChatMessage> {
  const db = getFirestore();
  const messagesRef = db
    .collection(THREADS_COLLECTION)
    .doc(threadId)
    .collection("messages");

  const messageId = `m_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const now = Date.now();

  const newMessage: ChatMessage = {
    id: messageId,
    role: input.role,
    content: input.content,
    attachments: input.attachments,
    functionCalls: input.functionCalls,
    createdAt: now,
    createdBy: input.createdBy,
  };

  // Add message
  await messagesRef.doc(messageId).set(newMessage);

  // Update thread's lastMessageAt
  await db
    .collection(THREADS_COLLECTION)
    .doc(threadId)
    .update({ lastMessageAt: now });

  return newMessage;
}

/**
 * Get messages for a thread
 */
export async function getMessages(
  threadId: string,
  limit: number = 50,
  startAfter?: number
): Promise<ChatMessage[]> {
  const db = getFirestore();
  let query = db
    .collection(THREADS_COLLECTION)
    .doc(threadId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(limit);

  if (startAfter) {
    query = query.startAfter(startAfter);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => doc.data() as ChatMessage);
}

/**
 * Update a message (e.g., to add function call results)
 */
export async function updateMessage(
  threadId: string,
  messageId: string,
  updates: Partial<ChatMessage>
): Promise<void> {
  const db = getFirestore();
  await db
    .collection(THREADS_COLLECTION)
    .doc(threadId)
    .collection("messages")
    .doc(messageId)
    .update(updates);
}

/**
 * Delete a thread and all its messages
 */
export async function deleteThread(threadId: string): Promise<void> {
  const db = getFirestore();
  const threadRef = db.collection(THREADS_COLLECTION).doc(threadId);

  console.log(`Starting deletion of thread ${threadId}`);

  // Delete all messages first
  const messagesSnapshot = await threadRef.collection("messages").get();
  console.log(`Found ${messagesSnapshot.docs.length} messages to delete`);

  const batch = db.batch();

  messagesSnapshot.docs.forEach((doc) => {
    console.log(`Queueing message ${doc.id} for deletion`);
    batch.delete(doc.ref);
  });

  // Delete the thread
  console.log(`Queueing thread ${threadId} for deletion`);
  batch.delete(threadRef);

  await batch.commit();
  console.log(`Successfully deleted thread ${threadId} and all messages`);
}
