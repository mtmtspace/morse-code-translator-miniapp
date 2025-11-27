<script setup lang="ts">
import { ref, watch } from 'vue';
import MorseCodeTranslator, { AudioResult } from '../../src/index';
import { useTheme } from './composables/useTheme';
import { useLanguage } from './composables/useLanguage';
import BackgroundEffect from './components/BackgroundEffect.vue';

const { isDark, toggleTheme } = useTheme();
const { currentLang, toggleLanguage, t } = useLanguage();

const mode = ref<'encode' | 'decode'>('encode');
const inputText = ref('');
const outputText = ref('');
const isPlaying = ref(false);
const currentAudio = ref<AudioResult | null>(null);
const showCopied = ref(false);
const errorMsg = ref('');
const showHelp = ref(false);

// State memory
const encodeInput = ref('');
const decodeInput = ref('');

// Translation logic
watch([inputText, mode], ([newText, newMode]) => {
  errorMsg.value = ''; // Clear previous errors
  try {
    if (!MorseCodeTranslator || !MorseCodeTranslator.encode) {
      throw new Error('Translation library not loaded properly. Please refresh.');
    }

    if (!newText) {
      outputText.value = '';
      return;
    }

    if (newMode === 'encode') {
      // Text -> Morse
      outputText.value = MorseCodeTranslator.encode(newText, { priority: 10 });
    } else {
      // Morse -> Text
      const decoded = MorseCodeTranslator.decode(newText);
      outputText.value = MorseCodeTranslator.decodeCN(decoded);
    }
  } catch (e: any) {
    console.error(e);
    errorMsg.value = e.message || 'An unknown error occurred';
    outputText.value = '';
  }
});

const copyToClipboard = async () => {
  if (!outputText.value) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
    showCopied.value = true;
    setTimeout(() => {
      showCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      inputText.value = text;
    }
  } catch (err) {
    console.error('Failed to paste:', err);
    errorMsg.value = 'Failed to paste from clipboard. Please check permissions.';
    setTimeout(() => errorMsg.value = '', 3000);
  }
};

const playAudio = async () => {
  const textToPlay = mode.value === 'encode' ? outputText.value : inputText.value;
  if (!textToPlay) return;
  
  stopAudio();

  try {
    isPlaying.value = true;
    const morse = mode.value === 'encode' ? outputText.value : inputText.value;
    
    const audioInstance = MorseCodeTranslator.audio('', { 
      volume: 100,
      wpm: 20,
      unit: 0.08,
      fwUnit: 0.08,
      oscillator: { type: 'sine', frequency: 600 },
      events: {
        onended: () => {
          isPlaying.value = false;
          currentAudio.value = null;
        },
        onstopped: () => {
          isPlaying.value = false;
          currentAudio.value = null;
        }
      }
    }, morse);

    currentAudio.value = audioInstance;
    audioInstance.play();
  } catch (error) {
    console.error("Audio playback failed:", error);
    isPlaying.value = false;
  }
};

const stopAudio = () => {
  if (currentAudio.value) {
    currentAudio.value.stop();
    currentAudio.value = null;
  }
  isPlaying.value = false;
};

const clear = () => {
  stopAudio();
  inputText.value = '';
  // Also clear the memory for current mode
  if (mode.value === 'encode') {
    encodeInput.value = '';
  } else {
    decodeInput.value = '';
  }
};

const setMode = (m: 'encode' | 'decode') => {
  if (m === mode.value) return;
  
  // Save current state
  if (mode.value === 'encode') {
    encodeInput.value = inputText.value;
  } else {
    decodeInput.value = inputText.value;
  }
  
  mode.value = m;
  
  // Restore new state
  if (m === 'encode') {
    inputText.value = encodeInput.value;
  } else {
    inputText.value = decodeInput.value;
  }
};
</script>

