// lib/services/iqra-service.ts
// Service for Iqra' data and audio functionality

import {
  getAllIqroVolumes,
  getIqroVolume,
  getIqroPage,
  getIqroTotalPages,
  hasVolumeData,
  IqroVolume,
  IqroPage,
  IqroLetter,
  IqroRow,
} from '@/lib/data/iqro';
import { getTTSService } from './tts-service';

// ============================================
// Types (re-export and aliases for compatibility)
// ============================================

export interface IqraVolumeInfo {
  volumeNumber: number;
  title: string;
  arabicTitle: string;
  description: string;
  totalPages: number;
  icon: string;
  hasData: boolean;
}

// Re-export types from iqro data with Iqra prefix for compatibility
export type IqraVolume = IqroVolume;
export type IqraPage = IqroPage;
export type IqraLetter = IqroLetter;
export type IqraRow = IqroRow;

// ============================================
// Volume Functions
// ============================================

/**
 * Get all volumes with basic info for listing
 */
export function getAllVolumes(): IqraVolumeInfo[] {
  return getAllIqroVolumes().map(volume => ({
    volumeNumber: volume.volumeNumber,
    title: volume.title,
    arabicTitle: volume.arabicTitle,
    description: volume.description,
    totalPages: volume.totalPages,
    icon: getVolumeIcon(volume.volumeNumber),
    hasData: hasVolumeData(volume.volumeNumber),
  }));
}

/**
 * Get icon for each volume based on number
 */
function getVolumeIcon(volumeNumber: number): string {
  const icons: Record<number, string> = {
    1: 'RiNumber1',
    2: 'RiNumber2',
    3: 'RiNumber3',
    4: 'RiNumber4',
    5: 'RiNumber5',
    6: 'RiNumber6',
  };
  return icons[volumeNumber] || 'RiBookOpenLine';
}

/**
 * Get volume details
 */
export function getVolumeDetails(volumeNumber: number): IqroVolume | null {
  return getIqroVolume(volumeNumber);
}

// ============================================
// Page Functions
// ============================================

/**
 * Get page from volume
 */
export function getPageFromVolume(volumeNumber: number, pageNumber: number): IqroPage | null {
  return getIqroPage(volumeNumber, pageNumber);
}

/**
 * Get total pages for a volume
 */
export function getVolumeTotalPages(volumeNumber: number): number {
  return getIqroTotalPages(volumeNumber);
}

// ============================================
// Audio Functions
// ============================================

/**
 * Play audio for a letter using TTS
 */
export async function playLetterAudio(letter: IqroLetter): Promise<void> {
  const ttsService = getTTSService();
  
  // Use audioText if provided, otherwise use the arabic text
  const textToSpeak = letter.audioText || letter.arabic;
  
  try {
    await ttsService.speak(textToSpeak);
  } catch (error) {
    console.error('[IqraService] Error playing audio:', error);
    throw error;
  }
}

/**
 * Play audio for a full row
 */
export async function playRowAudio(row: IqroRow): Promise<void> {
  const ttsService = getTTSService();
  
  try {
    await ttsService.speak(row.fullArabic);
  } catch (error) {
    console.error('[IqraService] Error playing row audio:', error);
    throw error;
  }
}

/**
 * Stop any playing audio
 */
export function stopAudio(): void {
  const ttsService = getTTSService();
  ttsService.stop();
}

/**
 * Check if audio is currently playing
 */
export function isAudioPlaying(): boolean {
  const ttsService = getTTSService();
  return ttsService.getIsSpeaking();
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get Arabic number representation
 */
export function getArabicNumber(number: number): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return number
    .toString()
    .split('')
    .map(digit => arabicNumerals[parseInt(digit)])
    .join('');
}

/**
 * Check if volume has data available
 */
export function isVolumeAvailable(volumeNumber: number): boolean {
  return hasVolumeData(volumeNumber);
}
