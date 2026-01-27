import { ref, onMounted } from 'vue';

// Global state to share across components if needed
const isDark = ref(false);

export function useTheme() {
  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      console.log('Theme applied: Dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      console.log('Theme applied: Light');
    }
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    applyTheme();
  };

  onMounted(() => {
    // Initialize logic
    const savedTheme = localStorage.getItem('theme');
    // Check system preference if no saved theme
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
      isDark.value = true;
    } else {
      isDark.value = false;
    }
    applyTheme();
  });

  return { isDark, toggleTheme };
}
