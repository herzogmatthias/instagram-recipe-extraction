"use client";

import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { QuickPrompts } from "./QuickPrompts";
import { VariantPreviewCard } from "./VariantPreviewCard";
import type {
  ChatMessage as ChatMessageType,
  VariantPreview,
} from "./RecipeChatbot.types";
import type { RecipeData } from "@/models/InstagramRecipePost";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  variantPreview: VariantPreview | null;
  originalRecipeData: RecipeData | null | undefined;
  onQuickPrompt: (prompt: string) => void;
  onAcceptVariant: () => void;
  onRejectVariant: () => void;
}

export function ChatMessageList({
  messages,
  isLoading,
  variantPreview,
  originalRecipeData,
  onQuickPrompt,
  onAcceptVariant,
  onRejectVariant,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const displayMessages = messages.filter((msg) => {
    // Don't display assistant messages with function calls or empty content
    if (msg.role === "assistant" && (msg.functionCall || !msg.content.trim())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-6">
      {messages.length === 0 && (
        <QuickPrompts onSelectPrompt={onQuickPrompt} isLoading={isLoading} />
      )}

      {displayMessages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {variantPreview && (
        <VariantPreviewCard
          variantPreview={variantPreview}
          originalRecipeData={originalRecipeData}
          isLoading={isLoading}
          onAccept={onAcceptVariant}
          onReject={onRejectVariant}
        />
      )}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
