// lib/data/iqro/index.ts
// Central loader for Iqro data from JSON files

// Import Iqro 1 pages (1-30)
import page1_1 from './iqro-1/1-1.json';
import page1_2 from './iqro-1/1-2.json';
import page1_3 from './iqro-1/1-3.json';
import page1_4 from './iqro-1/1-4.json';
import page1_5 from './iqro-1/1-5.json';
import page1_6 from './iqro-1/1-6.json';
import page1_7 from './iqro-1/1-7.json';
import page1_8 from './iqro-1/1-8.json';
import page1_9 from './iqro-1/1-9.json';
import page1_10 from './iqro-1/1-10.json';
import page1_11 from './iqro-1/1-11.json';
import page1_12 from './iqro-1/1-12.json';
import page1_13 from './iqro-1/1-13.json';
import page1_14 from './iqro-1/1-14.json';
import page1_15 from './iqro-1/1-15.json';
import page1_16 from './iqro-1/1-16.json';
import page1_17 from './iqro-1/1-17.json';
import page1_18 from './iqro-1/1-18.json';
import page1_19 from './iqro-1/1-19.json';
import page1_20 from './iqro-1/1-20.json';
import page1_21 from './iqro-1/1-21.json';
import page1_22 from './iqro-1/1-22.json';
import page1_23 from './iqro-1/1-23.json';
import page1_24 from './iqro-1/1-24.json';
import page1_25 from './iqro-1/1-25.json';
import page1_26 from './iqro-1/1-26.json';
import page1_27 from './iqro-1/1-27.json';
import page1_28 from './iqro-1/1-28.json';
import page1_29 from './iqro-1/1-29.json';
import page1_30 from './iqro-1/1-30.json';

// Import Iqro 2 pages
import page2_1 from './iqro-2/2-1.json';
import page2_2 from './iqro-2/2-2.json';
import page2_3 from './iqro-2/2-3.json';
import page2_4 from './iqro-2/2-4.json';
import page2_5 from './iqro-2/2-5.json';

// Import Iqro 3 pages
import page3_1 from './iqro-3/3-1.json';
import page3_2 from './iqro-3/3-2.json';
import page3_3 from './iqro-3/3-3.json';

// Import Iqro 4 pages
import page4_1 from './iqro-4/4-1.json';
import page4_2 from './iqro-4/4-2.json';
import page4_3 from './iqro-4/4-3.json';

// Import Iqro 5 pages
import page5_1 from './iqro-5/5-1.json';
import page5_2 from './iqro-5/5-2.json';
import page5_3 from './iqro-5/5-3.json';

// Import Iqro 6 pages
import page6_1 from './iqro-6/6-1.json';
import page6_2 from './iqro-6/6-2.json';
import page6_3 from './iqro-6/6-3.json';

// ============================================
// Types
// ============================================

/** Single content item in an Iqro page */
export interface IqroContentItem {
  order_id: number;
  latin: string;
  arabic: string;
}

/** Topic information for a page */
export interface IqroTopic {
  latin: string;
  arab: string;
}

/** Raw JSON page data structure */
export interface IqroPageData {
  level_id: number | string;
  level_title: string;
  page_number?: number | null;
  topic: IqroTopic | string;
  instruction_id?: string;
  instruction_en?: string;
  instruction_ar?: string;
  instruction?: string;
  content: IqroContentItem[];
}

/** Parsed letter for display (individual character with diacritics) */
export interface IqroLetter {
  arabic: string;       // Arabic text (can be single letter or combined)
  latin: string;        // Latin transliteration
  audioText?: string;   // Text for TTS (optional)
}

/** Parsed row of content for display */
export interface IqroRow {
  order_id: number;
  letters: IqroLetter[];  // Individual letters in the row
  fullArabic: string;     // Full Arabic text for the row
  fullLatin: string;      // Full Latin text for the row
}

/** Volume information */
export interface IqroVolume {
  volumeNumber: number;
  title: string;
  arabicTitle: string;
  description: string;
  totalPages: number;
}

/** Page data for display */
export interface IqroPage {
  pageNumber: number;
  volumeNumber: number;
  volumeTitle: string;
  topic: IqroTopic;
  instruction?: string;
  rows: IqroRow[];
  rawContent: IqroContentItem[];
}

// ============================================
// Data Arrays
// ============================================

const iqro1Pages: IqroPageData[] = [
  page1_1, page1_2, page1_3, page1_4, page1_5,
  page1_6, page1_7, page1_8, page1_9, page1_10,
  page1_11, page1_12, page1_13, page1_14, page1_15,
  page1_16, page1_17, page1_18, page1_19, page1_20,
  page1_21, page1_22, page1_23, page1_24, page1_25,
  page1_26, page1_27, page1_28, page1_29, page1_30,
];

const iqro2Pages: IqroPageData[] = [
  page2_1,
  page2_2,
  page2_3,
  page2_4,
  page2_5,
];

const iqro3Pages: IqroPageData[] = [
  page3_1,
  page3_2,
  page3_3,
];

const iqro4Pages: IqroPageData[] = [
  page4_1,
  page4_2,
  page4_3,
];

