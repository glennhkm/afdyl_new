// lib/data/hijaiyah-game-data.ts

export interface HijaiyahGameLetter {
  letter: string;
  name: string;
  audio: string;
}

export const hijaiyahGameLetters: HijaiyahGameLetter[] = [
  { letter: 'أ', name: 'alif', audio: 'alif.m4a' },
  { letter: 'ب', name: 'ba', audio: 'ba.m4a' },
  { letter: 'ت', name: 'ta', audio: 'ta.m4a' },
  { letter: 'ث', name: 'tsa', audio: 'tsa.m4a' },
  { letter: 'ج', name: 'jim', audio: 'jim.m4a' },
  { letter: 'ح', name: 'ha', audio: 'ha.m4a' },
  { letter: 'خ', name: 'kha', audio: 'kha.m4a' },
  { letter: 'د', name: 'dal', audio: 'dal.m4a' },
  { letter: 'ذ', name: 'dzal', audio: 'dzal.m4a' },
  { letter: 'ر', name: 'ra', audio: 'ra.m4a' },
  { letter: 'ز', name: 'zai', audio: 'zai.m4a' },
  { letter: 'س', name: 'sin', audio: 'sin.m4a' },
  { letter: 'ش', name: 'syin', audio: 'syin.m4a' },
  { letter: 'ص', name: 'shad', audio: 'shad.m4a' },
  { letter: 'ض', name: 'dhad', audio: 'dhad.m4a' },
  { letter: 'ط', name: 'tha', audio: 'tha.m4a' },
  { letter: 'ظ', name: 'zha', audio: 'zha.m4a' },
  { letter: 'ع', name: 'ain', audio: 'ain.m4a' },
  { letter: 'غ', name: 'ghain', audio: 'ghain.m4a' },
  { letter: 'ف', name: 'fa', audio: 'fa.m4a' },
  { letter: 'ق', name: 'qaf', audio: 'qaf.m4a' },
  { letter: 'ك', name: 'kaf', audio: 'kaf.m4a' },
  { letter: 'ل', name: 'lam', audio: 'lam.m4a' },
  { letter: 'م', name: 'mim', audio: 'mim.m4a' },
  { letter: 'ن', name: 'nun', audio: 'nun.m4a' },
  { letter: 'و', name: 'waw', audio: 'waw.m4a' },
  { letter: 'ه', name: 'ha2', audio: 'HHa.m4a' },
  { letter: 'ي', name: 'ya', audio: 'ya.m4a' },
];

// Shuffle array utility
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Get random index from available indices
export function getRandomIndex(availableIndices: number[]): number {
  if (availableIndices.length === 0) return -1;
  return availableIndices[Math.floor(Math.random() * availableIndices.length)];
}
