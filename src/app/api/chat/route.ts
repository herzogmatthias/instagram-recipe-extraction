import { NextRequest } from "next/server";
import { streamChatWithRecipe } from "@/lib/server/services/gemini/chatbot";
import {
  getOrCreateThread,
  addMessage,
} from "@/lib/server/services/firestore/threads";
import { createVariant } from "@/lib/server/services/firestore/operations";
import type { RecipeData } from "@/models/InstagramRecipePost";

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
    let functionCallData: {
      name: string;
      args: Record<string, unknown>;
    } | null = null;

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

            // Handle function calls
            if (chunk.type === "function_call" && chunk.function_call) {
              functionCallData = chunk.function_call;

              // Execute the function call
              if (functionCallData.name === "create_recipe_variant") {
                try {
                  const args = functionCallData.args as {
                    variant_name: string;
                    recipe_data: RecipeData;
                    changes_summary: string[];
                  };

                  // Create the variant in Firestore
                  const newVariant = await createVariant({
                    recipeId,
                    name: args.variant_name,
                    recipe_data: args.recipe_data,
                    isOriginal: false,
                  });

                  // Send variant preview to client
                  const previewData = `data: ${JSON.stringify({
                    type: "variant_preview",
                    variant: {
                      id: newVariant.id,
                      name: args.variant_name,
                      recipe_data: args.recipe_data,
                      changes: args.changes_summary,
                    },
                  })}\n\n`;
                  controller.enqueue(encoder.encode(previewData));
                } catch (error) {
                  console.error("Error creating variant:", error);
                  const errorData = `data: ${JSON.stringify({
                    type: "error",
                    error: "Failed to create variant",
                  })}\n\n`;
                  controller.enqueue(encoder.encode(errorData));
                }
              }
            }

            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Save assistant message to thread after streaming completes
          if (assistantContent || functionCallData) {
            await addMessage(thread.id, {
              role: "assistant",
              content: assistantContent,
              createdBy: "assistant",
              functionCalls: functionCallData
                ? [
                    {
                      name: functionCallData.name,
                      args: functionCallData.args,
                    },
                  ]
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
