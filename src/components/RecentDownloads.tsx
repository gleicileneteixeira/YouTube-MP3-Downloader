import React from 'react';
import { History, Play, Download, Trash2, ArrowRight } from 'lucide-react';
import { DownloadHistoryItem } from '../types';
import { triggerBrowserDownload } from '../utils/downloadHelper';

interface RecentDownloadsProps {
  history: DownloadHistoryItem[];
  onPlay: (url: string, title: string, artist: string, thumbnail: string) => void;
  onRemove: (id: string) => void;
  onViewAll: () => void;
  onSelectVideo: (videoId: string) => void;
}

export const RecentDownloads: React.FC<RecentDownloadsProps> = ({
  history,
  onPlay,
  onRemove,
  onViewAll,
  onSelectVideo,
}) => {
  if (history.length === 0) return null;

  const recentItems = history.slice(0, 3);

  return (
    <div 
      id="recent-downloads-section"
      className="w-full max-w-4xl mx-auto space-y-3 pt-6 animate-in fade-in"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-bold text-neutral-200">
            Downloads Recentes ({history.length})
          </h3>
        </div>

        <button
          id="view-all-history-link"
          type="button"
          onClick={onViewAll}
          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
        >
          <span>Ver todo o histórico</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {recentItems.map((item) => (
          <div
            key={item.id}
            id={`recent-item-${item.id}`}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700/80 transition-all group"
          >
            <div 
              className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800 relative cursor-pointer"
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
                className="text-xs font-semibold text-white truncate cursor-pointer hover:text-rose-400 transition-colors"
                title={item.title}
              >
                {item.title}
              </h4>
              <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-rose-400 uppercase font-semibold">
                  {item.format}
                </span>
                <span>•</span>
                <span className="truncate">{item.artist}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onPlay(item.downloadUrl, item.title, item.artist, item.thumbnailUrl)}
                className="p-1.5 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
                title="Ouvir no player"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>

              <a
                href={item.downloadUrl}
                download={`${item.artist} - ${item.title}.${item.format}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  try {
                    triggerBrowserDownload(item.downloadUrl, `${item.artist} - ${item.title}.${item.format}`);
                  } catch {}
                }}
                className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md transition-colors cursor-pointer"
                title="Baixar para o aparelho"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
