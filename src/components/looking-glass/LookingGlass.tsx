import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyCommand } from '@/src/components/ui/CopyCommand';
import { useLocale } from '@/src/i18n/useLocale';
import { useTranslations } from '@/src/i18n/useTranslations';
import type { NodeId } from '@/src/lib/nodes';
import { commands, iperf3Hosts, servers, testfileHosts } from '@/src/lib/nodes';
import Footer from '../layout/Footer';
import Navbar from '../layout/Navbar';

const LookingGlass = () => {
  const t = useTranslations('lookingGlass');
  const locale = useLocale();
  const [selectedNode, setSelectedNode] = useState<NodeId>('de');
  const [command, setCommand] = useState('ping');
  const [target, setTarget] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [clientIp, setClientIp] = useState('');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [ping, setPing] = useState<Record<string, string>>({});
  const [isPingLoading, setIsPingLoading] = useState(true);
  const [screenReaderStatus, setScreenReaderStatus] = useState('');
  const outputRef = useRef<HTMLPreElement>(null);

  const measurePing = useCallback(async () => {
    setIsPingLoading(true);
    const results: Record<string, string> = {};
    await Promise.all(
      servers.map(async (s) => {
        try {
          await fetch(s.pingUrl, { method: 'HEAD', cache: 'no-store' });
          const samples: number[] = [];
          for (let i = 0; i < 4; i++) {
            const t0 = performance.now();
            await fetch(s.pingUrl, { method: 'HEAD', cache: 'no-store' });
            samples.push(performance.now() - t0);
          }
          const min = Math.round(Math.min(...samples));
          results[s.value] = `~${min} ms`;
        } catch {
          results[s.value] = 'N/A';
        }
      })
    );
    setPing(results);
    setIsPingLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/client-ip')
      .then((res) => res.json())
      .then((data) => setClientIp(data.ip || ''))
      .catch(() => {});
    measurePing();
    const interval = setInterval(measurePing, 120000);
    return () => clearInterval(interval);
  }, [measurePing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const el = event.target as HTMLElement;
      if (!el.closest('.custom-select-container')) {
        setIsCommandOpen(false);
      }
    };
    if (isCommandOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isCommandOpen]);

  useEffect(() => {
    if (isStreaming && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [isStreaming]);

  const handleExecute = async () => {
    if (!target.trim()) {
      setLines([t('validationTargetRequired')]);
      setHasResult(true);
      setScreenReaderStatus(t('screenReaderDone'));
      return;
    }

    setIsStreaming(true);
    setHasResult(true);
    setLines([]);
    setScreenReaderStatus(t('screenReaderBusy'));

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, target, node: selectedNode }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({ error: t('unknownError') }));
        const msg =
          response.status === 429
            ? t('errorTooManyRequests') || 'Слишком много запросов, попробуйте позже'
            : data.error || response.statusText;
        setLines([`${t('errorPrefix')}: ${msg}`]);
        setScreenReaderStatus(t('screenReaderDone'));
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const chunk of parts) {
          const eventMatch = chunk.match(/^event:\s*(\S+)/m);
          const dataMatch = chunk.match(/^data:\s*(.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          const data = dataMatch[1];

          if (eventType === 'output') {
            setLines((prev) => [...prev, data]);
          } else if (eventType === 'done') {
            try {
              const payload = JSON.parse(data);
              if (payload.exit_code !== 0 && payload.error) {
                setLines((prev) => [
                  ...prev,
                  `\n${t('errorExitCode')} ${payload.exit_code}: ${payload.error}`,
                ]);
              }
            } catch {}
            setScreenReaderStatus(t('screenReaderDone'));
            setIsStreaming(false);
          }
        }
      }
    } catch (err) {
      setLines([`${t('errorPrefix')}: ${err instanceof Error ? err.message : t('unknownError')}`]);
      setScreenReaderStatus(t('screenReaderDone'));
    } finally {
      setIsStreaming(false);
    }
  };

  const selectedServerLabel = t(
    servers.find((s) => s.value === selectedNode)?.labelKey ?? 'germany'
  );

  return (
    <div className="min-h-screen bg-black">
      <AnimatePresence>
        {locale === 'kk' && (
          <motion.div
            key="horse"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="fixed bottom-0 right-0 pointer-events-none z-0 select-none"
            aria-hidden="true"
          >
            <img
              src="/horse.jpg"
              alt=""
              style={{ width: '40vw', opacity: 0.12, display: 'block' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Navbar />

      <main className="w-full max-w-[1440px] mx-auto px-5 md:px-8 pt-[150px] md:pt-[150px] pb-8 md:pb-16">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {screenReaderStatus}
        </div>

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-12 w-full bg-[#0a0a0a] px-5 md:px-[60px] py-6 md:py-0 md:h-[360px] rounded-[20px] md:rounded-[32px] border border-white/10 overflow-hidden mb-5">
          <div className="flex flex-col gap-5 md:gap-9 w-full md:w-auto z-10">
            <div className="flex flex-col gap-2">
              <h1 className="text-[22px] md:text-[32px] font-normal text-white tracking-[-0.44px] md:tracking-[-0.64px] leading-tight m-0">
                {t('title')}
              </h1>
              <span className="text-[14px] md:text-[20px] opacity-50 font-light text-white tracking-[-0.28px] md:tracking-[-0.4px] leading-relaxed">
                {t('subtitle')}
              </span>
            </div>
            <a
              href="https://intezio.net/"
              className="inline-flex items-center justify-center text-sm md:text-base font-light rounded-[16px] transition-opacity outline-none w-full md:w-fit cursor-pointer bg-white text-black hover:opacity-80 active:opacity-40 px-5 md:px-[24px] py-3 md:py-[16px]"
            >
              <span className="inline-flex items-center gap-3">{t('backToHome')}</span>
            </a>
          </div>
          <div className="absolute left-[736px] top-[-110.5px] w-[1077px] h-[581px] hidden lg:flex items-center justify-center pointer-events-none">
            <img
              src="/assets/land/hero.svg"
              alt=""
              className="w-full h-full object-contain object-center"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-3 md:gap-x-10 md:gap-y-4 mb-5">
          {servers.map((s) => (
            <button
              type="button"
              key={s.value}
              className={`flex relative flex-col transition-all duration-300 cursor-pointer before:block before:w-full before:h-[2px] before:bottom-0 before:absolute before:bg-white before:transition-opacity before:duration-300 ${
                selectedNode === s.value
                  ? 'opacity-100 before:opacity-100'
                  : 'opacity-50 hover:opacity-100 before:opacity-0 hover:before:opacity-100'
              }`}
              onClick={() => setSelectedNode(s.value)}
            >
              <div className="flex flex-row items-center gap-1.5 pb-2 whitespace-nowrap">
                <img src={s.flagImg} alt="" className="w-5 h-5 object-cover" aria-hidden="true" />
                <span className="text-xs md:text-base font-normal text-white">{t(s.labelKey)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_550px] gap-5">
          <div className="flex flex-col gap-5">
            <div className="bg-[#0a0a0a] rounded-[20px] md:rounded-[32px] border border-white/10 p-5 md:p-10">
              <h2 className="text-lg md:text-xl font-normal text-white tracking-[-0.4px] mb-5 md:mb-8">
                {t('quickChecks')}
              </h2>
              <div className="flex flex-col gap-4 md:gap-5">
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="command-select" className="text-sm font-light text-white/75">
                    {t('commandLabel')}
                  </label>
                  <div className="relative custom-select-container">
                    <button
                      id="command-select"
                      type="button"
                      className="w-full px-4 py-3 md:py-4 bg-[#171717] rounded-xl border border-[#27272a] text-sm font-light text-white cursor-pointer flex justify-between items-center transition-all duration-200 hover:border-white/20"
                      onClick={() => setIsCommandOpen(!isCommandOpen)}
                      aria-expanded={isCommandOpen}
                      aria-haspopup="listbox"
                    >
                      <span>{commands.find((c) => c.value === command)?.label}</span>
                      <svg
                        className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isCommandOpen ? 'rotate-180' : ''}`}
                        width="14"
                        height="14"
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
                    {isCommandOpen && (
                      <div
                        className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0a0a0a] border border-[#27272a] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-[100]"
                        role="listbox"
                      >
                        {commands.map((cmd) => (
                          <button
                            key={cmd.value}
                            type="button"
                            className={`w-full px-4 py-3 md:py-4 bg-[#0a0a0a] border-none text-sm font-light text-left cursor-pointer transition-all duration-200 border-b border-white/5 last:border-b-0 hover:bg-[#171717] hover:text-white ${command === cmd.value ? 'text-white font-normal' : 'text-white/75'}`}
                            onClick={() => {
                              setCommand(cmd.value);
                              setIsCommandOpen(false);
                            }}
                          >
                            {cmd.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="target-input" className="text-sm font-light text-white/75">
                    {t('targetLabel')}
                  </label>
                  <input
                    id="target-input"
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isStreaming && handleExecute()}
                    placeholder="1.1.1.1"
                    dir="ltr"
                    className="px-4 py-3 md:py-4 bg-[#171717] rounded-xl border border-[#27272a] text-sm font-normal text-white transition-all duration-200 focus:outline-none focus:border-white/30 placeholder:text-white/50"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['1.1.1.1', '8.8.8.8', 'google.com'].map((ip) => (
                      <button
                        key={ip}
                        type="button"
                        onClick={() => setTarget(ip)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-xs font-light text-white/75 hover:text-white transition-all duration-200"
                        dir="ltr"
                      >
                        {ip}
                      </button>
                    ))}
                    {clientIp && (
                      <button
                        type="button"
                        onClick={() => setTarget(clientIp)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-xs font-light text-white/75 hover:text-white transition-all duration-200"
                      >
                        {t('yourIp')}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isStreaming}
                  className="px-5 md:px-6 py-3 bg-white rounded-xl border-none text-sm font-normal text-black cursor-pointer transition-all duration-200 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {isStreaming ? t('streaming') : t('execute')}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {hasResult && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="bg-[#0a0a0a] rounded-[20px] md:rounded-[32px] border border-white/10 p-5 md:p-10 flex flex-col gap-5 md:gap-8"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <h2 className="text-lg md:text-xl font-normal text-white tracking-[-0.4px] m-0">
                      {t('results')}
                    </h2>
                    <span className="text-xs md:text-sm font-normal text-white/30">
                      {selectedServerLabel}
                      {isStreaming && (
                        <span className="ml-2 animate-pulse" aria-hidden="true">
                          ●
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-px bg-white/10" />
                  <div
                    className="px-3 md:px-4 py-2 md:py-3 bg-white/5 rounded-2xl flex gap-2 overflow-x-auto"
                    dir="ltr"
                  >
                    <span
                      className="font-mono text-xs md:text-sm font-normal text-teal-400"
                      aria-hidden="true"
                    >
                      $
                    </span>
                    <span className="font-mono text-xs md:text-sm font-normal text-white whitespace-nowrap">
                      {command} {target}
                    </span>
                  </div>
                  <div className="px-3 md:px-4 py-4 md:py-5 bg-black/5 rounded-2xl border border-white/10 overflow-hidden">
                    <pre
                      ref={outputRef}
                      className="font-mono text-[10px] md:text-xs font-normal text-white whitespace-pre-wrap break-words m-0 leading-relaxed max-h-[400px] overflow-y-auto"
                      dir="ltr"
                      aria-live="off"
                      aria-busy={isStreaming}
                    >
                      {lines.join('\n')}
                      {isStreaming && (
                        <span className="animate-pulse" aria-hidden="true">
                          ▋
                        </span>
                      )}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-5 lg:sticky lg:top-[160px] lg:self-start">
            <div className="bg-[#0a0a0a] rounded-[20px] md:rounded-[32px] border border-white/10 p-5 md:p-10 flex flex-col gap-4 md:gap-6">
              <h2 className="text-lg md:text-xl font-normal text-white tracking-[-0.4px]">
                {t('summaryInfo')}
              </h2>
              <div className="flex justify-between items-center gap-3">
                <span className="text-sm md:text-base font-normal text-white">
                  {t('datacenter')}
                </span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={selectedNode}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm md:text-base font-normal text-white/50 text-right"
                  >
                    {selectedNode === 'de'
                      ? t('datacenterValueDe')
                      : selectedNode === 'pl'
                        ? t('datacenterValuePl')
                        : selectedNode === 'nl'
                          ? t('datacenterValueNl')
                          : t('datacenterValueEe')}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-sm md:text-base font-normal text-white">{t('testIp')}</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={selectedNode}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs md:text-sm font-normal text-white/50 text-right font-mono"
                    dir="ltr"
                  >
                    {servers.find((s) => s.value === selectedNode)?.ip}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-sm md:text-base font-normal text-white">{t('yourIp')}</span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-xs md:text-sm font-normal text-white/50 text-right font-mono break-all"
                  dir="ltr"
                >
                  {clientIp}
                </motion.span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-sm md:text-base font-normal text-white">{t('ping')}</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${selectedNode}-${ping[selectedNode]}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm md:text-base font-normal text-white/50 text-right"
                    dir="ltr"
                  >
                    {isPingLoading ? '...' : ping[selectedNode] || t('pingValue')}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="p-3 md:p-4 bg-[#171717] rounded-xl text-xs md:text-sm font-normal text-white/70 leading-relaxed">
                {t('supportText')}
                <br />
                <a
                  href="https://t.me/inteziosupp_bot"
                  className="underline text-white/70 hover:text-white transition-colors"
                >
                  {t('supportLink')}
                </a>
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-[20px] md:rounded-[32px] border border-white/10 p-5 md:p-10">
              <h2 className="text-lg md:text-xl font-normal text-white tracking-[-0.4px] mb-4 md:mb-6">
                iperf3
              </h2>
              <div className="flex flex-col gap-3">
                {[
                  `iperf3 -c ${iperf3Hosts[selectedNode] ?? iperf3Hosts.de} -p 5201 -P 8`,
                  `iperf3 -c ${iperf3Hosts[selectedNode] ?? iperf3Hosts.de} -p 5201 -P 8 -R`,
                ].map((cmd) => (
                  <CopyCommand key={cmd} command={cmd} />
                ))}
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-[20px] md:rounded-[32px] border border-white/10 p-5 md:p-10">
              <h2 className="text-lg md:text-xl font-normal text-white tracking-[-0.4px] mb-4 md:mb-6">
                {t('testFiles')}
              </h2>
              <div className="flex flex-col gap-4 md:gap-6">
                {[
                  ['100MB', '100'],
                  ['1GB', '1000'],
                  ['10GB', '10000'],
                ].map(([label, size]) => (
                  <div key={size} className="flex justify-between items-center gap-3">
                    <span className="text-sm md:text-base font-normal text-white flex-shrink-0">
                      {label}
                    </span>
                    <a
                      href={`${testfileHosts[selectedNode] ?? testfileHosts.de}/testfile?size=${size}`}
                      className="text-[11px] md:text-sm font-light text-white/50 text-right hover:text-white/75 transition-colors duration-200 no-underline break-all"
                      dir="ltr"
                    >
                      {testfileHosts[selectedNode] ?? testfileHosts.de}/{label}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LookingGlass;
