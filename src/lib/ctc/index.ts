import ctc2hanziDict from './ctc2hanzi.json';
import hanzi2ctcDict from './hanzi2ctc.json';

export const ctc2hanzi = (code: string): string => {
  // The JSON keys are strings.
  return (ctc2hanziDict as Record<string, string>)[code] || '';
};

export const hanzi2ctc = (char: string): string => {
  return (hanzi2ctcDict as Record<string, string>)[char] || '';
};

export default {
  ctc2hanzi,
  hanzi2ctc
};
