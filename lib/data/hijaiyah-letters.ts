// lib/data/hijaiyah-letters.ts

export interface HijaiyahLetter {
  arabic: string;
  latin: string;
  fatha: string;
  kasra: string;
  damma: string;
}

export const hijaiyahLetters: HijaiyahLetter[] = [
  { arabic: 'ا', latin: 'alif', fatha: 'اَ', kasra: 'اِ', damma: 'اُ' },
  { arabic: 'ب', latin: 'ba', fatha: 'بَ', kasra: 'بِ', damma: 'بُ' },
  { arabic: 'ت', latin: 'ta', fatha: 'تَ', kasra: 'تِ', damma: 'تُ' },
  { arabic: 'ث', latin: 'tsa', fatha: 'ثَ', kasra: 'ثِ', damma: 'ثُ' },
  { arabic: 'ج', latin: 'jim', fatha: 'جَ', kasra: 'جِ', damma: 'جُ' },
  { arabic: 'ح', latin: 'ha', fatha: 'حَ', kasra: 'حِ', damma: 'حُ' },
  { arabic: 'خ', latin: 'kha', fatha: 'خَ', kasra: 'خِ', damma: 'خُ' },
  { arabic: 'د', latin: 'dal', fatha: 'دَ', kasra: 'دِ', damma: 'دُ' },
  { arabic: 'ذ', latin: 'dzal', fatha: 'ذَ', kasra: 'ذِ', damma: 'ذُ' },
  { arabic: 'ر', latin: 'ra', fatha: 'رَ', kasra: 'رِ', damma: 'رُ' },
  { arabic: 'ز', latin: 'zai', fatha: 'زَ', kasra: 'زِ', damma: 'زُ' },
  { arabic: 'س', latin: 'sin', fatha: 'سَ', kasra: 'سِ', damma: 'سُ' },
  { arabic: 'ش', latin: 'syin', fatha: 'شَ', kasra: 'شِ', damma: 'شُ' },
  { arabic: 'ص', latin: 'shad', fatha: 'صَ', kasra: 'صِ', damma: 'صُ' },
  { arabic: 'ض', latin: 'dhad', fatha: 'ضَ', kasra: 'ضِ', damma: 'ضُ' },
  { arabic: 'ط', latin: 'tha', fatha: 'طَ', kasra: 'طِ', damma: 'طُ' },
  { arabic: 'ظ', latin: 'zha', fatha: 'ظَ', kasra: 'ظِ', damma: 'ظُ' },
  { arabic: 'ع', latin: 'ain', fatha: 'عَ', kasra: 'عِ', damma: 'عُ' },
  { arabic: 'غ', latin: 'ghain', fatha: 'غَ', kasra: 'غِ', damma: 'غُ' },
  { arabic: 'ف', latin: 'fa', fatha: 'فَ', kasra: 'فِ', damma: 'فُ' },
  { arabic: 'ق', latin: 'qaf', fatha: 'قَ', kasra: 'قِ', damma: 'قُ' },
  { arabic: 'ك', latin: 'kaf', fatha: 'كَ', kasra: 'كِ', damma: 'كُ' },
  { arabic: 'ل', latin: 'lam', fatha: 'لَ', kasra: 'لِ', damma: 'لُ' },
  { arabic: 'م', latin: 'mim', fatha: 'مَ', kasra: 'مِ', damma: 'مُ' },
  { arabic: 'ن', latin: 'nun', fatha: 'نَ', kasra: 'نِ', damma: 'نُ' },
  { arabic: 'و', latin: 'waw', fatha: 'وَ', kasra: 'وِ', damma: 'وُ' },
  { arabic: 'ه', latin: 'Hā', fatha: 'هَ', kasra: 'هِ', damma: 'هُ' },
  { arabic: 'ي', latin: 'ya', fatha: 'يَ', kasra: 'يِ', damma: 'يُ' },
];

// Audio mapping for letter sounds
export const audioMapping: Record<string, string> = {
  'ا': 'alif',
  'ب': 'ba',
  'ت': 'ta',
  'ث': 'tsa',
  'ج': 'jim',
  'ح': 'ha',
  'خ': 'kha',
  'د': 'dal',
  'ذ': 'dzal',
  'ر': 'ra',
  'ز': 'zai',
  'س': 'sin',
  'ش': 'syin',
  'ص': 'shad',
  'ض': 'dhad',
  'ط': 'tha',
  'ظ': 'zha',
  'ع': 'ain',
  'غ': 'ghain',
  'ف': 'fa',
  'ق': 'qaf',
  'ك': 'kaf',
  'ل': 'lam',
  'م': 'mim',
  'ن': 'nun',
  'ه': 'HHa',
  'و': 'waw',
  'ي': 'ya',
};

// SVG file mapping for dashed paths
export const letterToSvgFile: Record<string, string> = {
  'ا': 'alif-dashed.svg',
  'ب': 'ba-dashed.svg',
  'ت': 'ta-dashed.svg',
  'ث': 'tsa-dashed.svg',
  'ج': 'jim-dashed.svg',
  'ح': 'ha-dashed.svg',
  'خ': 'kha-dashed.svg',
  'د': 'dal-dashed.svg',
  'ذ': 'dzal-dashed.svg',
  'ر': 'ra-dashed.svg',
  'ز': 'zai-dashed.svg',
  'س': 'sin-dashed.svg',
  'ش': 'syin-dashed.svg',
  'ص': 'shad-dashed.svg',
  'ض': 'dhad-dashed.svg',
  'ط': 'tha-dashed.svg',
  'ظ': 'zha-dashed.svg',
  'ع': 'ain-dashed.svg',
  'غ': 'ghain-dashed.svg',
  'ف': 'fa-dashed.svg',
  'ق': 'qaf-dashed.svg',
  'ك': 'kaf-dashed.svg',
  'ل': 'lam-dashed.svg',
  'م': 'mim-dashed.svg',
  'ن': 'nun-dashed.svg',
  'ه': 'Hā-dashed.svg',
  'و': 'waw-dashed.svg',
  'ي': 'ya-dashed.svg',
};

// PNG file mapping for background images
export const letterToPngFile: Record<string, string> = {
  'ا': 'alif.png',
  'ب': 'ba.png',
  'ت': 'ta.png',
  'ث': 'tsa.png',
  'ج': 'jim.png',
  'ح': 'ha.png',
  'خ': 'kha.png',
  'د': 'dal.png',
  'ذ': 'dzal.png',
  'ر': 'ra.png',
  'ز': 'zai.png',
  'س': 'sin.png',
  'ش': 'syin.png',
  'ص': 'shad.png',
  'ض': 'dhad.png',
  'ط': 'tha.png',
  'ظ': 'zha.png',
  'ع': 'ain.png',
  'غ': 'ghain.png',
  'ف': 'fa.png',
  'ق': 'qaf.png',
  'ك': 'kaf.png',
  'ل': 'lam.png',
  'م': 'mim.png',
  'ن': 'nun.png',
  'ه': 'Hā.png',
  'و': 'waw.png',
  'ي': 'ya.png',
};

export function getSvgPath(letter: string): string | null {
  const fileName = letterToSvgFile[letter];
  if (fileName) {
    return `/images/hijaiyah_svg_dashed/${fileName}`;
  }
  return null;
}

export function getPngPath(letter: string): string | null {
  const fileName = letterToPngFile[letter];
  if (fileName) {
    return `/images/hijaiyah_original/${fileName}`;
  }
  return null;
}
