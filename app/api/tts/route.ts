import { NextRequest, NextResponse } from "next/server";

// Google Translate TTS endpoint (free, no API key needed)
// This is a workaround using the public Google Translate TTS
const GOOGLE_TTS_URL = "https://translate.google.com/translate_tts";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get("text");
    const lang = searchParams.get("lang") || "ar";

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: text" },
        { status: 400 }
      );
    }

    // Limit text length
    if (text.length > 200) {
      return NextResponse.json(
        { success: false, error: "Text too long. Maximum 200 characters." },
        { status: 400 }
      );
    }

    // Build Google TTS URL
    const params = new URLSearchParams({
      ie: "UTF-8",
      client: "tw-ob",
      tl: lang,
      q: text,
    });

    const url = `${GOOGLE_TTS_URL}?${params.toString()}`;

    console.log(`[TTS Proxy] Fetching audio for: "${text.substring(0, 50)}..."`);

    // Fetch audio from Google TTS
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });

    if (!response.ok) {
      console.error(`[TTS Proxy] Google TTS error: ${response.status}`);
      return NextResponse.json(
        { success: false, error: "Failed to fetch audio" },
        { status: response.status }
      );
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();

    // Return audio with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("[TTS Proxy] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process TTS request" },
      { status: 500 }
    );
  }
}
