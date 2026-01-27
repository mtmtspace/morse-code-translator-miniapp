import { getCharacters, getMappedCharacters, swapCharacters } from './characters.js';
import getOptions from './options.js';
import getAudio from './audio.js';
import type { Options, Characters, AudioResult } from './types.js';
import { hanzi2ctc, ctc2hanzi } from './lib/ctc/index.js';

const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;
const HIRAGANA_ITERATION = 0x309d;
const HIRAGANA_VOICED_ITERATION = 0x309e;
const HIRAGANA_YORI = 0x309f;

const KATAKANA_ITERATION = 0x30fd;
const KATAKANA_VOICED_ITERATION = 0x30fe;
const KATAKANA_KOTO = 0x30ff;

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_L = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const HANGUL_V = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const HANGUL_T = ['', 'ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const COMPOUND_JAMO: Record<string, string[]> = {
  'ㄲ': ['ㄱ','ㄱ'],
  'ㄸ': ['ㄷ','ㄷ'],
  'ㅃ': ['ㅂ','ㅂ'],
  'ㅆ': ['ㅅ','ㅅ'],
  'ㅉ': ['ㅈ','ㅈ'],
  'ㄳ': ['ㄱ','ㅅ'],
  'ㄵ': ['ㄴ','ㅈ'],
  'ㄶ': ['ㄴ','ㅎ'],
  'ㄺ': ['ㄹ','ㄱ'],
  'ㄻ': ['ㄹ','ㅁ'],
  'ㄼ': ['ㄹ','ㅂ'],
  'ㄽ': ['ㄹ','ㅅ'],
  'ㄾ': ['ㄹ','ㅌ'],
  'ㄿ': ['ㄹ','ㅍ'],
  'ㅀ': ['ㄹ','ㅎ'],
  'ㅄ': ['ㅂ','ㅅ'],
  'ㅘ': ['ㅗ','ㅏ'],
  'ㅙ': ['ㅗ','ㅐ'],
  'ㅚ': ['ㅗ','ㅣ'],
  'ㅝ': ['ㅜ','ㅓ'],
  'ㅞ': ['ㅜ','ㅔ'],
  'ㅟ': ['ㅜ','ㅣ'],
  'ㅢ': ['ㅡ','ㅣ']
};

const toKatakana = (char: string): string => {
  const code = char.codePointAt(0);
  if (!code) return char;
  if (code >= HIRAGANA_START && code <= HIRAGANA_END) {
    return String.fromCodePoint(code + 0x60);
  }
  if (code === HIRAGANA_ITERATION) return String.fromCodePoint(KATAKANA_ITERATION);
  if (code === HIRAGANA_VOICED_ITERATION) return String.fromCodePoint(KATAKANA_VOICED_ITERATION);
  if (code === HIRAGANA_YORI) return String.fromCodePoint(KATAKANA_KOTO);
  return char;
};

const decomposeHangulSyllable = (char: string): string[] | null => {
  const code = char.codePointAt(0);
  if (!code || code < HANGUL_SYLLABLE_START || code > HANGUL_SYLLABLE_END) return null;
  const sIndex = code - HANGUL_SYLLABLE_START;
  const lIndex = Math.floor(sIndex / 588);
  const vIndex = Math.floor((sIndex % 588) / 28);
  const tIndex = sIndex % 28;
  const jamo = [HANGUL_L[lIndex], HANGUL_V[vIndex]];
  if (tIndex > 0) jamo.push(HANGUL_T[tIndex]);
  const expanded: string[] = [];
  for (const j of jamo) {
    const parts = COMPOUND_JAMO[j];
    if (parts) expanded.push(...parts);
    else expanded.push(j);
  }
  return expanded;
};

export const encode = (text: string, opts?: Partial<Options>): string => {
  const options = getOptions(opts);
  const characters = getCharacters(options);
  
  return [...text.replace(/\s+/g, options.separator).trim()]
    .map((character) => {
      const upperChar = character.toLocaleUpperCase();

      const hangulJamo = decomposeHangulSyllable(upperChar);
      if (hangulJamo) {
        const morseParts = hangulJamo.map((jamo) => {
          for (const set in characters) {
            const charSet = characters[set as keyof typeof characters];
            if (charSet && charSet[jamo]) return charSet[jamo];
          }
          return '';
        });
        if (morseParts.some((part) => !part)) return options.invalid;
        return morseParts.join(options.separator);
      }

      const kataChar = toKatakana(upperChar);
      const candidates = kataChar !== upperChar ? [kataChar, upperChar] : [upperChar];

      // 1. Try Standard Characters
      for (const c of candidates) {
        for (const set in characters) {
          const charSet = characters[set as keyof typeof characters];
          if (charSet && charSet[c]) {
            return charSet[c];
          }
        }
      }

      // 2. Try Chinese (CTC)
      const ctcCode = hanzi2ctc(character);
      if (ctcCode) {
        // Convert each digit of the CTC code (e.g. "0333") to Morse
        return ctcCode.split('').map(digit => {
          // Find Morse for digit
          for (const set in characters) {
            const charSet = characters[set as keyof typeof characters];
            if (charSet && charSet[digit]) {
              return charSet[digit];
            }
          }
          return ''; 
        }).join(options.separator); // Join the 4 Morse codes with space
      }
      return options.invalid;
    })
    .join(options.separator)
    .replace(/0/g, options.dot)
    .replace(/1/g, options.dash);
};

export const decode = (morse: string, opts?: Partial<Options>): string => {
  const options = getOptions(opts);
  const swapped = swapCharacters(options);
  return morse
    .replace(/\s+/g, options.separator)
    .trim()
    .split(options.separator)
    .map((characters) => {
      if (typeof swapped[characters] !== 'undefined') {
        return swapped[characters];
      }
      return options.invalid;
    })
    .join('');
};

export const decodeCN = (text: string): string => {
  // Replace 4-digit sequences with Chinese characters
  return text.replace(/\b(\d{4})\b/g, (match) => {
    const hanzi = ctc2hanzi(match);
    return hanzi || match;
  });
};
export const characters = (options?: Partial<Options>, usePriority: boolean = false): Characters => {
  return getMappedCharacters(getOptions(options), usePriority);
};

export const audio = (text: string, opts?: Partial<Options>, morseString?: string): AudioResult => {
  const morse = morseString || encode(text, opts);
  const options = getOptions(opts);
  return getAudio(morse, options);
};

// Export types
export type { Options, Characters, AudioResult, Oscillator, AudioState, AudioEvents } from './types.js';

export default {
  encode,
  decode,
  decodeCN,
  characters,
  audio,
};
