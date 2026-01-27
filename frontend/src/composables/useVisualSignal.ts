import { ref } from 'vue';

export function useVisualSignal() {
  const isLit = ref(false);
  const isPlaying = ref(false);
  const progress = ref(0); // Percentage
  let timeoutId: any = null;
  let shouldStop = false;

  const UNIT = 60; // ms per dot (WPM 20 => 1200/20 = 60ms)

  const wait = (ms: number) => new Promise(resolve => {
    timeoutId = setTimeout(resolve, ms);
  });

  const stopSignal = () => {
    shouldStop = true;
    isPlaying.value = false;
    isLit.value = false;
    progress.value = 0;
    if (timeoutId) clearTimeout(timeoutId);
  };

  const playSignal = async (morse: string, options: { loop: boolean } = { loop: false }) => {
    // If already playing and this is a new call, stop first? 
    // Or if looping, we are inside the loop.
    if (isPlaying.value && !options.loop) stopSignal();
    
    // Reset
    shouldStop = false;
    isPlaying.value = true;
    isLit.value = false;
    progress.value = 0;

    const playOnce = async () => {
      const symbols = morse.split('');
      const total = symbols.length;

      for (let i = 0; i < total; i++) {
        if (shouldStop) return;
        progress.value = (i / total) * 100;

        const char = symbols[i];

        if (char === '.' || char === '0') {
          isLit.value = true;
          await wait(UNIT);
          isLit.value = false;
          await wait(UNIT); 
        } else if (char === '-' || char === '1') {
          isLit.value = true;
          await wait(UNIT * 3);
          isLit.value = false;
          await wait(UNIT); 
        } else if (char === ' ') {
          await wait(UNIT * 2);
        } else if (char === '/') {
          await wait(UNIT * 6); 
        }
      }
      // End gap
      await wait(UNIT * 7);
    };

    do {
      await playOnce();
    } while (options.loop && !shouldStop);

    if (!shouldStop) {
      isPlaying.value = false;
      isLit.value = false;
      progress.value = 100;
    }
  };

  return { isLit, isPlaying, progress, playSignal, stopSignal };
}
