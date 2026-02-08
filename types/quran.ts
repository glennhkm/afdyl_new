// types/quran.ts

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Juz {
  number: number;
  name: string;
  arabicName: string;
}

export interface Word {
  text: string;
  translation: string;
}

export interface Ayah {
  number: number;
  text: string;
  surah: { number: number };
  words: Word[];
  translation: string;
  audio: string;
}

export interface AyahTiming {
  surah: number;
  ayah: number;
  segments: number[][];
}

export type ReadingType = 'surah' | 'juz';

export interface ReadingParams {
  type: ReadingType;
  number: number;
  name: string;
}