<template>
  <BackgroundEffect />
  
  <div class="min-h-screen text-gray-800 dark:text-gray-100 font-sans selection:bg-[#3B587B] selection:text-white transition-colors duration-500 relative">
    <!-- Header -->
    <header class="py-6 bg-transparent sticky top-0 z-50 transition-colors duration-500">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="text-2xl font-bold tracking-wider text-[#3B587B] dark:text-blue-300">{{ t('header.title') }}</div>
          <div class="h-4 w-px bg-gray-400/50 dark:bg-gray-600"></div>
          <div class="text-xs tracking-widest text-gray-500 dark:text-gray-400 uppercase">{{ t('header.subtitle') }}</div>
        </div>
        
        <div class="flex items-center gap-6">
          <!-- Help Button -->
          <button 
            @click="showHelp = true" 
            class="p-2 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer z-10"
            title="Supported Characters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <!-- Theme Toggle -->
          <button 
            @click="toggleTheme" 
            class="p-2 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer z-10"
            title="Toggle Theme"
            aria-label="Toggle Dark Mode"
          >
            <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>

          <!-- Language Toggle -->
          <button 
            @click="toggleLanguage" 
            class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[#3B587B] dark:hover:text-blue-300 transition-colors w-8"
          >
            {{ currentLang === 'en' ? 'CN' : 'EN' }}
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 lg:px-8 py-16 relative z-0">
      <!-- Title -->
      <div class="text-center mb-16">
        <h1 class="text-4xl md:text-5xl font-light text-[#3B587B] dark:text-blue-300 mb-8 tracking-tight transition-colors duration-500 drop-shadow-sm">{{ t('hero.title') }}</h1>
        <p class="text-gray-500 dark:text-gray-400 tracking-wide">{{ t('hero.subtitle') }}</p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" class="mb-8 max-w-3xl mx-auto bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-r shadow-sm" role="alert">
        <p class="font-bold">Error</p>
        <p>{{ errorMsg }}</p>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        
        <!-- Left Column: Input -->
        <div class="space-y-6">
          <!-- Tabs -->
          <div class="flex space-x-8 border-b border-gray-300/50 dark:border-gray-700/50">
            <button
              @click="setMode('encode')"
              :class="[
                'pb-4 text-sm tracking-widest uppercase transition-all duration-300 outline-none relative',
                mode === 'encode' 
                  ? 'text-[#3B587B] dark:text-blue-300 font-medium' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              ]"
            >
              {{ t('tabs.encode') }}
              <span v-if="mode === 'encode'" class="absolute bottom-0 left-0 w-full h-0.5 bg-[#3B587B] dark:bg-blue-300 shadow-[0_0_8px_rgba(59,88,123,0.5)] dark:shadow-[0_0_8px_rgba(147,197,253,0.5)]"></span>
            </button>
            <button
              @click="setMode('decode')"
              :class="[
                'pb-4 text-sm tracking-widest uppercase transition-all duration-300 outline-none relative',
                mode === 'decode' 
                  ? 'text-[#3B587B] dark:text-blue-300 font-medium' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              ]"
            >
              {{ t('tabs.decode') }}
              <span v-if="mode === 'decode'" class="absolute bottom-0 left-0 w-full h-0.5 bg-[#3B587B] dark:bg-blue-300 shadow-[0_0_8px_rgba(59,88,123,0.5)] dark:shadow-[0_0_8px_rgba(147,197,253,0.5)]"></span>
            </button>
          </div>

          <!-- Input Area -->
          <div class="relative group">
            <textarea
              id="input"
              v-model="inputText"
              class="w-full h-80 bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-xl p-8 text-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#3B587B]/20 dark:focus:ring-blue-400/20 resize-none transition-all shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(59,88,123,0.1)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              :placeholder="mode === 'encode' ? t('input.encodePlaceholder') : t('input.decodePlaceholder')"
            ></textarea>
            
            <!-- Paste Button -->
            <button
              @click="pasteFromClipboard"
              class="absolute top-4 right-4 p-2 text-gray-400 hover:text-[#3B587B] dark:hover:text-blue-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full shadow-sm hover:shadow-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Paste"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Right Column: Output -->
        <div class="space-y-6">
          <!-- Header/Label -->
          <div class="flex justify-between items-end border-b border-gray-300/50 dark:border-gray-700/50 h-[38px] pb-4">
            <span class="text-sm tracking-widest uppercase text-gray-500 dark:text-gray-400">{{ t('output.title') }}</span>
          </div>

          <!-- Output Area -->
          <div class="relative group">
            <div
              id="output"
              class="w-full h-80 bg-[#3B587B]/90 dark:bg-blue-900/40 backdrop-blur-md rounded-xl p-8 text-xl text-white font-mono break-all overflow-auto leading-relaxed shadow-[0_8px_32px_rgba(59,88,123,0.2)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col border border-white/10 transition-colors"
            >
              <div v-if="!outputText" class="text-[#B7C4DE]/60 dark:text-blue-200/30 text-base font-sans italic opacity-70 m-auto">
                {{ t('output.empty') }}
              </div>
              <div v-else>
                {{ outputText }}
              </div>
            </div>

            <!-- Copy Button -->
            <button
              v-if="outputText"
              @click="copyToClipboard"
              class="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Copy"
            >
              <span v-if="showCopied" class="text-xs font-bold px-1">{{ t('output.copied') }}</span>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

      </div>

      <!-- Controls Bar -->
      <div class="mt-16 flex justify-center items-center space-x-6">
        <template v-if="mode === 'encode'">
          <button
            @click="playAudio"
            :disabled="isPlaying || !outputText"
            class="group relative inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white transition-all duration-200 bg-[#3B587B] dark:bg-blue-600 rounded-full hover:bg-[#2C425E] dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B587B] dark:focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
          >
            <span v-if="isPlaying" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('controls.playing') }}
            </span>
            <span v-else class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
              </svg>
              {{ t('controls.play') }}
            </span>
          </button>

          <button
            @click="stopAudio"
            :disabled="!isPlaying"
            class="inline-flex items-center px-8 py-3 text-base font-medium text-[#3B587B] dark:text-blue-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B587B] dark:focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
          >
            {{ t('controls.stop') }}
          </button>
        </template>

        <button
          @click="clear"
          class="inline-flex items-center px-8 py-3 text-base font-medium text-gray-500 dark:text-gray-400 bg-transparent hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition-colors"
        >
          {{ t('controls.clear') }}
        </button>
      </div>

      <div class="mt-16 text-center border-t border-gray-200/50 dark:border-gray-800/50 pt-8">
        <p class="text-xs text-gray-400 dark:text-gray-500">
          {{ t('footer.copyright') }}
        </p>
        <p class="text-xs text-gray-300 dark:text-gray-700 mt-2">
           {{ t('footer.note') }}
        </p>
      </div>
    </main>

    <!-- Help Modal -->
    <div v-if="showHelp" class="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity" @click="showHelp = false"></div>
      
      <!-- Card -->
      <div class="relative bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
        <h3 class="text-2xl font-light text-[#3B587B] dark:text-blue-300 mb-6">{{ t('help.title') }}</h3>
        
        <ul class="space-y-3 text-gray-600 dark:text-gray-300 font-medium overflow-y-auto max-h-[60vh] pr-2">
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.en') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.num') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.cn') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.jp') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.kr') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.th') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.ru') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.gr') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.he') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.ar') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.pe') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.lat') }}
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 bg-[#3B587B] dark:bg-blue-400 rounded-full mr-3 shrink-0"></span>
            {{ t('help.sym') }}
          </li>
        </ul>

        <div class="mt-8 flex justify-end">
          <button 
            @click="showHelp = false"
            class="px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm font-bold transition-colors"
          >
            {{ t('help.close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
