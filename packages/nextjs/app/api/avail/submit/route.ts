import { NextRequest, NextResponse } from "next/server";
import { MockAvailService } from "@/lib/services/mockAvailService";

export async function POST(request: NextRequest) {
  try {
    const { data, walletAddress } = await request.json();

    if (!data || !walletAddress) {
      return NextResponse.json({ success: false, error: "Missing data or walletAddress" }, { status: 400 });
    }

    // Convert base64 back to Uint8Array
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const availService = new MockAvailService();
    const result = await availService.submitPiece(bytes, walletAddress);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in Avail submit API:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
