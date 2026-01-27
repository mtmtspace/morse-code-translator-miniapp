import { ref, computed } from 'vue';
import { translations, Language } from '../locales/translations';

const currentLang = ref<Language>('en');

export function useLanguage() {
  const toggleLanguage = () => {
    currentLang.value = currentLang.value === 'en' ? 'cn' : 'en';
  };

  const t = (path: string) => {
    const keys = path.split('.');
    let value: any = translations[currentLang.value];
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return path;
      }
    }
    return value;
  };

  return { currentLang, toggleLanguage, t };
}
