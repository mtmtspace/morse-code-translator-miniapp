<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Option {
  label: string;
  value: string;
}

const props = defineProps<{
  modelValue: string;
  options: Option[];
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const toggle = () => isOpen.value = !isOpen.value;

const select = (value: string) => {
  emit('update:modelValue', value);
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Find current label
const currentLabel = () => props.options.find(o => o.value === props.modelValue)?.label || props.modelValue;
</script>

<template>
  <div class="relative" ref="containerRef">
    <!-- Trigger Button -->
    <button
      @click="toggle"
      class="flex items-center appearance-none bg-black/20 hover:bg-black/30 backdrop-blur border border-white/10 text-xs font-medium text-white/90 py-1.5 pl-3 pr-2 rounded-full cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95"
      :title="title"
    >
      <span class="mr-2">{{ currentLabel() }}</span>
      <svg 
        class="h-3 w-3 text-white/70 transition-transform duration-200" 
        :class="{ 'rotate-180': isOpen }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div 
        v-if="isOpen"
        class="absolute bottom-full left-0 mb-2 w-48 p-1 rounded-xl bg-white dark:bg-[#1e293b] shadow-xl border border-gray-100 dark:border-gray-700 z-50"
      >
        <ul class="max-h-60 overflow-y-auto rounded-lg scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <li 
            v-for="option in options" 
            :key="option.value"
            @click="select(option.value)"
            class="px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between rounded-md mx-1 my-0.5"
            :class="[
              modelValue === option.value 
                ? 'bg-[#3B587B]/10 dark:bg-blue-500/20 text-[#3B587B] dark:text-blue-300 font-bold' 
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            ]"
          >
            {{ option.label }}
            <span v-if="modelValue === option.value" class="text-[#3B587B] dark:text-blue-300">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>
