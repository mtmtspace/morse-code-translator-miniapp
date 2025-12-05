<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import MorseCodeTranslator, { AudioResult } from '../../src/index';
import { useTheme } from './composables/useTheme';
import { useLanguage } from './composables/useLanguage';
import { useVisualSignal } from './composables/useVisualSignal';
import { useTTS } from './composables/useTTS';
import BackgroundEffect from './components/BackgroundEffect.vue';
import CustomSelect from './components/CustomSelect.vue';

const { isDark, toggleTheme } = useTheme();
const { currentLang, toggleLanguage, t } = useLanguage();
const { isLit, isPlaying: isVisualPlaying, playSignal, stopSignal: stopVisualSignal } = useVisualSignal();
const { playingId, speak: speakText, stop: stopText } = useTTS();

const mode = ref<'encode' | 'decode'>('encode');
const inputText = ref('');
const outputText = ref('');
const isAudioPlaying = ref(false);
const currentAudio = ref<AudioResult | null>(null);
const showCopied = ref(false);
const errorMsg = ref('');
const showHelp = ref(false);
const isVisualMode = ref(false);
const visualBoxRef = ref<HTMLElement | null>(null);
const loopVisual = ref(false);
const playAudioWithVisual = ref(false);
const isFullscreen = ref(false);

// Decoding priority (default to '1' for Latin)
const decodePriority = ref('1');

const priorityOptions = [
  { label: 'Latin (English)', value: '1' },
  { label: 'Cyrillic (Russian)', value: '5' },
  { label: 'Greek', value: '6' },
  { label: 'Hebrew', value: '7' },
  { label: 'Arabic', value: '8' },
  { label: 'Persian', value: '9' },
  { label: 'Japanese', value: '10' },
  { label: 'Korean', value: '11' },
  { label: 'Thai', value: '12' },
];

// State memory
const encodeInput = ref('');
const decodeInput = ref('');

// Statistics
const inputStats = computed(() => {
  const text = inputText.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { chars, words };
});

const outputStats = computed(() => {
  const text = outputText.value;
  let units = 0;
  for (const char of text) {
    if (char === '.') units += 2;
    else if (char === '-') units += 4;
    else if (char === ' ') units += 2;
    else if (char === '/') units += 6;
  }
  if (units > 0) units -= 1;
  const seconds = (units * 0.06).toFixed(1);
  return { chars: text.length, time: seconds };
});

const canVisualize = computed(() => {
  if (mode.value === 'encode') return !!outputText.value;
  if (mode.value === 'decode') return !!inputText.value;
  return false;
});

// Translation logic
watch([inputText, mode, decodePriority], ([newText, newMode, newPriority]) => {
  errorMsg.value = ''; 
  try {
    if (!MorseCodeTranslator || !MorseCodeTranslator.encode) throw new Error('Library Error');

    if (!newText) {
      outputText.value = '';
      return;
    }

    if (newMode === 'encode') {
      outputText.value = MorseCodeTranslator.encode(newText, { priority: 10 });
    } else {
      const decoded = MorseCodeTranslator.decode(newText, { priority: newPriority as any });
      outputText.value = MorseCodeTranslator.decodeCN(decoded);
    }
  } catch (e: any) {
    console.error(e);
    errorMsg.value = e.message || 'Error';
    outputText.value = '';
  }
});

const copyToClipboard = async () => {
  if (!outputText.value) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
    showCopied.value = true;
    setTimeout(() => showCopied.value = false, 2000);
  } catch (err) {
    console.error(err);
  }
};

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) inputText.value = text;
  } catch (err) {
    console.error(err);
  }
};

// Audio Logic
const playAudio = async () => {
  const textToPlay = mode.value === 'encode' ? outputText.value : inputText.value;
  if (!textToPlay) return;
  stopAudio();
  try {
    isAudioPlaying.value = true;
    const morse = mode.value === 'encode' ? outputText.value : inputText.value;
    
    const audioInstance = MorseCodeTranslator.audio('', { 
      volume: 100, wpm: 20, unit: 0.08, fwUnit: 0.08,
      oscillator: { type: 'sine', frequency: 600 },
      events: {
        onended: () => { isAudioPlaying.value = false; currentAudio.value = null; },
        onstopped: () => { isAudioPlaying.value = false; currentAudio.value = null; }
      }
    }, morse);

    currentAudio.value = audioInstance;
    audioInstance.play();
  } catch (error) {
    console.error(error);
    isAudioPlaying.value = false;
  }
};

