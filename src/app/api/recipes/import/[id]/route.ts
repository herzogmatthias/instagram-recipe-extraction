import { NextRequest, NextResponse } from "next/server";
import {
  updateImport,
  getImport,
  deleteImport,
} from "@/lib/server/services/firestore";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const permanent = request.nextUrl.searchParams.get("permanent") === "true";

    console.log(
      `[DELETE /api/recipes/import/${id}] Received ${
        permanent ? "permanent deletion" : "cancellation"
      } request`
    );

    if (!id) {
      return NextResponse.json(
        { error: "Import ID is required" },
        { status: 400 }
      );
    }

    // Check if import exists
    const importDoc = await getImport(id);
    if (!importDoc) {
      console.log(`[DELETE /api/recipes/import/${id}] Import not found`);
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    // Permanent deletion
    if (permanent) {
      console.log(
        `[DELETE /api/recipes/import/${id}] Permanently deleting import`
      );
      await deleteImport(id);
      console.log(
        `[DELETE /api/recipes/import/${id}] Successfully deleted permanently`
      );
      return NextResponse.json(
        { message: "Import deleted permanently", id },
        { status: 200 }
      );
    }

    // Cancellation (for active imports)
    console.log(
      `[DELETE /api/recipes/import/${id}] Current status: ${importDoc.status}`
    );

    // Only allow cancellation if the import is still in progress
    const cancellableStatuses = [
      "queued",
      "scraping",
      "downloading_media",
      "uploading_media",
      "extracting",
    ];
    if (!cancellableStatuses.includes(importDoc.status)) {
      console.log(
        `[DELETE /api/recipes/import/${id}] Cannot cancel - status is ${importDoc.status}`
      );
      return NextResponse.json(
        {
          error: `Cannot cancel import with status: ${importDoc.status}`,
          status: importDoc.status,
        },
        { status: 400 }
      );
    }

    // Update the import to mark it as cancelled
    console.log(
      `[DELETE /api/recipes/import/${id}] Marking as cancelled in Firestore`
    );
    await updateImport(id, {
      status: "failed",
      error: "Import cancelled by user",
      progress: 0,
    });

    console.log(`[DELETE /api/recipes/import/${id}] Successfully cancelled`);
    return NextResponse.json(
      { message: "Import cancelled successfully", id },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel import.";
    console.error("Error cancelling import:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
