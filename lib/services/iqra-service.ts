// lib/services/iqra-service.ts
// Service for Iqra' data and audio functionality

import { iqraVolumes, getIqraVolume, getIqraPage, getTotalPages, IqraVolume, IqraPage, IqraLetter } from '@/lib/data/iqra-data';
import { getTTSService } from './tts-service';

export interface IqraVolumeInfo {
  volumeNumber: number;
  title: string;
  arabicTitle: string;
  description: string;
  totalPages: number;
  icon: string;
}

// Get all volumes with basic info
export function getAllVolumes(): IqraVolumeInfo[] {
  return iqraVolumes.map(volume => ({
    volumeNumber: volume.volumeNumber,
    title: volume.title,
    arabicTitle: volume.arabicTitle,
    description: volume.description,
    totalPages: volume.pages.length,
    icon: getVolumeIcon(volume.volumeNumber),
  }));
}

// Get icon for each volume based on difficulty
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

// Get volume details
export function getVolumeDetails(volumeNumber: number): IqraVolume | null {
  const volume = getIqraVolume(volumeNumber);
  return volume || null;
}

// Get page from volume
export function getPageFromVolume(volumeNumber: number, pageNumber: number): IqraPage | null {
  const page = getIqraPage(volumeNumber, pageNumber);
  return page || null;
}

// Get total pages for a volume
export function getVolumeTotalPages(volumeNumber: number): number {
  return getTotalPages(volumeNumber);
}

// Play audio for a letter using TTS
export async function playLetterAudio(letter: IqraLetter): Promise<void> {
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

// Stop any playing audio
export function stopAudio(): void {
  const ttsService = getTTSService();
  ttsService.stop();
}

// Check if audio is currently playing
export function isAudioPlaying(): boolean {
  const ttsService = getTTSService();
  return ttsService.getIsSpeaking();
}

// Get Arabic number representation
export function getArabicNumber(number: number): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return number
    .toString()
    .split('')
    .map(digit => arabicNumerals[parseInt(digit)])
    .join('');
}

// Export types
export type { IqraVolume, IqraPage, IqraLetter };
