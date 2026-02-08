// Data for pronunciation practice prompts
export interface LafalPrompt {
  id: string;
  text: string;         // Text to display (romanized/Indonesian)
  arabic: string;       // Arabic text (expected result)
  hint: string;         // Pronunciation hint
}

// Practice prompts for pronunciation
export const lafalPrompts: LafalPrompt[] = [
  {
    id: "alhamdulillah",
    text: "Alhamdulillah",
    arabic: "الْحَمْدُ لِلَّهِ",
    hint: "Al-ham-du-lil-laah",
  },
  {
    id: "bismillah",
    text: "Bismillah",
    arabic: "بِسْمِ اللَّهِ",
    hint: "Bis-mil-laah",
  },
  {
    id: "subhanallah",
    text: "Subhanallah",
    arabic: "سُبْحَانَ اللَّهِ",
    hint: "Sub-haa-nal-laah",
  },
  {
    id: "allahu-akbar",
    text: "Allahu Akbar",
    arabic: "اللَّهُ أَكْبَرُ",
    hint: "Al-laa-hu ak-bar",
  },
  {
    id: "assalamualaikum",
    text: "Assalamualaikum",
    arabic: "السَّلَامُ عَلَيْكُمْ",
    hint: "As-sa-laa-mu a-lai-kum",
  },
  {
    id: "insyaallah",
    text: "Insya Allah",
    arabic: "إِنْ شَاءَ اللَّهُ",
    hint: "In-syaa-al-laah",
  },
  {
    id: "masya-allah",
    text: "Masya Allah",
    arabic: "مَا شَاءَ اللَّهُ",
    hint: "Maa-syaa-al-laah",
  },
  {
    id: "jazakallah",
    text: "Jazakallah",
    arabic: "جَزَاكَ اللَّهُ",
    hint: "Ja-zaa-kal-laah",
  },
  {
    id: "barakallah",
    text: "Barakallah",
    arabic: "بَارَكَ اللَّهُ",
    hint: "Baa-ra-kal-laah",
  },
  {
    id: "astaghfirullah",
    text: "Astaghfirullah",
    arabic: "أَسْتَغْفِرُ اللَّهَ",
    hint: "As-tagh-fi-rul-laah",
  },
];

// Get a random prompt
export const getRandomPrompt = (): LafalPrompt => {
  const index = Math.floor(Math.random() * lafalPrompts.length);
  return lafalPrompts[index];
};

// Get prompt by id
export const getPromptById = (id: string): LafalPrompt | undefined => {
  return lafalPrompts.find((p) => p.id === id);
};

// Get next prompt (circular)
export const getNextPrompt = (currentId: string): LafalPrompt => {
  const currentIndex = lafalPrompts.findIndex((p) => p.id === currentId);
  const nextIndex = (currentIndex + 1) % lafalPrompts.length;
  return lafalPrompts[nextIndex];
};
