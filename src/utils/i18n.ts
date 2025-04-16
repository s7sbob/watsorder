import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import english from 'src/utils/languages/en.json';
import arabic from 'src/utils/languages/ar.json';

const resources = {
  en: {
    translation: english,
  },
  ar: {
    translation: arabic,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // اللغة الافتراضية
    interpolation: {
      escapeValue: false, // react بالفعل يحمي من xss
    },
  });

export default i18n;
