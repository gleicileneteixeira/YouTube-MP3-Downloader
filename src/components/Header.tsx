import React from 'react';
import { Music, Headphones, History, HelpCircle, Layers, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  historyCount: number;
  activeTab: 'single' | 'batch' | 'history' | 'faq';
  setActiveTab: (tab: 'single' | 'batch' | 'history' | 'faq') => void;
}

export const Header: React.FC<HeaderProps> = ({ historyCount, activeTab, setActiveTab }) => {
  return (
    <header className="w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div 
          onClick={() => setActiveTab('single')}
          className="flex items-center gap-3 cursor-pointer group select-none"
          id="brand-logo-btn"
        >
          <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 p-[1px] shadow-lg shadow-rose-950/30">
            <div className="w-full h-full bg-neutral-950 rounded-[11px] flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
              <Music className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                YouTube <span className="text-rose-500 font-extrabold">MP3</span>
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-neutral-800/90 text-neutral-300 border border-neutral-700/60">
                PRO 320k
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Baixe áudios em alta fidelidade rapidamente
            </p>
          </div>
        </div>

        {/* Navigation / Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Conversor Tab */}
          <button
            id="tab-single-btn"
            onClick={() => setActiveTab('single')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'single'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span className="hidden xs:inline">Conversor</span>
          </button>

          {/* Modo Lote */}
          <button
            id="tab-batch-btn"
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'batch'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Em Lote</span>
          </button>

          {/* Histórico */}
          <button
            id="tab-history-btn"
            onClick={() => setActiveTab('history')}
            className={`relative px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-rose-500 text-white">
                {historyCount}
              </span>
            )}
          </button>

          {/* FAQ */}
          <button
            id="tab-faq-btn"
            onClick={() => setActiveTab('faq')}
            className={`p-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center ${
              activeTab === 'faq'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
            title="Dicas e Perguntas Frequentes"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
