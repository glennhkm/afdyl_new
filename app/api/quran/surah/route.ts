// API Route to proxy requests to Al-Quran Cloud API (avoid CORS issues)
import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.alquran.cloud/v1';

export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/surah`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch surahs`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching surahs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surahs' },
      { status: 500 }
    );
  }
}
