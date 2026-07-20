import { useState } from 'react';

export const CopyCommand = ({ command }: { command: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="px-3 md:px-4 py-3 bg-white/5 rounded-2xl flex items-center gap-2 overflow-x-auto"
      dir="ltr"
    >
      <span className="font-mono text-xs md:text-sm font-normal text-teal-400" aria-hidden="true">
        $
      </span>
      <span className="font-mono text-xs md:text-sm font-normal text-white whitespace-nowrap flex-1 select-all">
        {command}
      </span>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 ml-1 text-white/30 hover:text-white/70 transition-colors"
        aria-label="Copy command"
      >
        {copied ? (
          <svg
            className="w-3.5 h-3.5 text-teal-400"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8l3.5 3.5L13 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect
              x="5"
              y="5"
              width="8"
              height="8"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M3 11V3h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
};
