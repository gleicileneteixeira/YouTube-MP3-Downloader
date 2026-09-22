import React, { useState } from 'react';
import { Layers, Play, Download, Loader2, CheckCircle2, AlertCircle, Trash2, Plus } from 'lucide-react';
import { AudioBitrate, AudioFormat, DownloadHistoryItem } from '../types';
import { triggerBrowserDownload } from '../utils/downloadHelper';

interface BatchItem {
  id: string;
  url: string;
  title?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  progress: number;
  downloadUrl?: string;
  error?: string;
}

interface BatchConverterProps {
  onAddToHistory?: (item: DownloadHistoryItem) => void;
}

export const BatchConverter: React.FC<BatchConverterProps> = ({ onAddToHistory }) => {
  const [inputText, setInputText] = useState('');
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [bitrate, setBitrate] = useState<AudioBitrate>('320k');
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const handleAddLinks = () => {
    if (!inputText.trim()) return;

    const lines = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newItems: BatchItem[] = [];

    for (const line of lines) {
      // Basic check
      if (line.includes('youtu') || line.length === 11) {
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          url: line,
          status: 'pending',
          progress: 0,
        });
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      setInputText('');
    }
  };

  const handleProcessBatch = async () => {
    if (items.length === 0 || isProcessingBatch) return;
    setIsProcessingBatch(true);

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      if (current.status === 'ready') continue;

      // Update to processing
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'processing', progress: 15 } : it))
      );

      try {
        // Fetch info
        const infoRes = await fetch(`/api/info?url=${encodeURIComponent(current.url)}`);
        const infoData = await infoRes.json();
        const title = infoData.metadata?.title || 'Faixa de Áudio';
        const thumb = infoData.metadata?.thumbnailUrl || '';

        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, title, thumbnailUrl: thumb, progress: 35 } : it
          )
        );

        // Convert
        const convRes = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: current.url, format }),
        });
        const convData = await convRes.json();

        if (!convData.success || !convData.jobId) {
          throw new Error(convData.error || 'Falha ao converter');
        }

        // Poll progress
        let downloadUrl = '';
        for (let attempt = 0; attempt < 35; attempt++) {
          await new Promise((r) => setTimeout(r, 2000));
          const pRes = await fetch(`/api/progress?id=${convData.jobId}&progressUrl=${encodeURIComponent(convData.progressUrl || '')}`);
          const pData = await pRes.json();

          if (pData.status === 'ready' && pData.downloadUrl) {
            downloadUrl = pData.downloadUrl;
            break;
          }

          const dynamicProgress = Math.min(92, 35 + attempt * 2);
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i ? { ...it, progress: dynamicProgress } : it
            )
          );
        }

        if (downloadUrl) {
          const finalFilename = `${(current.title || 'audio').replace(/[\/\\?%*:|"<>]/g, '_')}.${format}`;
          const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(finalFilename)}&format=${format}&bitrate=${bitrate}`;
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i ? { ...it, status: 'ready', progress: 100, downloadUrl: proxyUrl } : it
            )
          );

          // Add to history
          if (onAddToHistory) {
            onAddToHistory({
              id: Math.random().toString(36).substring(2, 9),
              videoId: current.id,
              title: current.title || 'Áudio YouTube',
              artist: 'YouTube',
              thumbnailUrl: current.thumbnailUrl || '',
              format,
              bitrate,
              downloadUrl: proxyUrl,
              timestamp: Date.now(),
            });
          }

          // Trigger download to device
          triggerBrowserDownload(proxyUrl, finalFilename);
        } else {
          throw new Error('Tempo limite excedido na conversão');
        }
      } catch (err: any) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'error', progress: 0, error: err.message } : it
          )
        );
      }
    }

    setIsProcessingBatch(false);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClear = () => {
    setItems([]);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-rose-500" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            Conversão em Lote (Múltiplos Links)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-neutral-400">
          Cole vários links do YouTube (um por linha) para converter e baixar múltiplos áudios de uma só vez.
        </p>

        {/* Textarea */}
        <textarea
          id="batch-links-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`https://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://www.youtube.com/shorts/...`}
          rows={4}
          className="w-full bg-neutral-950/80 border border-neutral-800 focus:border-rose-500 rounded-xl p-3 text-xs sm:text-sm text-neutral-100 placeholder-neutral-600 font-mono focus:outline-none"
        />

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as AudioFormat)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="mp3">MP3</option>
              <option value="m4a">M4A</option>
              <option value="wav">WAV</option>
              <option value="flac">FLAC</option>
            </select>

            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value as AudioBitrate)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="320k">320 kbps (Ultra)</option>
              <option value="256k">256 kbps (Alta)</option>
              <option value="192k">192 kbps (Padrão)</option>
              <option value="128k">128 kbps (Leve)</option>
            </select>
          </div>

          <button
            id="add-batch-links-btn"
            type="button"
            onClick={handleAddLinks}
            disabled={!inputText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-100 rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar à Fila</span>
          </button>
        </div>
      </div>

      {/* Queue items */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-neutral-300">
              Fila de conversão ({items.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={isProcessingBatch}
                className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
              >
                Limpar Fila
              </button>
              <button
                id="start-batch-btn"
                type="button"
                onClick={handleProcessBatch}
                disabled={isProcessingBatch || items.every((i) => i.status === 'ready')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-950/40 disabled:opacity-50"
              >
                {isProcessingBatch ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Iniciar Conversão em Lote</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {it.thumbnailUrl && (
                    <img
                      src={it.thumbnailUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-neutral-950"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-100 truncate">
                      {it.title || it.url}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                      <span className="font-mono uppercase">{format}</span>
                      <span>•</span>
                      {it.status === 'pending' && <span className="text-neutral-500">Pendente</span>}
                      {it.status === 'processing' && (
                        <span className="text-rose-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Convertendo ({it.progress}%)
                        </span>
                      )}
                      {it.status === 'ready' && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Pronto
                        </span>
                      )}
                      {it.status === 'error' && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {it.error || 'Erro'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {it.status === 'ready' && it.downloadUrl && (
                    <a
                      href={it.downloadUrl}
                      download={`${it.title || 'audio'}.${format}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        triggerBrowserDownload(it.downloadUrl!, `${it.title || 'audio'}.${format}`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemove(it.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
