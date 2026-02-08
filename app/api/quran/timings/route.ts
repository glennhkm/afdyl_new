// API Route to proxy timing data requests
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/cpfair/quran-align/master/data/afasy.json',
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch timings');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching timings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timings' },
      { status: 500 }
    );
  }
}
