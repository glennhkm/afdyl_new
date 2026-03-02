// API Route to proxy word-timing data from qurancdn (Mishari Alafasy, reciter 7)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const surahNumber = searchParams.get('surah') || '1';

  try {
    const response = await fetch(
      `https://api.qurancdn.com/api/qdc/audio/reciters/7/audio_files?chapter_number=${surahNumber}&segments=true`,
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!response.ok) {
      throw new Error(`qurancdn returned ${response.status}`);
    }

    const data = await response.json();

    // qurancdn response shape:
    //   { audio_files: [{ verse_timings: [{ verse_key, timestamp_from, segments: [[word1based, startMs, endMs], ...] }] }] }
    // segments use ABSOLUTE ms within the full-surah audio.
    // We convert to ms RELATIVE to each ayah's start so they align with per-ayah audio clips.
    const verseTimes: { verse_key: string; timestamp_from: number; timestamp_to: number; segments: number[][] }[] =
      data.audio_files?.[0]?.verse_timings ?? [];

    const timings = verseTimes.map((vt) => {
      const [surah, ayah] = vt.verse_key.split(':').map(Number);
      const relativeSegments = (vt.segments ?? []).map((seg: number[]) => [
        seg[0],                                          // word number (1-based)
        Math.max(0, seg[1] - vt.timestamp_from),        // startMs relative to ayah
        Math.max(0, seg[2] - vt.timestamp_from),        // endMs relative to ayah
      ]);
      return { surah, ayah, segments: relativeSegments };
    });

    return NextResponse.json(timings);
  } catch (error) {
    console.error('Error fetching timings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timings' },
      { status: 500 }
    );
  }
}
