import { getCharacters, getMappedCharacters, swapCharacters } from './characters.js';
import getOptions from './options.js';
import getAudio from './audio.js';
import type { Options, Characters, AudioResult } from './types.js';
import { hanzi2ctc, ctc2hanzi } from './lib/ctc/index.js';

export const encode = (text: string, opts?: Partial<Options>): string => {
  const options = getOptions(opts);
  const characters = getCharacters(options);
  
  return [...text.replace(/\s+/g, options.separator).trim()]
    .map((character) => {
      const upperChar = character.toLocaleUpperCase();
      
      // 1. Try Standard Characters
      for (const set in characters) {
        const charSet = characters[set as keyof typeof characters];
        if (charSet && charSet[upperChar]) {
          return charSet[upperChar];
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