const stopAudio = () => {
  if (currentAudio.value) {
    currentAudio.value.stop();
    currentAudio.value = null;
  }
  isAudioPlaying.value = false;
};

const clear = () => {
  stopAudio();
  stopVisualSignal();
  inputText.value = '';
  if (mode.value === 'encode') encodeInput.value = '';
  else decodeInput.value = '';
};

const setMode = (m: 'encode' | 'decode') => {
  if (m === mode.value) return;
  if (mode.value === 'encode') encodeInput.value = inputText.value;
  else decodeInput.value = inputText.value;
  mode.value = m;
  if (m === 'encode') inputText.value = encodeInput.value;
  else inputText.value = decodeInput.value;
};

// Visual Logic
const toggleVisualMode = () => {
  isVisualMode.value = !isVisualMode.value;
  if (!isVisualMode.value) {
    stopVisualSignal();
    stopAudio();
  }
};

const togglePlayVisual = () => {
  if (isVisualPlaying.value) {
    stopVisualSignal();
  } else {
    playVisual();
  }
};

const playVisual = () => {
  const morse = mode.value === 'encode' ? outputText.value : inputText.value;
  if (!morse) return;
  playSignal(morse, { loop: loopVisual.value });
  if (playAudioWithVisual.value) playAudio();
};

const toggleFullscreen = () => {
  if (!visualBoxRef.value) return;
  if (!document.fullscreenElement) {
    visualBoxRef.value.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});
</script>

