import { useEffect, useState } from 'react';
import { useTranslations } from '@/src/i18n/useTranslations';
import { toBraille } from '@/src/utils/braille';
import { useBrailleMode } from '@/src/utils/useBrailleMode';

const Footer = () => {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();
  const [isBrailleMode, setIsBrailleMode] = useState(false);

  useBrailleMode(isBrailleMode);

  useEffect(() => {
    const saved = localStorage.getItem('brailleMode') ?? localStorage.getItem('blindMode');
    if (saved === 'true') setIsBrailleMode(true);
  }, []);

  const toggleBrailleMode = () => {
    const next = !isBrailleMode;
    setIsBrailleMode(next);
    localStorage.setItem('brailleMode', String(next));
    localStorage.setItem('blindMode', String(next));
  };

  const brailleToggleText = isBrailleMode ? toBraille('Braille On') : toBraille('Braille Off');

  const sections = [
    {
      title: t('nav.home'),
      links: [
        { label: t('nav.main'), href: 'https://intezio.net/' },
        { label: t('nav.aboutDC'), href: 'https://intezio.net/datacenters' },
        { label: t('nav.knowledgeBase'), href: 'https://wiki.intezio.net' },
      ],
    },
    {
      title: t('nav.services'),
      links: [
        { label: 'VPS', href: 'https://intezio.net/vps' },
        { label: t('nav.dedicatedServers'), href: 'https://t.me/intezio_owner' },
      ],
    },
    {
      title: t('nav.contacts'),
      links: [
        { label: t('nav.telegramChannel'), href: 'https://t.me/intezio/' },
        { label: t('nav.supportTelegram'), href: 'https://t.me/inteziosupp_bot' },
        { label: t('nav.weOnLolz'), href: '#' },
      ],
    },
    {
      title: t('nav.documents'),
      links: [
        { label: t('nav.privacyPolicy'), href: 'https://intezio.net/privacy' },
        { label: t('nav.terms'), href: 'https://intezio.net/terms' },
        { label: t('nav.fairUse'), href: 'https://intezio.net/service-terms' },
      ],
    },
  ];

  return (
    <footer className="w-full bg-black px-5 md:px-10 mt-16">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-5">
        <div className="py-8 border-t border-b border-white/10 flex flex-col md:flex-row justify-between items-start gap-8 md:gap-0">
          <div className="flex flex-col gap-8 md:gap-10 w-full md:w-80">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Intezio" className="w-5 h-5" />
              <span className="text-white text-lg font-light tracking-[0.5px]">Intezio</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-white text-sm font-medium tracking-[-0.28px]">
                {t('company.1')}
              </div>
              <div className="text-white/75 text-sm font-light tracking-[-0.28px]">
                {t('company.2')}
              </div>
              <div className="text-white/75 text-sm font-light tracking-[-0.28px]">
                {t('company.3')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex md:flex-row gap-8 md:gap-12 w-full md:w-auto">
            {sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-3">
                <div className="text-white text-sm font-normal tracking-[-0.28px] underline">
                  {section.title}
                </div>
                {section.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-white text-sm font-light tracking-[-0.28px] opacity-50 no-underline transition-opacity duration-200 hover:opacity-75"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-8">
          <div className="text-white/40 text-sm font-light tracking-[-0.28px]">
            {t('company.copy', { year: currentYear })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleBrailleMode}
              className={`text-xs font-light px-3 py-1.5 rounded-lg border transition-all cursor-pointer bg-transparent ${isBrailleMode ? 'border-white/40 text-white/60' : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'}`}
              title={t('accessibilityModeTitle')}
              aria-label={isBrailleMode ? 'Braille mode on' : 'Braille mode off'}
              aria-pressed={isBrailleMode}
            >
              {brailleToggleText}
            </button>
            <div className="flex flex-wrap gap-1">
              <span className="text-white/40 text-sm font-light">{t('developedBy')} </span>
              <a
                href="https://github.com/xdearboy"
                className="text-white/60 text-sm font-light hover:text-white/80 transition-opacity"
              >
                @xdearboy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
