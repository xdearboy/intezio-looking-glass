import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../../messages/ar.json';
import de from '../../messages/de.json';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import fr from '../../messages/fr.json';
import kk from '../../messages/kk.json';
import pl from '../../messages/pl.json';
import ru from '../../messages/ru.json';
import uk from '../../messages/uk.json';
import zh from '../../messages/zh.json';

const LOCALES = ['ru', 'en', 'ar', 'kk', 'uk', 'de', 'fr', 'zh', 'es', 'pl'] as const;
export type Locale = (typeof LOCALES)[number];

export function getLocaleFromCookie(): Locale {
  const cookie = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('locale='));
  const value = cookie?.split('=')[1];
  return (LOCALES as readonly string[]).includes(value ?? '') ? (value as Locale) : 'ru';
}

i18n.use(initReactI18next).init({
  lng: typeof document !== 'undefined' ? getLocaleFromCookie() : 'ru',
  fallbackLng: 'ru',
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    ar: { translation: ar },
    kk: { translation: kk },
    uk: { translation: uk },
    de: { translation: de },
    fr: { translation: fr },
    zh: { translation: zh },
    es: { translation: es },
    pl: { translation: pl },
  },
  interpolation: {
    escapeValue: false,
    prefix: '{',
    suffix: '}',
  },
});

export default i18n;
