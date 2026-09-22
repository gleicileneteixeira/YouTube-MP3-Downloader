import React from 'react';
import { History, Download, Play, Trash2, Music, ExternalLink, Calendar } from 'lucide-react';
import { DownloadHistoryItem } from '../types';
import { triggerBrowserDownload } from '../utils/downloadHelper';

interface DownloadHistoryProps {
  history: DownloadHistoryItem[];
  onPlay: (url: string, title: string, artist: string, thumbnail: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelectVideo: (videoId: string) => void;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({
  history,
  onPlay,
  onRemove,
  onClear,
  onSelectVideo,
}) => {
  if (history.length === 0) {
    return (
      <div 
        id="history-empty-state"
        className="w-full max-w-3xl mx-auto py-16 px-4 text-center space-y-4 bg-neutral-900/40 rounded-2xl border border-neutral-800"
      >
        <div className="w-14 h-14 rounded-2xl bg-neutral-800/80 text-neutral-400 flex items-center justify-center mx-auto">
          <History className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-white">
            Nenhum download recente
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            Os áudios que você converter e baixar serão salvos aqui localmente para acesso rápido a qualquer momento.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-white">
            Histórico de Downloads
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
            {history.length} {history.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        <button
          id="clear-all-history-btn"
          type="button"
          onClick={onClear}
          className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-neutral-900"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpar Tudo</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {history.map((item) => (
          <div
            key={item.id}
            id={`history-item-${item.id}`}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700/80 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div 
                className="w-12 h-12 rounded-lg bg-neutral-950 overflow-hidden shrink-0 border border-neutral-800 relative cursor-pointer"
                onClick={() => onSelectVideo(item.videoId)}
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h4 
                  onClick={() => onSelectVideo(item.videoId)}
                  className="text-xs sm:text-sm font-semibold text-white truncate cursor-pointer hover:text-rose-400 transition-colors"
                >
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                  <span className="truncate">{item.artist}</span>
                  <span>•</span>
                  <span className="font-mono text-rose-400 font-medium uppercase">
                    {item.format} ({item.bitrate})
                  </span>
                  <span>•</span>
                  <span className="text-neutral-500 hidden sm:inline">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {/* Play preview */}
              <button
                type="button"
                onClick={() => onPlay(item.downloadUrl, item.title, item.artist, item.thumbnailUrl)}
                className="p-2 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs transition-colors"
                title="Ouvir áudio"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>

              {/* Download file */}
              <a
                href={item.downloadUrl}
                download={`${item.artist} - ${item.title}.${item.format}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  // Ensure device download triggers reliably
                  try {
                    triggerBrowserDownload(item.downloadUrl, `${item.artist} - ${item.title}.${item.format}`);
                  } catch {}
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                title="Baixar arquivo novamente para o aparelho"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar</span>
              </a>

              {/* Delete item */}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg text-xs transition-colors"
                title="Remover do histórico"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
