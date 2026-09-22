import React, { useState } from 'react';
import { Play, ExternalLink, Download, Sparkles, CheckCircle2, Music } from 'lucide-react';
import { VideoMetadata, ConversionSettings } from '../types';
import { AudioSettingsPanel } from './AudioSettingsPanel';

interface VideoCardProps {
  metadata: VideoMetadata;
  settings: ConversionSettings;
  setSettings: React.Dispatch<React.SetStateAction<ConversionSettings>>;
  onConvert: () => void;
  isConverting: boolean;
  onPlayPreview?: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  metadata,
  settings,
  setSettings,
  onConvert,
  isConverting,
  onPlayPreview,
}) => {
  const [thumbError, setThumbError] = useState(false);

  return (
    <div 
      id={`video-card-${metadata.id}`}
      className="w-full bg-neutral-900/80 rounded-2xl border border-neutral-800/90 shadow-xl shadow-black/50 overflow-hidden"
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Top Info Banner */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
          {/* Thumbnail Container */}
          <div className="relative group w-full md:w-64 sm:h-40 h-48 bg-neutral-950 rounded-xl overflow-hidden shrink-0 border border-neutral-800">
            <img
              src={thumbError ? metadata.thumbnailUrl : metadata.hqThumbnailUrl}
              alt={metadata.title}
              onError={() => setThumbError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            
            {/* Play Preview Button */}
            {onPlayPreview && (
              <button
                type="button"
                onClick={onPlayPreview}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-black/60 opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all select-none"
                title="Tocar prévia do áudio"
              >
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </button>
            )}

            {/* Badge Format */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-bold tracking-wider uppercase border border-neutral-700/80 flex items-center gap-1">
              <Music className="w-3 h-3 text-rose-400" />
              {settings.format.toUpperCase()} • {settings.bitrate}
            </div>
          </div>

          {/* Details & Author */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2">
                {metadata.title}
              </h2>
              <a
                href={metadata.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg shrink-0 transition-colors"
                title="Abrir vídeo no YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400">
              <span className="font-medium text-neutral-300 flex items-center gap-1">
                {metadata.author}
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20 inline" />
              </span>
            </div>

            <p className="text-xs text-neutral-500 line-clamp-1 pt-1 font-mono">
              ID do vídeo: {metadata.id}
            </p>

            {/* Quick feature summary pills */}
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-neutral-300">
              <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 border border-neutral-700/60 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Sem perda de qualidade
              </span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 border border-neutral-700/60">
                Canais Estéreo 44.1kHz
              </span>
            </div>
          </div>
        </div>

        {/* Audio Quality & Format Settings */}
        <AudioSettingsPanel
          settings={settings}
          setSettings={setSettings}
          defaultTitle={metadata.title}
          defaultAuthor={metadata.author}
        />

        {/* Primary Action Button */}
        <div className="pt-2">
          <button
            id="start-conversion-btn"
            type="button"
            onClick={onConvert}
            disabled={isConverting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.99] text-white font-bold text-base sm:text-lg py-4 px-6 rounded-xl shadow-xl shadow-rose-950/40 border border-rose-500/30 transition-all select-none disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="w-5 h-5" />
            <span>
              {isConverting
                ? 'Convertendo para ' + settings.format.toUpperCase() + '...'
                : `Converter e Baixar ${settings.format.toUpperCase()} (${settings.bitrate})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
