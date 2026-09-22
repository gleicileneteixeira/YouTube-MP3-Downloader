import React, { useState } from 'react';
import { Search, Clipboard, X, Loader2, Sparkles, Youtube, ArrowRight } from 'lucide-react';

interface UrlInputFormProps {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

const SAMPLE_LINKS = [
  { label: 'Me at the zoo (1º vídeo do YouTube)', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
  { label: 'Sinfonia Clássica (Beethoven / Mozart)', url: 'https://www.youtube.com/watch?v=4Tr0otuiQuU' },
  { label: 'Lo-Fi Chill & Relax Instrumental', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
];

export const UrlInputForm: React.FC<UrlInputFormProps> = ({
  url,
  setUrl,
  onSubmit,
  isLoading,
  errorMessage,
}) => {
  const [pasteFeedback, setPasteFeedback] = useState(false);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text.trim());
          setPasteFeedback(true);
          setTimeout(() => setPasteFeedback(false), 1500);
        }
      }
    } catch {
      // Clipboard permission denied or unsupported
    }
  };

  const handleClear = () => {
    setUrl('');
  };

  const handleSampleClick = (sampleUrl: string) => {
    setUrl(sampleUrl);
  };

  const isValidYoutube = (val: string) => {
    if (!val) return false;
    return /(?:youtube\.com\/(?:watch\?.*v=|shorts\/)|youtu\.be\/)/i.test(val) || val.length === 11;
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={onSubmit} className="relative group">
        <div className="relative flex items-center bg-neutral-900/90 rounded-2xl border border-neutral-700/80 shadow-2xl shadow-black/60 focus-within:border-rose-500/80 focus-within:ring-4 focus-within:ring-rose-500/10 transition-all p-1.5 sm:p-2">
          {/* Leading Icon */}
          <div className="pl-3 pr-2 text-neutral-400 group-focus-within:text-rose-400 transition-colors flex items-center">
            <Youtube className="w-6 h-6 text-red-500" />
          </div>

          {/* Main Input */}
          <input
            id="youtube-url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cole o link do YouTube aqui (ex: https://youtu.be/...)"
            className="w-full bg-transparent text-sm sm:text-base text-neutral-100 placeholder-neutral-500 px-2 py-3 focus:outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Clear Button */}
          {url.length > 0 && (
            <button
              id="clear-url-btn"
              type="button"
              onClick={handleClear}
              className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors mr-1"
              title="Limpar campo"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Paste Button */}
          <button
            id="paste-url-btn"
            type="button"
            onClick={handlePaste}
            className="hidden sm:flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800/80 hover:bg-neutral-700/80 px-2.5 py-2 rounded-lg border border-neutral-700/60 transition-colors mr-2 select-none"
            title="Colar da área de transferência"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>{pasteFeedback ? 'Colado!' : 'Colar'}</span>
          </button>

          {/* Submit Button */}
          <button
            id="submit-url-btn"
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm sm:text-base px-4 sm:px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-950/40 select-none whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando...</span>
              </>
            ) : (
              <>
                <span>Obter Áudio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Message Display */}
      {errorMessage && (
        <div 
          id="url-error-banner"
          className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Example Links */}
      <div className="mt-4 flex flex-wrap items-center gap-2 justify-center text-xs text-neutral-400">
        <span className="flex items-center gap-1 text-neutral-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Testar exemplo rápido:
        </span>
        {SAMPLE_LINKS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSampleClick(sample.url)}
            className="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-all text-[11px] truncate max-w-[200px] sm:max-w-xs"
            title={sample.url}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
};
