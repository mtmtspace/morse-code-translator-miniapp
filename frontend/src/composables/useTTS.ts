import { ref, onUnmounted } from 'vue';

export function useTTS() {
  const playingId = ref<string | null>(null);
  const synthesis = window.speechSynthesis;
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  const detectLanguage = (text: string): string => {
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh-CN';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja-JP';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru-RU';
    if (/[\u0e00-\u0e7f]/.test(text)) return 'th-TH';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko-KR';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar-SA';
    if (/[\u0370-\u03ff]/.test(text)) return 'el-GR';
    return 'en-US';
  };

  const speak = (text: string, id: string) => {
    // If clicking the same button while playing, stop it.
    if (playingId.value === id) {
      stop();
      return;
    }

    // Stop any current playback
    stop();

    if (!text) return;

    const lang = detectLanguage(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0; 

    utterance.onstart = () => { playingId.value = id; };
    utterance.onend = () => { playingId.value = null; currentUtterance = null; };
    utterance.onerror = (e) => { 
      console.error('TTS Error:', e); 
      playingId.value = null; 
      currentUtterance = null;
    };

    currentUtterance = utterance;
    synthesis.speak(utterance);
  };

  const stop = () => {
    synthesis.cancel();
    playingId.value = null;
    currentUtterance = null;
  };

  onUnmounted(() => {
    stop();
  });

  return { playingId, speak, stop };
}
