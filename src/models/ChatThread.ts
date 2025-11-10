/**
 * Chat thread and message models for recipe discussions
 */

export type ThreadScope = "original" | "variant";

export type MessageRole = "user" | "assistant" | "tool" | "system";

export interface MessageAttachment {
  type: "recipe-ref" | "image" | "link";
  recipeId?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
  result?: {
    recipeId?: string;
    [key: string]: unknown;
  };
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: MessageAttachment[];
  functionCalls?: FunctionCall[];
  createdAt: number;
  createdBy: string;
}

export interface ChatThread {
  id: string;
  scope: ThreadScope;
  targetId: string; // original recipe id or variant id
  rootId: string; // always the original recipe id
  title: string;
  lastMessageAt: number;
  createdBy: string;
  createdAt: number;
}

export interface CreateThreadInput {
  scope: ThreadScope;
  targetId: string;
  rootId: string;
  title: string;
  createdBy: string;
}

export interface CreateMessageInput {
  role: MessageRole;
  content: string;
  attachments?: MessageAttachment[];
  functionCalls?: FunctionCall[];
  createdBy: string;
}
