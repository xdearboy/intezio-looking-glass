import { useEffect, useState } from 'react';
import i18n, { type Locale } from '@/src/i18n';
import { useLocale } from '@/src/i18n/useLocale';
import { useTranslations } from '@/src/i18n/useTranslations';

const locales = ['ru', 'en', 'ar', 'kk', 'uk', 'de', 'fr', 'zh', 'es', 'pl'] as const;

const localeMeta: Record<Locale, { label: string; flag: string }> = {
  ru: { label: 'Русский', flag: '🇷🇺' },
  en: { label: 'English', flag: '🇬🇧' },
  ar: { label: 'العربية', flag: '🇦🇪' },
  kk: { label: 'Қазақша', flag: '🇰🇿' },
  uk: { label: 'Українська', flag: '🇺🇦' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  fr: { label: 'Français', flag: '🇫🇷' },
  zh: { label: '中文', flag: '🇨🇳' },
  es: { label: 'Español', flag: '🇪🇸' },
  pl: { label: 'Polski', flag: '🇵🇱' },
};

const burgerLinkClass =
  'p-3 rounded-[12px] hover:bg-[#141414] border border-transparent hover:border-white/10 opacity-50 hover:opacity-100 transition-colors text-[14px] no-underline text-white';

const Navbar = () => {
  const t = useTranslations('navbar');
  const locale = useLocale() as Locale;
  const [isPending, setIsPending] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isBurgerOpen, setIsBurgerOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  const switchLocale = async (nextLocale: Locale) => {
    setIsPending(true);
    await fetch('/api/set-locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: nextLocale }),
    });
    await i18n.changeLanguage(nextLocale);
    document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLocale;
    setIsPending(false);
    setIsLangOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.lang-dd')) setIsLangOpen(false);
      if (!target.closest('.services-dd')) setIsServicesOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] flex flex-col">
      <div
        className={`relative z-[1100] w-full bg-[#0a0a0a] border-b border-white/10 transition-all duration-300 ${
          isScrolled
            ? 'max-h-0 opacity-0 pointer-events-none overflow-hidden border-b-0'
            : isLangOpen
              ? 'max-h-[220px] opacity-100 overflow-visible'
              : 'max-h-[60px] opacity-100 overflow-visible'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-5 md:px-10 h-[46px] md:h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="flex items-center gap-2 text-xs md:text-sm font-light text-white">
              <span
                className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full"
                aria-hidden="true"
              />
              <span>{t('active')}</span>
            </div>
            <div className="w-px h-4 bg-white/15" />
            <div className="relative lang-dd">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs md:text-sm font-light text-white bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
                onClick={() => setIsLangOpen((v) => !v)}
                disabled={isPending}
                aria-expanded={isLangOpen}
                aria-haspopup="menu"
              >
                <span>{localeMeta[locale]?.label ?? t('language')}</span>
                <svg
                  className={`w-3 h-3 opacity-60 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isLangOpen && (
                <div
                  className="absolute top-[calc(100%+8px)] left-0 bg-black/80 border border-white/25 backdrop-blur-[20px] rounded-[18px] p-2 flex flex-col gap-1 min-w-[150px] z-[1200]"
                  role="menu"
                >
                  {locales.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => switchLocale(l)}
                      className={`w-full text-left text-sm rounded-lg transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2 px-2.5 py-1.5 ${
                        locale === l ? 'text-white bg-white/10' : 'text-white/70 hover:text-white'
                      }`}
                      role="menuitem"
                    >
                      <span aria-hidden="true">{localeMeta[l].flag}</span>
                      <span dir={l === 'ar' ? 'rtl' : 'ltr'}>{localeMeta[l].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <a
            href="mailto:support@intezio.net"
            className="hidden md:flex items-center gap-2 text-sm font-light text-white no-underline hover:opacity-75 transition-opacity"
          >
            <img src="/at.svg" alt="" className="h-[1em] w-auto opacity-50" aria-hidden="true" />
            <span dir="ltr">support@intezio.net</span>
          </a>
        </div>
      </div>

      <div
        className={`w-full transition-all duration-300 ${
          isScrolled && !isBurgerOpen ? 'backdrop-blur-[50px] bg-black/10 -translate-y-px' : ''
        } ${isBurgerOpen ? 'bg-black' : ''}`}
      >
        <div className="max-w-[1440px] mx-auto px-5 md:px-10 py-3 md:py-5">
          <div className="flex items-center justify-between w-full gap-6 md:gap-10">
            <a
              href="https://intezio.net/"
              className="flex items-center gap-3 shrink-0 no-underline"
            >
              <img
                src="/logo.svg"
                alt=""
                className="h-[13px] md:h-[15px] w-auto"
                aria-hidden="true"
              />
              <h1 className="text-2xl font-light text-white m-0 hidden md:block">Intezio</h1>
            </a>

            <button
              type="button"
              className="lg:hidden flex items-center justify-center w-10 h-10 bg-transparent border-none cursor-pointer text-white -mr-2"
              onClick={() => setIsBurgerOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={isBurgerOpen}
            >
              {isBurgerOpen ? (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              )}
            </button>

            <div className="hidden lg:flex items-center justify-between flex-1">
              <nav className="flex items-center gap-12 text-sm">
                <div className="relative services-dd">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 font-light text-white bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity text-sm"
                    onClick={() => setIsServicesOpen((v) => !v)}
                    aria-expanded={isServicesOpen}
                    aria-haspopup="menu"
                  >
                    {t('services')}
                    <svg
                      className={`w-3.5 h-3.5 opacity-60 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`}
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {isServicesOpen && (
                    <div
                      className="absolute top-[calc(100%+16px)] left-0 bg-black/85 border border-white/25 backdrop-blur-[25px] rounded-[18px] p-4 flex flex-col gap-4 min-w-[260px] z-[1000]"
                      role="menu"
                    >
                      <a
                        href="https://intezio.net/vps"
                        className="flex flex-col items-start gap-1 w-full no-underline text-white/70 hover:text-white transition-colors"
                        role="menuitem"
                      >
                        <span className="text-sm">{t('dd.vps.title')}</span>
                        <span className="text-xs text-white/70">{t('dd.vps.desc')}</span>
                      </a>
                      <div className="h-px bg-white/20 w-full" />
                      <a
                        href="https://t.me/intezio_owner"
                        className="flex flex-col items-start gap-1 w-full no-underline text-white/70 hover:text-white transition-colors"
                        role="menuitem"
                      >
                        <span className="text-sm">{t('dd.dedicated.title')}</span>
                        <span className="text-xs text-white/70">{t('dd.dedicated.desc')}</span>
                      </a>
                    </div>
                  )}
                </div>
                <a
                  href="https://www.trustpilot.com/review/intezio.net"
                  className="font-light text-white no-underline hover:opacity-75 transition-opacity"
                >
                  {t('reviews')}
                </a>
                <a
                  href="https://intezio.net/wiki"
                  className="font-light text-white no-underline hover:opacity-75 transition-opacity"
                >
                  {t('wiki')}
                </a>
              </nav>

              <div className="flex items-center gap-3">
                <a
                  href="https://intezio.net/login"
                  className="font-light text-sm rounded-xl px-5 py-3 no-underline inline-flex items-center gap-2.5 bg-white text-black hover:opacity-80 transition-opacity"
                >
                  {t('login')}
                  <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2 6H10M10 6L6 2M10 6L6 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <a
                  href="https://intezio.net/register"
                  className="font-light text-sm rounded-xl px-5 py-3 no-underline inline-flex items-center bg-transparent text-white border border-white hover:opacity-80 transition-opacity"
                >
                  {t('register')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isBurgerOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black z-[999] top-[calc(46px+56px)] md:top-[calc(60px+64px)] overflow-y-auto"
          onClick={() => setIsBurgerOpen(false)}
        >
          <div className="flex flex-col p-5 gap-1" onClick={(e) => e.stopPropagation()}>
            <a
              href="https://intezio.net/"
              className={burgerLinkClass}
              onClick={() => setIsBurgerOpen(false)}
            >
              {t('home')}
            </a>
            <a
              href="https://intezio.net/vps"
              className={burgerLinkClass}
              onClick={() => setIsBurgerOpen(false)}
            >
              {t('dd.vps.title')}
            </a>
            <a
              href="https://t.me/intezio_owner"
              className={burgerLinkClass}
              onClick={() => setIsBurgerOpen(false)}
            >
              {t('dd.dedicated.title')}
            </a>
            <a
              href="https://www.trustpilot.com/review/intezio.net"
              className={burgerLinkClass}
              onClick={() => setIsBurgerOpen(false)}
            >
              {t('reviews')}
            </a>
            <a
              href="https://intezio.net/wiki"
              className={burgerLinkClass}
              onClick={() => setIsBurgerOpen(false)}
            >
              {t('wiki')}
            </a>
            <div className="border-t border-white/10 my-2" />
            <a
              href="https://intezio.net/login"
              className={burgerLinkClass}
              onClick={() => setIsBurgerOpen(false)}
            >
              {t('login')}
            </a>
            <a
              href="https://intezio.net/register"
              className={burgerLinkClass}
              onClick={() => setIsBurgerOpen(false)}
            >
              {t('register')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
