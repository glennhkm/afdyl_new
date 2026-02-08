// API Route to proxy ayah requests to Al-Quran Cloud API
import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.alquran.cloud/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; number: string }> }
) {
  try {
    const { type, number } = await params;
    const { searchParams } = new URL(request.url);
    const edition = searchParams.get('edition') || 'ar.alafasy';

    const response = await fetch(`${BASE_URL}/${type}/${number}/${edition}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch ayahs`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching ayahs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ayahs' },
      { status: 500 }
    );
  }
}