<template>
  <BackgroundEffect />
  
  <div class="min-h-screen text-gray-800 dark:text-gray-100 font-sans selection:bg-[#A2B59F] selection:text-white transition-colors duration-500 relative flex flex-col">
    <!-- Header -->
    <header class="py-6 bg-transparent transition-colors duration-500 relative z-50">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="text-2xl font-bold tracking-wider text-[#A2B59F] dark:text-[#BFC8D7]">{{ t('header.title') }}</div>
          <div class="h-4 w-px bg-gray-400/50 dark:bg-gray-600"></div>
          <div class="text-xs tracking-widest text-gray-500 dark:text-gray-400 uppercase">{{ t('header.subtitle') }}</div>
        </div>
        
        <div class="flex items-center gap-6">
          <!-- Help Button -->
          <button @click="showHelp = true" class="p-2 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer z-10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>

          <!-- Theme Toggle -->
          <button @click="toggleTheme" class="p-2 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer z-10">
            <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          </button>

          <!-- Language Toggle -->
          <button @click="toggleLanguage" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[#A2B59F] dark:hover:text-[#BFC8D7] transition-colors w-8">{{ currentLang === 'en' ? 'CN' : 'EN' }}</button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex-1 flex flex-col relative w-full">
      <!-- Title -->
      <div class="text-center mb-8 transition-all duration-700 will-change-[opacity,transform,height]" :class="{ 'opacity-0 -translate-y-10 h-0 mb-0 overflow-hidden': isVisualMode }">
        <h1 class="text-4xl md:text-5xl font-light text-gray-700 dark:text-[#BFC8D7] mb-8 tracking-tight transition-colors duration-500 drop-shadow-sm">{{ t('hero.title') }}</h1>
        <p class="text-gray-500 dark:text-gray-400 tracking-wide">{{ t('hero.subtitle') }}</p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" class="mb-8 max-w-3xl mx-auto bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-r shadow-sm" role="alert">
        <p class="font-bold">Error</p>
        <p>{{ errorMsg }}</p>
      </div>

      <!-- Content Wrapper -->
      <div class="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform origin-top w-full will-change-transform" :class="isVisualMode ? 'scale-90 -translate-y-4' : ''">
        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          <!-- Left Column: Input -->
          <div class="space-y-6">
            <!-- Tabs -->
            <div class="flex space-x-8 border-b border-gray-300/50 dark:border-gray-700/50">
              <button @click="setMode('encode')" :class="['pb-4 text-sm tracking-widest uppercase transition-all duration-300 outline-none relative', mode === 'encode' ? 'text-[#A2B59F] dark:text-[#BFC8D7] font-medium' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300']">
                {{ t('tabs.encode') }}
                <span v-if="mode === 'encode'" class="absolute bottom-0 left-0 w-full h-0.5 bg-[#A2B59F] dark:bg-[#BFC8D7] shadow-[0_0_8px_rgba(162,181,159,0.5)]"></span>
              </button>
              <button @click="setMode('decode')" :class="['pb-4 text-sm tracking-widest uppercase transition-all duration-300 outline-none relative', mode === 'decode' ? 'text-[#A2B59F] dark:text-[#BFC8D7] font-medium' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300']">
                {{ t('tabs.decode') }}
                <span v-if="mode === 'decode'" class="absolute bottom-0 left-0 w-full h-0.5 bg-[#A2B59F] dark:bg-[#BFC8D7] shadow-[0_0_8px_rgba(162,181,159,0.5)]"></span>
              </button>
            </div>

            <!-- Input Area -->
            <div class="relative group w-full h-64 lg:h-80 bg-white dark:bg-[#27272a] border border-gray-200 dark:border-transparent rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus-within:border-gray-300 dark:focus-within:border-gray-600">
              <textarea
                id="input"
                v-model="inputText"
                class="w-full h-full bg-transparent border-0 rounded-xl p-8 pb-12 text-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 resize-none"
                :placeholder="mode === 'encode' ? t('input.encodePlaceholder') : t('input.decodePlaceholder')"
              ></textarea>
              
              <!-- Input Stats Bar -->
              <div class="absolute bottom-0 left-0 w-full h-10 bg-black/5 dark:bg-black/20 rounded-b-xl flex items-center justify-between px-6 text-xs text-gray-500 dark:text-gray-400 pointer-events-none transition-colors duration-500">
                <span>{{ inputStats.words }} {{ t('stats.words') }}</span>
                <span>{{ inputStats.chars }} {{ t('stats.chars') }}</span>
              </div>

              <div class="absolute top-4 right-4 flex gap-2">
                <!-- TTS Button (Encode Mode Only) -->
                <button 
                  v-if="mode === 'encode'"
                  @click="speakText(inputText, 'input')"
                  :disabled="!inputText"
                  class="p-2 text-gray-400 hover:text-[#A2B59F] dark:hover:text-[#E3E2B4] bg-transparent dark:bg-gray-700/20 rounded-full shadow-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-30"
                  title="Read Aloud"
                >
                  <svg v-if="playingId === 'input'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </button>

                <!-- Paste Button -->
                <button @click="pasteFromClipboard" class="p-2 text-gray-400 hover:text-[#A2B59F] dark:hover:text-[#E3E2B4] bg-transparent dark:bg-gray-700/20 rounded-full shadow-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" title="Paste">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Output -->
          <div class="space-y-6">
            <div class="flex justify-between items-end border-b border-gray-300/50 dark:border-gray-700/50 h-[38px] pb-4">
              <span class="text-sm tracking-widest uppercase text-gray-500 dark:text-gray-400">{{ t('output.title') }}</span>
            </div>

            <div class="relative group">
              <!-- Output Box -->
              <div id="output" class="w-full h-64 lg:h-80 bg-[#BFC8D7] dark:bg-[#334155] rounded-xl p-8 pb-12 text-xl text-gray-800 dark:text-white font-mono break-all overflow-auto leading-relaxed shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col border border-transparent transition-all duration-300">
                <div v-if="!outputText" class="text-gray-500/50 dark:text-gray-400/50 text-base font-sans italic opacity-70 m-auto">{{ t('output.empty') }}</div>
                <div v-else>{{ outputText }}</div>
              </div>
              
              <!-- Output Stats Bar -->
              <div class="absolute bottom-0 left-0 w-full h-10 bg-black/5 dark:bg-black/20 rounded-b-xl flex items-center justify-between px-6 text-xs text-gray-600 dark:text-gray-300 pointer-events-none z-10 transition-colors duration-500">
                <span>{{ outputStats.time }} {{ t('stats.time') }}</span>
                <span>{{ outputStats.chars }} {{ t('stats.chars') }}</span>
              </div>

              <div v-if="mode === 'decode'" class="absolute bottom-12 left-4 z-20">
                <CustomSelect v-model="decodePriority" :options="priorityOptions" :title="t('input.priorityTitle') || 'Decoding Language Priority'" />
              </div>

              <div class="absolute top-4 right-4 flex gap-2">
                <!-- TTS Button (Decode Mode Only) -->
                <button 
                  v-if="mode === 'decode' && outputText"
                  @click="speakText(outputText, 'output')"
                  class="p-2 text-gray-600 hover:text-gray-900 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Read Aloud"
                >
                  <svg v-if="playingId === 'output'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </button>

                <button v-if="outputText" @click="copyToClipboard" class="p-2 text-gray-600 hover:text-gray-900 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" title="Copy">
                  <span v-if="showCopied" class="text-xs font-bold px-1">{{ t('output.copied') }}</span>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Visualizer Box (Grid Transition) -->
      <div 
        class="grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        :class="isVisualMode ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      >
        <div class="overflow-hidden">
          <!-- Inner container -->
          <div class="w-full max-w-4xl mx-auto mt-6 mb-2 transform transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom"
               :class="isVisualMode ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-12'">
            <div 
              ref="visualBoxRef"
              class="w-full h-64 overflow-hidden relative transition-colors duration-100 flex items-center justify-center"
              :class="[
                isLit ? 'bg-white z-50' : 'bg-black',
                isFullscreen ? 'rounded-none border-0' : 'rounded-3xl border border-gray-200 dark:border-gray-700'
              ]"
            >
              <!-- Light Bulb Icon (Center) -->
              <svg 
                @click="togglePlayVisual"
                xmlns="http://www.w3.org/2000/svg" 
                class="h-24 w-24 transition-all duration-100 cursor-pointer hover:scale-105 active:scale-95" 
                :class="isLit ? 'text-[#E3E2B4] scale-110 drop-shadow-[0_0_20px_rgba(227,226,180,0.8)]' : 'text-gray-800 scale-100'" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M12 2C7.58 2 3.13 5.58 3.13 10c0 3.33 2.08 6.21 5.13 7.5V20c0 1.1.9 2 2 2h2.5c1.1 0 2-.9 2-2v-2.5c3.05-1.29 5.13-4.17 5.13-7.5 0-4.42-4.45-8-8.87-8zM7.5 10c0-2.48 2.02-4.5 4.5-4.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5-4.5-2.02-4.5-4.5z"/>
              </svg>

              <!-- Fullscreen Button -->
              <button @click="toggleFullscreen" class="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all backdrop-blur-md">
                <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls Bar -->
      <div class="mt-16 w-full flex justify-center relative h-24">
        <transition 
          mode="out-in"
          enter-active-class="transition-all duration-500 ease-out"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-4"
        >
          <!-- Standard Controls Wrapper -->
          <div v-if="!isVisualMode" class="absolute top-0 flex items-center space-x-6 w-full justify-center">
            <button v-if="mode === 'encode'" @click="playAudio" :disabled="isAudioPlaying || !outputText" class="group relative inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white transition-all duration-200 bg-[#A2B59F] dark:bg-[#E3E2B4] dark:text-gray-900 rounded-full hover:bg-[#8F9F8C] dark:hover:bg-[#d4d3a0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2B59F] dark:focus:ring-[#E3E2B4] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0">
              <span v-if="isAudioPlaying" class="flex items-center"><svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{{ t('controls.playing') }}</span>
              <span v-else class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>{{ t('controls.play') }}</span>
            </button>

                      <button v-if="mode === 'encode'" @click="stopAudio" :disabled="!isAudioPlaying" class="inline-flex items-center px-8 py-3 text-base font-medium text-[#A2B59F] dark:text-[#BFC8D7] bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2B59F] dark:focus:ring-[#BFC8D7] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0">{{ t('controls.stop') }}</button>
            
                      <!-- Visualize Button (Toggle) -->
                      <button @click="toggleVisualMode" :disabled="!canVisualize" class="p-3 rounded-full bg-[#E3E2B4] dark:bg-[#E3E2B4]/20 text-[#4A5D4A] dark:text-[#E3E2B4] hover:bg-[#d9d8a0] dark:hover:bg-[#E3E2B4]/40 transition-all shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed" title="Visualize / Light Mode">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      </button>
            
                      <button @click="clear" class="inline-flex items-center px-8 py-3 text-base font-medium text-gray-500 dark:text-gray-400 bg-transparent hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition-colors">{{ t('controls.clear') }}</button>          </div>

          <!-- Visual Mode Controls Wrapper -->
          <div v-else class="absolute top-0 flex flex-col items-center gap-6 w-full animate-fade-in">
              <div class="flex items-center justify-center gap-6 flex-wrap">
                <button @click="playVisual" :disabled="isVisualPlaying" class="group relative inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white transition-all duration-200 bg-[#A2B59F] dark:bg-[#4A5D4A] rounded-full hover:bg-[#8F9F8C] dark:hover:bg-[#3A4A3A] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span v-if="isVisualPlaying" class="flex items-center">{{ t('visual.visualizing') }}</span>
                  <span v-else class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{{ t('visual.start') }}</span>
                </button>

                <button @click="stopVisualSignal" :disabled="!isVisualPlaying" class="inline-flex items-center px-8 py-3 text-base font-medium text-[#A2B59F] dark:text-[#BFC8D7] bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all">{{ t('visual.stop') }}</button>

                <button @click="toggleVisualMode" class="inline-flex items-center px-8 py-3 text-base font-medium text-gray-500 dark:text-gray-400 bg-transparent hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition-colors border border-gray-300/50 rounded-full hover:bg-gray-100/50">{{ t('visual.close') }}</button>
              </div>

              <!-- Visual Options -->
              <div class="flex gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
                <label class="flex items-center gap-2 cursor-pointer hover:text-[#A2B59F] dark:hover:text-[#BFC8D7] transition-colors select-none">
                  <input type="checkbox" v-model="loopVisual" class="w-4 h-4 rounded border-gray-300 text-[#A2B59F] focus:ring-[#A2B59F]/50 transition-all cursor-pointer">
                  {{ t('visual.loop') }}
                </label>
                <label class="flex items-center gap-2 cursor-pointer hover:text-[#A2B59F] dark:hover:text-[#BFC8D7] transition-colors select-none">
                  <input type="checkbox" v-model="playAudioWithVisual" class="w-4 h-4 rounded border-gray-300 text-[#A2B59F] focus:ring-[#A2B59F]/50 transition-all cursor-pointer">
                  {{ t('visual.audio') }}
                </label>
              </div>
          </div>
        </transition>
      </div>

      <div class="mt-16 text-center border-t border-gray-200/50 dark:border-gray-800/50 pt-8">
        <p class="text-xs text-gray-400 dark:text-gray-600">{{ t('footer.copyright') }}</p>
        <p class="text-xs text-gray-300 dark:text-gray-700 mt-2">{{ t('footer.note') }}</p>
      </div>
    </main>

    <!-- Help Modal -->
    <transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showHelp" class="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog">
        <div class="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity" @click="showHelp = false"></div>
        <div class="relative bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
          <h3 class="text-2xl font-light text-[#A2B59F] dark:text-[#BFC8D7] mb-6">{{ t('help.title') }}</h3>
          <ul class="space-y-3 text-gray-600 dark:text-gray-300 font-medium overflow-y-auto max-h-[60vh] pr-2">
            <li v-for="(label, key) in ['en', 'num', 'cn', 'jp', 'kr', 'th', 'ru', 'gr', 'he', 'ar', 'pe', 'lat', 'sym']" :key="key" class="flex items-center">
              <span class="w-2 h-2 bg-[#A2B59F] dark:bg-[#BFC8D7] rounded-full mr-3 shrink-0"></span>
              {{ t(`help.${label}`) }}
            </li>
          </ul>
          <div class="mt-8 flex justify-end">
            <button @click="showHelp = false" class="px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm font-bold transition-colors">{{ t('help.close') }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>