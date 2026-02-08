// lib/services/quran-service.ts

import { Surah, Juz, Ayah, AyahTiming } from '@/types/quran';
import { getSurahName, getArabicSurahName } from '@/lib/data/surah-names';

// Arabic number mapping
const arabicNumbers: Record<number, string> = {
  1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩', 10: '١٠',
  11: '١١', 12: '١٢', 13: '١٣', 14: '١٤', 15: '١٥', 16: '١٦', 17: '١٧', 18: '١٨', 19: '١٩', 20: '٢٠',
  21: '٢١', 22: '٢٢', 23: '٢٣', 24: '٢٤', 25: '٢٥', 26: '٢٦', 27: '٢٧', 28: '٢٨', 29: '٢٩', 30: '٣٠',
  31: '٣١', 32: '٣٢', 33: '٣٣', 34: '٣٤', 35: '٣٥', 36: '٣٦', 37: '٣٧', 38: '٣٨', 39: '٣٩', 40: '٤٠',
  41: '٤١', 42: '٤٢', 43: '٤٣', 44: '٤٤', 45: '٤٥', 46: '٤٦', 47: '٤٧', 48: '٤٨', 49: '٤٩', 50: '٥٠',
  51: '٥١', 52: '٥٢', 53: '٥٣', 54: '٥٤', 55: '٥٥', 56: '٥٦', 57: '٥٧', 58: '٥٨', 59: '٥٩', 60: '٦٠',
  61: '٦١', 62: '٦٢', 63: '٦٣', 64: '٦٤', 65: '٦٥', 66: '٦٦', 67: '٦٧', 68: '٦٨', 69: '٦٩', 70: '٧٠',
  71: '٧١', 72: '٧٢', 73: '٧٣', 74: '٧٤', 75: '٧٥', 76: '٧٦', 77: '٧٧', 78: '٧٨', 79: '٧٩', 80: '٨٠',
  81: '٨١', 82: '٨٢', 83: '٨٣', 84: '٨٤', 85: '٨٥', 86: '٨٦', 87: '٨٧', 88: '٨٨', 89: '٨٩', 90: '٩٠',
  91: '٩١', 92: '٩٢', 93: '٩٣', 94: '٩٤', 95: '٩٥', 96: '٩٦', 97: '٩٧', 98: '٩٨', 99: '٩٩', 100: '١٠٠',
  101: '١٠١', 102: '١٠٢', 103: '١٠٣', 104: '١٠٤', 105: '١٠٥', 106: '١٠٦', 107: '١٠٧', 108: '١٠٨', 109: '١٠٩', 110: '١١٠',
  111: '١١١', 112: '١١٢', 113: '١١٣', 114: '١١٤',
};

export const getArabicNumber = (number: number): string => {
  if (arabicNumbers[number]) return arabicNumbers[number];
  
  // For numbers > 114, convert digit by digit
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return number.toString().split('').map(d => arabicDigits[parseInt(d)]).join('');
};

// Fetch all surahs (using local API route to avoid CORS)
export const fetchSurahs = async (): Promise<Surah[]> => {
  try {
    const response = await fetch('/api/quran/surah');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch surahs`);
    }

    const data = await response.json();
    
    if (data?.data) {
      // Replace English names with our Indonesian-friendly names
      return data.data.map((surah: Surah) => ({
        ...surah,
        englishName: getSurahName(surah.number),
      }));
    }
    
    throw new Error('Invalid data structure from API');
  } catch (error) {
    console.error('Error fetching surahs:', error);
    throw error;
  }
};

// Generate juz list (static data)
export const generateJuzList = (): Juz[] => {
  return Array.from({ length: 30 }, (_, index) => ({
    number: index + 1,
    name: `Juz ${index + 1}`,
    arabicName: `الجزء ${getArabicNumber(index + 1)}`,
  }));
};

// Get static surahs for offline mode
export const getStaticSurahs = (): Surah[] => {
  return Array.from({ length: 114 }, (_, index) => {
    const number = index + 1;
    return {
      number,
      name: getArabicSurahName(number),
      englishName: getSurahName(number),
      englishNameTranslation: '',
      numberOfAyahs: 0,
      revelationType: '',
    };
  });
};

// Helper to remove first 4 words (Bismillah) from text
const removeFirst4Words = (text: string): string => {
  const cleanedText = text.trim();
  const textWords = cleanedText.split(/\s+/);
  
  if (textWords.length >= 4) {
    return textWords.slice(4).join(' ').trim();
  }
  
  return cleanedText;
};

// Fetch ayahs for a surah or juz (using local API routes to avoid CORS)
export const fetchAyahs = async (type: 'surah' | 'juz', number: number): Promise<Ayah[]> => {
  try {
    // Fetch Arabic text and audio via local API route
    const arabicResponse = await fetch(`/api/quran/${type}/${number}?edition=ar.alafasy`);

    // Fetch Indonesian translation via local API route
    const translationResponse = await fetch(`/api/quran/${type}/${number}?edition=id.indonesian`);

    if (!arabicResponse.ok || !translationResponse.ok) {
      throw new Error('Failed to fetch ayahs');
    }

    const arabicData = await arabicResponse.json();
    const translationData = await translationResponse.json();

    if (
      arabicData?.data?.ayahs &&
      translationData?.data?.ayahs
    ) {
      const arabicAyahs = arabicData.data.ayahs;
      const translationAyahs = translationData.data.ayahs;

      const combinedAyahs: Ayah[] = [];

      for (let i = 0; i < arabicAyahs.length; i++) {
        const arabicAyah = arabicAyahs[i];
        const translationAyah = translationAyahs[i];

        let processedText = arabicAyah.text || '';
        const words: { text: string; translation: string }[] = [];

        if (arabicAyah.words) {
          let arabicWords = [...arabicAyah.words];

          // Remove Bismillah (first 4 words) from first ayah (except surah 1 and 9)
          if (i === 0 && number !== 1 && number !== 9 && type === 'surah') {
            if (arabicWords.length >= 4) {
              arabicWords = arabicWords.slice(4);
            }
            processedText = removeFirst4Words(processedText);
          }

          // Combine words with translations
          for (const word of arabicWords) {
            words.push({
              text: word.text || '',
              translation: word.translation || translationAyah.text || '',
            });
          }
        } else if (i === 0 && number !== 1 && number !== 9 && type === 'surah') {
          processedText = removeFirst4Words(processedText);
        }

        combinedAyahs.push({
          number: arabicAyah.numberInSurah || i + 1,
          text: processedText,
          surah: arabicAyah.surah || { number },
          words,
          translation: translationAyah.text || '',
          audio: arabicAyah.audio || '',
        });
      }

      return combinedAyahs;
    }

    return [];
  } catch (error) {
    console.error('Error fetching ayahs:', error);
    throw error;
  }
};

// Fetch word timings for audio sync (using local API route to avoid CORS)
export const fetchTimings = async (): Promise<AyahTiming[]> => {
  try {
    const response = await fetch('/api/quran/timings');

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data as AyahTiming[];
      }
    }
  } catch (error) {
    console.error('Error fetching timings:', error);
  }
  return [];
};

// Get timings for a specific ayah
export const getAyahTimings = (
  timings: AyahTiming[],
  surah: number,
  ayah: number
): number[][] => {
  const ayahTiming = timings.find(
    (t) => t.surah === surah && t.ayah === ayah
  );
  return ayahTiming?.segments || [];
};

export { getSurahName, getArabicSurahName };
