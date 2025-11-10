"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import type {
  RecipeChatbotProps,
  ChatMessage,
  VariantPreview,
} from "./RecipeChatbot.types";
import {
  QUICK_PROMPTS,
  createUserMessage,
  formatTimestamp,
} from "./RecipeChatbot.utils";
import { useRecipeVariant } from "@/components/recipe-variant-provider/RecipeVariantProvider";

const snapPoints = ["350px", 0.5, 0.75, 1];

export function RecipeChatbot({
  recipeId,
  recipeName,
  activeRecipeData,
  originalRecipeData,
  className,
}: RecipeChatbotProps) {
  const { isOriginal, activeVariantId } = useRecipeVariant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [variantPreview, setVariantPreview] = useState<VariantPreview | null>(
    null
  );
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<number | string | null>(snapPoints[0]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load thread and messages on mount or when variant changes
  useEffect(() => {
    const loadThread = async () => {
      try {
        const params = new URLSearchParams({
          recipeId,
          isOriginal: String(isOriginal),
        });

        if (activeVariantId && !isOriginal) {
          params.append("variantId", activeVariantId);
        }

        console.log("Loading thread:", {
          recipeId,
          isOriginal,
          activeVariantId,
        });

        const response = await fetch(`/api/threads?${params}`);
        if (!response.ok) {
          throw new Error("Failed to load thread");
        }

        const data = await response.json();

        // Convert stored messages to component format
        const storedMessages: ChatMessage[] = data.messages.map(
          (msg: {
            id: string;
            role: string;
            content: string;
            createdAt: number;
            functionCalls?: Array<{
              name: string;
              args: Record<string, unknown>;
            }>;
          }) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.createdAt).toISOString(),
            variantId: activeVariantId,
            functionCalls: msg.functionCalls,
          })
        );

        setMessages(storedMessages);
      } catch (error) {
        console.error("Failed to load thread:", error);
      }
    };

    loadThread();

    // Note: We don't need variantChanged event listener anymore
    // because the useEffect dependency array handles variant changes
  }, [recipeId, activeVariantId, isOriginal]);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = createUserMessage(content, activeVariantId);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Create a placeholder message for streaming
    const assistantMessageId = `msg_${Date.now()}`;
    let messageAdded = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          variantId: isOriginal ? null : activeVariantId,
          message: content,
          history: messages,
          recipeData: activeRecipeData
            ? { ...activeRecipeData, isOriginal }
            : { isOriginal },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body received from server");
      }

      let assistantContent = "";

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                // Show error in chat
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantMessageId,
                    role: "system",
                    content: `⚠️ Error: ${data.error}`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
                setIsLoading(false);
                return; // Stop processing
              }

              if (data.type === "content" && data.content) {
                assistantContent += data.content;

                // Add or update the message
                if (!messageAdded) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: "assistant",
                      content: assistantContent,
                      timestamp: new Date().toISOString(),
                      variantId: activeVariantId,
                    },
                  ]);
                  messageAdded = true;
                  setIsLoading(false); // Stop showing "thinking..." once we start receiving content
                } else {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: assistantContent }
                        : msg
                    )
                  );
                }
              }

              if (data.type === "variant_preview" && data.variant) {
                setVariantPreview({
                  name: data.variant.name,
                  recipe_data: data.variant.recipe_data,
                  changes: data.variant.changes,
                  variantId: data.variant.id,
                });
              }

              if (data.type === "done") {
                break;
              }
            } catch (parseError) {
              console.error("Failed to parse streaming data:", parseError);
              // Continue processing other chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "system",
          content: `⚠️ ${errorMessage}. Please try again.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    handleSendMessage(prompt);
  };

  // Listen for prefill events from quick actions or other sources
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ prompt: string; source?: string }>;
      if (custom.detail?.prompt) {
        setInput(custom.detail.prompt);
        // Open drawer but do not auto-send; user can edit before sending
        setIsOpen(true);
        // Focus input shortly after opening
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("chatbot:prefill", handler);
    return () => window.removeEventListener("chatbot:prefill", handler);
  }, []);

  const handleAcceptVariant = async () => {
    if (!variantPreview) return;

    try {
      // Step 1: Create the variant thread immediately upon acceptance
      const threadResponse = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          variantId: variantPreview.variantId,
          scope: "variant",
        }),
      });

      if (!threadResponse.ok) {
        throw new Error("Failed to create variant thread");
      }

      // Step 2: Send tool response to the ORIGINAL thread where variant was created
      const toolResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          variantId: null,
          message: "",
          history: messages,
          recipeData: { isOriginal: true },
          toolResponse: {
            name: "create_recipe_variant",
            response: {
              success: true,
              variantId: variantPreview.variantId,
              message: `Variant "${variantPreview.name}" was accepted by the user.`,
            },
          },
        }),
      });

      if (!toolResponse.ok) {
        throw new Error("Failed to save acceptance response");
      }

      // Step 3: Notify parent component about new variant
      window.dispatchEvent(
        new CustomEvent("variantCreated", {
          detail: {
            variantId: variantPreview.variantId,
            variant: {
              id: variantPreview.variantId,
              name: variantPreview.name,
              recipe_data: variantPreview.recipe_data,
            },
          },
        })
      );

      setVariantPreview(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `tool_${Date.now()}`,
          role: "tool",
          content: `Variant "${variantPreview.name}" was accepted and created successfully.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Variant acceptance error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: "system",
          content: `⚠️ Failed to accept variant: ${errorMessage}. The variant may not have been saved properly.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Don't clear the preview so user can try again
    }
  };

  const handleRejectVariant = async () => {
    if (!variantPreview) return;

    const variantName = variantPreview.name;
    const variantId = variantPreview.variantId;

    try {
      // Delete the variant from Firestore since user rejected it
      const deleteResponse = await fetch(
        `/api/recipes/${recipeId}/variants/${variantId}`,
        {
          method: "DELETE",
        }
      );

      if (!deleteResponse.ok) {
        throw new Error("Failed to delete variant");
      }

      // Send tool response to API - tool responses go to the ORIGINAL thread
      const toolResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          variantId: null,
          message: "",
          history: messages,
          recipeData: { isOriginal: true },
          toolResponse: {
            name: "create_recipe_variant",
            response: {
              success: false,
              message: `Variant "${variantName}" was rejected by the user.`,
            },
          },
        }),
      });

      if (!toolResponse.ok) {
        console.warn(
          "Failed to save rejection response, but variant was deleted"
        );
      }

      setVariantPreview(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `tool_${Date.now()}`,
          role: "tool",
          content: `Variant "${variantName}" was rejected by the user.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error rejecting variant:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: "system",
          content: `⚠️ Failed to reject variant: ${errorMessage}. Please try deleting it from the variant dropdown if it still appears.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Still clear the preview since rejection attempt was made
      setVariantPreview(null);
    }
  };

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      modal={false}
      dismissible={true}
      open={isOpen}
      onOpenChange={(open) => setIsOpen(open)}
      {...(isMobile && {
        snapPoints: snapPoints,
        activeSnapPoint: snap,
        setActiveSnapPoint: setSnap,
      })}
    >
      <DrawerTrigger asChild>
        <Button
          className={cn(
            "fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg",
            className
          )}
          size="icon"
          aria-label="Open recipe chat"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="size-6" />
        </Button>
      </DrawerTrigger>

      <DrawerContent
        className={cn(
          "flex fixed outline-none",
          isMobile
            ? "inset-x-0 bottom-0 mt-24 h-full rounded-t-[10px]"
            : "top-4 bottom-4 right-4 w-[500px] rounded-l-[10px]"
        )}
        style={
          !isMobile
            ? ({
                "--initial-transform": "calc(100% + 8px)",
              } as React.CSSProperties)
            : undefined
        }
      >
        <DrawerHeader className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <div className="flex-1">
              <DrawerTitle className="text-base">Recipe Assistant</DrawerTitle>
              <DrawerDescription className="text-xs">
                {recipeName}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Hi! I can help you modify this recipe. Try asking me to:
              </p>
              <div className="grid gap-2">
                {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    className="justify-start text-left text-xs"
                    disabled={isLoading}
                  >
                    {prompt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages
            .filter((msg) => {
              // Don't display assistant messages with function calls or empty content
              if (
                msg.role === "assistant" &&
                (msg.functionCall || !msg.content.trim())
              ) {
                return false;
              }
              return true;
            })
            .map((message) => (
              <div
                data-vaul-no-drag
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Customize markdown styling
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="my-2 ml-4 list-disc">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="my-2 ml-4 list-decimal">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="mb-1">{children}</li>
                          ),
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="rounded bg-muted-foreground/10 px-1 py-0.5 text-xs font-mono">
                                {children}
                              </code>
                            ) : (
                              <code className="block rounded bg-muted-foreground/10 p-2 text-xs font-mono overflow-x-auto">
                                {children}
                              </code>
                            );
                          },
                          strong: ({ children }) => (
                            <strong className="font-semibold">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-lg font-bold mb-2">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-base font-bold mb-2">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-semibold mb-1">
                              {children}
                            </h3>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p className="mt-1 text-xs opacity-70">
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

          {/* Variant Preview */}
          {variantPreview && (
            <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h4 className="text-sm font-semibold">
                  New Variant Preview: {variantPreview.name}
                </h4>
              </div>

              {/* Changes Summary */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Key Changes:
                </p>
                <div className="space-y-1">
                  {variantPreview.changes.map((change, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{change}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipe Details Comparison */}
              {originalRecipeData && (
                <div className="space-y-2 text-xs border-t pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {variantPreview.recipe_data.servings?.value !==
                      originalRecipeData.servings?.value && (
                      <div>
                        <span className="text-muted-foreground">
                          Servings:{" "}
                        </span>
                        <span className="line-through text-red-600">
                          {originalRecipeData.servings?.value}
                        </span>
                        <span className="ml-1 text-green-600 font-medium">
                          {variantPreview.recipe_data.servings?.value}
                        </span>
                      </div>
                    )}
                    {variantPreview.recipe_data.prep_time_min !==
                      originalRecipeData.prep_time_min && (
                      <div>
                        <span className="text-muted-foreground">Prep: </span>
                        <span className="line-through text-red-600">
                          {originalRecipeData.prep_time_min}m
                        </span>
                        <span className="ml-1 text-green-600 font-medium">
                          {variantPreview.recipe_data.prep_time_min}m
                        </span>
                      </div>
                    )}
                    {variantPreview.recipe_data.cook_time_min !==
                      originalRecipeData.cook_time_min && (
                      <div>
                        <span className="text-muted-foreground">Cook: </span>
                        <span className="line-through text-red-600">
                          {originalRecipeData.cook_time_min}m
                        </span>
                        <span className="ml-1 text-green-600 font-medium">
                          {variantPreview.recipe_data.cook_time_min}m
                        </span>
                      </div>
                    )}
                    {variantPreview.recipe_data.difficulty !==
                      originalRecipeData.difficulty && (
                      <div>
                        <span className="text-muted-foreground">
                          Difficulty:{" "}
                        </span>
                        <span className="line-through text-red-600">
                          {originalRecipeData.difficulty}
                        </span>
                        <span className="ml-1 text-green-600 font-medium">
                          {variantPreview.recipe_data.difficulty}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {variantPreview.recipe_data.ingredients.length} ingredients,{" "}
                    {variantPreview.recipe_data.steps.length} steps
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleAcceptVariant}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  ✓ Accept Variant
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRejectVariant}
                  disabled={isLoading}
                  className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                >
                  ✗ Reject
                </Button>
              </div>
            </div>
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

        {/* Input */}
        <div className="mt-auto border-t border-border p-6">
          <form
            data-vaul-no-drag
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about this recipe..."
              disabled={isLoading}
              className="flex-1"
              ref={inputRef}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
