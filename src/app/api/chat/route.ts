import { NextRequest } from "next/server";
import { streamChatWithRecipe } from "@/lib/server/services/gemini/chatbot";
import {
  getOrCreateThread,
  addMessage,
} from "@/lib/server/services/firestore/threads";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipeId, variantId, message, history, recipeData, toolResponse } =
      body;

    // Handle tool response messages (accept/reject variant)
    if (toolResponse) {
      // Tool responses ALWAYS go to the original thread where the conversation happened
      // The variant was created from the original thread, so the accept/reject should be there too
      const scope: "original" | "variant" = "original";
      const targetId = recipeId;

      const thread = await getOrCreateThread({
        scope,
        targetId,
        rootId: recipeId,
        title: `Recipe Discussion`,
        createdBy: "anonymous",
      });

      // Save tool response message
      await addMessage(thread.id, {
        role: "tool",
        content: toolResponse.response.message,
        createdBy: "system",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!recipeId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing recipeId or message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get or create thread based on recipeData.isOriginal flag and variantId
    // If isOriginal is true or undefined, use original scope
    // If isOriginal is false AND variantId exists, use variant scope
    const scope: "original" | "variant" =
      recipeData?.isOriginal === false && variantId ? "variant" : "original";
    const targetId = scope === "variant" && variantId ? variantId : recipeId;

    const thread = await getOrCreateThread({
      scope,
      targetId,
      rootId: recipeId,
      title: `Recipe Discussion`,
      createdBy: "anonymous", // TODO: Add auth
    });

    // Save user message to thread
    await addMessage(thread.id, {
      role: "user",
      content: message,
      createdBy: "anonymous",
    });

    const encoder = new TextEncoder();
    let assistantContent = "";
    const executedFunctionCalls: {
      name: string;
      args: Record<string, unknown>;
      result?: Record<string, unknown>;
    }[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamGenerator = streamChatWithRecipe({
            recipeId,
            variantId,
            message,
            history: history || [],
            recipeData,
          });

          for await (const chunk of streamGenerator) {
            // Accumulate assistant content
            if (chunk.type === "content" && chunk.content) {
              assistantContent += chunk.content;
            }

            if (
              chunk.type === "function_execution" &&
              chunk.function_call
            ) {
              executedFunctionCalls.push({
                name: chunk.function_call.name,
                args: chunk.function_call.args,
                result: chunk.function_call.result,
              });
            }

            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Save assistant message to thread after streaming completes
          if (assistantContent || executedFunctionCalls.length > 0) {
            await addMessage(thread.id, {
              role: "assistant",
              content: assistantContent,
              createdBy: "assistant",
              functionCalls:
                executedFunctionCalls.length > 0
                  ? executedFunctionCalls
                  : undefined,
            });
          }

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorData = `data: ${JSON.stringify({
            error: "Failed to process chat message",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat message" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
