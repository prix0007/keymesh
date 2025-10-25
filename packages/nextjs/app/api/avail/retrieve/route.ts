import { NextRequest, NextResponse } from "next/server";
import { MockAvailService } from "@/lib/services/mockAvailService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const blockNumber = searchParams.get("blockNumber");
    const txIndex = searchParams.get("txIndex");

    if (!blockNumber || !txIndex) {
      return NextResponse.json({ success: false, error: "Missing blockNumber or txIndex" }, { status: 400 });
    }

    const availService = new MockAvailService();
    const result = await availService.retrievePiece(parseInt(blockNumber), parseInt(txIndex));

    // Convert Uint8Array to base64 for transmission
    if (result.success && result.data) {
      const base64Data = btoa(String.fromCharCode(...result.data));
      return NextResponse.json({
        ...result,
        data: base64Data,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in Avail retrieve API:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blockNumber, txIndex, expectedHash } = body;

    if (!blockNumber || txIndex === undefined) {
      return NextResponse.json({ success: false, error: "Missing blockNumber or txIndex" }, { status: 400 });
    }

    const availService = new MockAvailService();
    const result = await availService.retrievePiece(blockNumber, txIndex, expectedHash);

    // Convert Uint8Array to base64 for transmission
    if (result.success && result.data) {
      const base64Data = btoa(String.fromCharCode(...result.data));
      return NextResponse.json({
        ...result,
        data: base64Data,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in Avail retrieve API:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