const iqro5Pages: IqroPageData[] = [
  page5_1,
  page5_2,
  page5_3,
];

const iqro6Pages: IqroPageData[] = [
  page6_1,
  page6_2,
  page6_3,
];

// All pages by volume
const allPages: Record<number, IqroPageData[]> = {
  1: iqro1Pages,
  2: iqro2Pages,
  3: iqro3Pages,
  4: iqro4Pages,
  5: iqro5Pages,
  6: iqro6Pages,
};

// Volume metadata
const volumeMetadata: IqroVolume[] = [
  {
    volumeNumber: 1,
    title: "Iqra' 1",
    arabicTitle: "إقرأ ١",
    description: "Pengenalan huruf hijaiyah dengan harakat fathah. Bacaan langsung tanpa mengeja.",
    totalPages: 30,
  },
  {
    volumeNumber: 2,
    title: "Iqra' 2",
    arabicTitle: "إقرأ ٢",
    description: "Huruf sambung dan tanda sukun. Mengenal huruf mad.",
    totalPages: 5,
  },
  {
    volumeNumber: 3,
    title: "Iqra' 3",
    arabicTitle: "إقرأ ٣",
    description: "Huruf dengan kasrah, dammah, dan tanwin.",
    totalPages: 3,
  },
  {
    volumeNumber: 4,
    title: "Iqra' 4",
    arabicTitle: "إقرأ ٤",
    description: "Bacaan panjang (mad) dan huruf lain.",
    totalPages: 3,
  },
  {
    volumeNumber: 5,
    title: "Iqra' 5",
    arabicTitle: "إقرأ ٥",
    description: "Waqaf, washal, dan tanda bacaan lainnya.",
    totalPages: 3,
  },
  {
    volumeNumber: 6,
    title: "Iqra' 6",
    arabicTitle: "إقرأ ٦",
    description: "Tajwid dasar dan latihan membaca ayat Al-Qur'an.",
    totalPages: 0,
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Parse Arabic text into individual letters
 * Handles Arabic letters with diacritical marks (harakat)
 */
function parseArabicToLetters(arabic: string, latin: string): IqroLetter[] {
  // Split by spaces to get individual letter groups
  const arabicParts = arabic.trim().split(/\s+/).filter(Boolean);
  const latinParts = latin.trim().split(/\s+/).filter(Boolean);
  
  return arabicParts.map((arabicPart, index) => ({
    arabic: arabicPart,
    latin: latinParts[index] || '',
    audioText: arabicPart,
  }));
}

/**
 * Convert raw content to display rows
 */
function contentToRows(content: IqroContentItem[]): IqroRow[] {
  return content.map(item => ({
    order_id: item.order_id,
    letters: parseArabicToLetters(item.arabic, item.latin),
    fullArabic: item.arabic,
    fullLatin: item.latin,
  }));
}

// ============================================
// Public API
// ============================================

/**
 * Get all available volumes
 */
export function getAllIqroVolumes(): IqroVolume[] {
  return volumeMetadata.map(volume => ({
    ...volume,
    totalPages: allPages[volume.volumeNumber]?.length || 0,
  }));
}

/**
 * Get volume details by number
 */
export function getIqroVolume(volumeNumber: number): IqroVolume | null {
  const volume = volumeMetadata.find(v => v.volumeNumber === volumeNumber);
  if (!volume) return null;
  
  return {
    ...volume,
    totalPages: allPages[volumeNumber]?.length || 0,
  };
}

/**
 * Get total pages for a volume
 */
export function getIqroTotalPages(volumeNumber: number): number {
  return allPages[volumeNumber]?.length || 0;
}

/**
 * Get a specific page from a volume
 * @param volumeNumber - Volume number (1-6)
 * @param pageNumber - Page number (1-based)
 */
export function getIqroPage(volumeNumber: number, pageNumber: number): IqroPage | null {
  const pages = allPages[volumeNumber];
  if (!pages || pageNumber < 1 || pageNumber > pages.length) {
    return null;
  }
  
  const pageData = pages[pageNumber - 1];
  const volume = volumeMetadata.find(v => v.volumeNumber === volumeNumber);
  
  // Handle topic as string or object
  const topic: IqroTopic = typeof pageData.topic === 'string' 
    ? { latin: pageData.topic, arab: '' }
    : pageData.topic;
  
  return {
    pageNumber,
    volumeNumber,
    volumeTitle: volume?.title || `Iqro' ${volumeNumber}`,
    topic,
    instruction: pageData.instruction_id || pageData.instruction || undefined,
    rows: contentToRows(pageData.content),
    rawContent: pageData.content,
  };
}

/**
 * Get raw page data (for advanced usage)
 */
export function getRawIqroPage(volumeNumber: number, pageNumber: number): IqroPageData | null {
  const pages = allPages[volumeNumber];
  if (!pages || pageNumber < 1 || pageNumber > pages.length) {
    return null;
  }
  return pages[pageNumber - 1];
}

/**
 * Check if a volume has available data
 */
export function hasVolumeData(volumeNumber: number): boolean {
  return (allPages[volumeNumber]?.length || 0) > 0;
}

// Export types for external use
export type { IqroPageData as RawIqroPageData };
