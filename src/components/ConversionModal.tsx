import React, { useState, useEffect } from 'react';
import { 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Check, 
  RefreshCw, 
  Music,
  ExternalLink,
  Volume2,
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';
import { ConversionJob } from '../types';
import { triggerBrowserDownload } from '../utils/downloadHelper';

interface ConversionModalProps {
  job: ConversionJob | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onPlayPreview: (streamUrl: string, title: string, artist: string, thumbnail: string) => void;
  onGoToHistory?: () => void;
}

export const ConversionModal: React.FC<ConversionModalProps> = ({
  job,
  isOpen,
  onClose,
  onRetry,
  onPlayPreview,
  onGoToHistory,
}) => {
  const [copied, setCopied] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  useEffect(() => {
    if (job?.status === 'ready') {
      setAutoDownloaded(true);
    } else {
      setAutoDownloaded(false);
    }
  }, [job?.status]);

  if (!isOpen || !job) return null;

  const isReady = job.status === 'ready';
  const isError = job.status === 'error';
  const isProcessing = job.status === 'converting' || job.status === 'analyzing' || job.status === 'processing';

  const downloadUrl = job.downloadUrl || '';
  const directCdnUrl = job.streamUrl || downloadUrl;

  const handleCopyLink = () => {
    if (downloadUrl) {
      navigator.clipboard.writeText(window.location.origin + downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      id="conversion-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div 
        id="conversion-modal-container"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 relative overflow-hidden"
      >
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Title & Thumbnail */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800 relative">
            <img
              src={job.thumbnailUrl}
              alt={job.videoTitle}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Music className="w-6 h-6 text-white/80" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-rose-400 font-semibold mb-1">
              {job.format.toUpperCase()} • {job.bitrate}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug">
              {job.videoTitle}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {job.author}
            </p>
          </div>
        </div>

        {/* Status Body (Converting / Processing) */}
        {isProcessing && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-neutral-300 font-medium flex items-center gap-2 truncate pr-2">
                <Loader2 className="w-4 h-4 text-rose-500 animate-spin shrink-0" />
                <span className="truncate">{job.stageText || 'Extraindo e codificando áudio...'}</span>
              </span>
              <span className="font-mono text-rose-400 font-bold shrink-0 flex items-center gap-1.5">
                {job.elapsedSeconds !== undefined && job.elapsedSeconds > 0 && (
                  <span className="text-[11px] font-normal text-neutral-500 flex items-center gap-0.5">
                    <Clock className="w-3 h-3 inline" />
                    {job.elapsedSeconds}s
                  </span>
                )}
                <span>•</span>
                <span>{job.progress}%</span>
              </span>
            </div>

            {/* Progress Track */}
            <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-700/60">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${Math.max(8, job.progress)}%` }}
              />
            </div>

            {/* Stage Indicators */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] text-center">
              <div className={`p-1.5 rounded-lg border transition-colors ${
                job.progress >= 25 ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-medium' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
              }`}>
                1. Stream
              </div>
              <div className={`p-1.5 rounded-lg border transition-colors ${
                job.progress >= 55 ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-medium' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
              }`}>
                2. Codificação {job.bitrate}
              </div>
              <div className={`p-1.5 rounded-lg border transition-colors ${
                job.progress >= 85 ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-medium' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
              }`}>
                3. Download
              </div>
            </div>

            <p className="text-center text-xs text-neutral-400 flex items-center justify-center gap-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {job.elapsedSeconds && job.elapsedSeconds > 15
                  ? 'Vídeos musicais de alta qualidade levam cerca de 15 a 25 segundos para finalizar...'
                  : `Codificando áudio ${job.format.toUpperCase()} (${job.bitrate}) com fidelidade máxima...`}
              </span>
            </p>
          </div>
        )}

        {/* Ready State */}
        {isReady && (
          <div className="space-y-5 py-2 animate-in fade-in">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-xs sm:text-sm">
                <div className="font-bold text-emerald-300">
                  Conversão concluída com sucesso!
                </div>
                <div className="text-emerald-400/80 text-xs mt-0.5">
                  Arquivo pronto em {job.format.toUpperCase()} ({job.bitrate})
                </div>
              </div>
            </div>

            {/* Automatic Download Notification Banner */}
            <div className="p-3.5 rounded-xl bg-neutral-800/90 border border-neutral-700/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>O download foi disparado para a pasta <strong>Downloads</strong> do seu aparelho!</span>
              </div>
              {onGoToHistory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToHistory();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold shrink-0 border border-rose-500/40 transition-colors"
                >
                  Ver no Histórico
                </button>
              )}
            </div>

            {/* Download Buttons */}
            <div className="space-y-2.5">
              {/* Primary Download Anchor (Native browser download, never blocked) */}
              <a
                id="download-final-btn"
                href={downloadUrl}
                download={job.filename}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  try {
                    triggerBrowserDownload(downloadUrl, job.filename);
                  } catch {}
                }}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.99] select-none text-center cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Salvar {job.filename} no Aparelho</span>
              </a>

              {/* Secondary Direct CDN fallback button if different */}
              {directCdnUrl && directCdnUrl !== downloadUrl && (
                <a
                  id="direct-cdn-download-btn"
                  href={directCdnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700/60 transition-colors text-center cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Direto Alternativo (CDN)</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 text-neutral-500" />
                </a>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Play Preview */}
                <button
                  id="preview-final-btn"
                  type="button"
                  onClick={() => {
                    onPlayPreview(directCdnUrl, job.videoTitle, job.author, job.thumbnailUrl);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-neutral-200 text-xs font-semibold border border-neutral-700/80 transition-colors select-none"
                >
                  <Volume2 className="w-4 h-4 text-rose-400" />
                  <span>Ouvir no Player</span>
                </button>

                {/* Copy Link */}
                <button
                  id="copy-link-btn"
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-neutral-200 text-xs font-semibold border border-neutral-700/80 transition-colors select-none"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/80 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-red-300">
                <div className="font-semibold text-red-200 mb-1">
                  Falha ao converter áudio
                </div>
                <p>{job.errorMessage || 'Ocorreu um erro ao processar o vídeo. Verifique se o vídeo é público e tente novamente.'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                id="retry-conversion-btn"
                type="button"
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-sm py-3 px-4 rounded-xl border border-neutral-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar Novamente</span>
              </button>

              <a
                href={`https://loader.to/api/button/?url=${encodeURIComponent(job.videoUrl)}&f=${job.format}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium py-2.5 px-4 rounded-xl border border-rose-800/50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tentar Conversor Externo de Contingência</span>
              </a>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono text-[11px] truncate max-w-[200px]">
            {job.filename}
          </span>
          <button
            id="close-modal-btn"
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 underline"
          >
            {isReady ? 'Concluir' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
};
