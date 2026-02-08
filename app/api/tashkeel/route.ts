import { NextRequest, NextResponse } from "next/server";

const TASHKEEL_API_URL = "https://afdyl-api.vercel.app/api/tashkeel";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.text) {
      return NextResponse.json(
        { success: false, error: "Missing required field: text" },
        { status: 400 }
      );
    }

    // Call the external Tashkeel API
    const response = await fetch(TASHKEEL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: body.text,
        strip_harakat: body.strip_harakat || false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "API request failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Tashkeel Proxy] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight (if needed)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
