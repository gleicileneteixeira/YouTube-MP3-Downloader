import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { UrlInputForm } from './components/UrlInputForm';
import { VideoCard } from './components/VideoCard';
import { ConversionModal } from './components/ConversionModal';
import { AudioPlayer } from './components/AudioPlayer';
import { DownloadHistory } from './components/DownloadHistory';
import { BatchConverter } from './components/BatchConverter';
import { FaqGuide } from './components/FaqGuide';
import { FeatureHighlights } from './components/FeatureHighlights';
import { RecentDownloads } from './components/RecentDownloads';
import { VideoMetadata, ConversionSettings, ConversionJob, DownloadHistoryItem } from './types';
import { triggerBrowserDownload } from './utils/downloadHelper';
import { Music2, Headphones, Sparkles, CheckCircle2, ArrowDown } from 'lucide-react';

const STORAGE_KEY = 'yt_mp3_downloader_history_v1';

export default function App() {
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'history' | 'faq'>('single');
  
  // Loading & Video Data
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // Settings
  const [settings, setSettings] = useState<ConversionSettings>({
    format: 'mp3',
    bitrate: '320k',
    trim: false,
    trimStart: '00:00',
    trimEnd: '',
    customTitle: '',
    customArtist: '',
    customAlbum: 'YouTube MP3',
  });

  // Conversion Job
  const [job, setJob] = useState<ConversionJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Audio Preview Player
  const [activeAudio, setActiveAudio] = useState<{
    streamUrl: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
  } | null>(null);

  // Download History
  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save history on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history to localStorage', e);
    }
  }, [history]);

  // Polling ref to cancel previous polls if needed
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Fetch Video Info on Submit
  const handleFetchInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsLoadingInfo(true);
    setInfoError(null);
    setMetadata(null);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.metadata) {
        throw new Error(data.error || 'Não foi possível carregar as informações do vídeo.');
      }

      setMetadata(data.metadata);

      // Pre-fill custom tags
      setSettings((prev) => ({
        ...prev,
        customTitle: data.metadata.title || '',
        customArtist: data.metadata.author || '',
      }));
    } catch (err: any) {
      setInfoError(err.message || 'Erro ao obter dados do YouTube. Verifique o link inserido.');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Convert Video to MP3
  const handleConvert = async () => {
    if (!metadata) return;

    setIsConverting(true);
    setIsModalOpen(true);

    const initialFilename = `${settings.customArtist || metadata.author} - ${settings.customTitle || metadata.title}.${settings.format}`;

    const newJob: ConversionJob = {
      id: '',
      videoUrl: metadata.url,
      videoTitle: settings.customTitle || metadata.title,
      author: settings.customArtist || metadata.author,
      thumbnailUrl: metadata.thumbnailUrl,
      format: settings.format,
      bitrate: settings.bitrate,
      status: 'analyzing',
      progress: 15,
      stageText: 'Conectando ao YouTube e analisando fluxo...',
      elapsedSeconds: 0,
      filename: initialFilename,
      createdAt: Date.now(),
    };

    setJob(newJob);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: metadata.url,
          format: settings.format,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.jobId) {
        throw new Error(data.error || 'Não foi possível iniciar a conversão do áudio.');
      }

      const jobId = data.jobId;
      const progressUrl = data.progressUrl || '';

      setJob((prev) => (prev ? { 
        ...prev, 
        id: jobId, 
        status: 'converting', 
        progress: 25,
        stageText: 'Extraindo áudio de alta qualidade...' 
      } : null));

      // Start Polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      let attempts = 0;
      const maxAttempts = 45; // ~90 seconds max
      const startTime = Date.now();

      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        const elapsed = Math.round((Date.now() - startTime) / 1000);

        // Calculate smooth responsive progress
        let smoothProgress = 30;
        let currentStage = 'Extraindo áudio do vídeo...';

        if (elapsed < 4) {
          smoothProgress = 25 + elapsed * 5;
          currentStage = 'Localizando melhor fluxo de áudio estéreo...';
        } else if (elapsed < 10) {
          smoothProgress = 45 + Math.round((elapsed - 4) * 4);
          currentStage = `Codificando para ${settings.format.toUpperCase()} (${settings.bitrate})...`;
        } else if (elapsed < 20) {
          smoothProgress = 69 + Math.round((elapsed - 10) * 1.5);
          currentStage = 'Processando tags e qualidade de som...';
        } else {
          smoothProgress = Math.min(92, 84 + Math.round((elapsed - 20) * 0.4));
          currentStage = 'Finalizando arquivo para download...';
        }

        try {
          const pollRes = await fetch(`/api/progress?id=${jobId}&progressUrl=${encodeURIComponent(progressUrl)}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'error') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setJob((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'error',
                    errorMessage: pollData.error || 'Erro no servidor de conversão.',
                  }
                : null
            );
            setIsConverting(false);
            return;
          }

          if (pollData.status === 'ready' && pollData.downloadUrl) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            // Construct proxy download URL to ensure sanitized filename & optional ffmpeg trimming
            const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(pollData.downloadUrl)}&filename=${encodeURIComponent(
              initialFilename
            )}&format=${settings.format}&bitrate=${settings.bitrate}&trim=${settings.trim}&trimStart=${encodeURIComponent(
              settings.trimStart
            )}&trimEnd=${encodeURIComponent(settings.trimEnd)}&title=${encodeURIComponent(
              settings.customTitle || metadata.title
            )}&artist=${encodeURIComponent(settings.customArtist || metadata.author)}&album=${encodeURIComponent(
              settings.customAlbum
            )}`;

            setJob((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'ready',
                    progress: 100,
                    stageText: 'Pronto para download!',
                    elapsedSeconds: elapsed,
                    downloadUrl: proxyUrl,
                    streamUrl: pollData.downloadUrl,
                  }
                : null
            );

            // Add to history
            const historyItem: DownloadHistoryItem = {
              id: Math.random().toString(36).substring(2, 9),
              videoId: metadata.id,
              title: settings.customTitle || metadata.title,
              artist: settings.customArtist || metadata.author,
              thumbnailUrl: metadata.thumbnailUrl,
              format: settings.format,
              bitrate: settings.bitrate,
              downloadUrl: proxyUrl,
              timestamp: Date.now(),
            };

            setHistory((prev) => [historyItem, ...prev.filter((i) => i.videoId !== metadata.id)].slice(0, 30));
            setIsConverting(false);

            // Auto-trigger browser download to the device
            setTimeout(() => {
              try {
                triggerBrowserDownload(proxyUrl, initialFilename);
              } catch (e) {
                console.warn('Auto download error, user can click button:', e);
              }
            }, 500);

            return;
          }

          // Still in progress: update with smooth progress
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  progress: smoothProgress,
                  stageText: pollData.text || currentStage,
                  elapsedSeconds: elapsed,
                }
              : null
          );

          if (attempts >= maxAttempts) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            const directFallback = `https://loader.to/api/button/?url=${encodeURIComponent(metadata.url)}&f=${settings.format}`;
            setJob((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'ready',
                    progress: 100,
                    stageText: 'Conversão pronta via link direto!',
                    downloadUrl: directFallback,
                    streamUrl: directFallback,
                  }
                : null
            );

            // Also add fallback to history
            const fallbackHistoryItem: DownloadHistoryItem = {
              id: Math.random().toString(36).substring(2, 9),
              videoId: metadata.id,
              title: settings.customTitle || metadata.title,
              artist: settings.customArtist || metadata.author,
              thumbnailUrl: metadata.thumbnailUrl,
              format: settings.format,
              bitrate: settings.bitrate,
              downloadUrl: directFallback,
              timestamp: Date.now(),
            };
            setHistory((prev) => [fallbackHistoryItem, ...prev.filter((i) => i.videoId !== metadata.id)].slice(0, 30));
            setIsConverting(false);

            setTimeout(() => {
              triggerBrowserDownload(directFallback, initialFilename);
            }, 500);
          }
        } catch (err: any) {
          console.warn('Polling error:', err);
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  progress: smoothProgress,
                  elapsedSeconds: elapsed,
                }
              : null
          );
        }
      }, 2000);
    } catch (err: any) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setJob((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              errorMessage: err.message || 'Falha ao processar conversão.',
            }
          : null
      );
      setIsConverting(false);
    }
  };

  // Play Preview Audio
  const handlePlayPreview = (streamUrl: string, title: string, artist: string, thumbnailUrl: string) => {
    setActiveAudio({
      streamUrl,
      title,
      artist,
      thumbnailUrl,
    });
  };

  // Select video from history
  const handleSelectFromHistory = (videoId: string) => {
    setUrl(`https://www.youtube.com/watch?v=${videoId}`);
    setActiveTab('single');
    // Auto fetch
    setTimeout(() => {
      fetch(`/api/info?url=https://www.youtube.com/watch?v=${videoId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.metadata) {
            setMetadata(d.metadata);
          }
        })
        .catch(() => {});
    }, 100);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-rose-500/30 selection:text-rose-200">
      {/* Top Navigation */}
      <Header
        historyCount={history.length}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Tab 1: Single Video Converter */}
        {activeTab === 'single' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Hero Header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold select-none">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Conversor de Áudio MP3 do YouTube</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Baixe Áudio do YouTube em <span className="text-rose-500">MP3 320 kbps</span>
              </h2>
              <p className="text-xs sm:text-base text-neutral-400 leading-relaxed">
                Cole o link de qualquer vídeo ou Shorts do YouTube. Escolha a qualidade, corte trechos se desejar e baixe o áudio direto no seu dispositivo.
              </p>
            </div>

            {/* Input Form */}
            <UrlInputForm
              url={url}
              setUrl={setUrl}
              onSubmit={handleFetchInfo}
              isLoading={isLoadingInfo}
              errorMessage={infoError}
            />

            {/* Loaded Video Metadata & Conversion Options */}
            {metadata && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <VideoCard
                  metadata={metadata}
                  settings={settings}
                  setSettings={setSettings}
                  onConvert={handleConvert}
                  isConverting={isConverting}
                  onPlayPreview={() =>
                    handlePlayPreview(
                      metadata.url,
                      metadata.title,
                      metadata.author,
                      metadata.thumbnailUrl
                    )
                  }
                />
              </div>
            )}

            {/* Features Highlight strip */}
            {!metadata && <FeatureHighlights />}

            {/* Quick Recent Downloads preview on main screen */}
            {history.length > 0 && (
              <RecentDownloads
                history={history}
                onPlay={handlePlayPreview}
                onRemove={(id) => setHistory((prev) => prev.filter((i) => i.id !== id))}
                onViewAll={() => setActiveTab('history')}
                onSelectVideo={handleSelectFromHistory}
              />
            )}
          </div>
        )}

        {/* Tab 2: Batch Converter */}
        {activeTab === 'batch' && (
          <div className="animate-in fade-in">
            <BatchConverter
              onAddToHistory={(item) =>
                setHistory((prev) => [item, ...prev.filter((i) => i.id !== item.id)].slice(0, 50))
              }
            />
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in">
            <DownloadHistory
              history={history}
              onPlay={handlePlayPreview}
              onRemove={(id) => setHistory((prev) => prev.filter((i) => i.id !== id))}
              onClear={() => setHistory([])}
              onSelectVideo={handleSelectFromHistory}
            />
          </div>
        )}

        {/* Tab 4: FAQ & Guides */}
        {activeTab === 'faq' && (
          <div className="animate-in fade-in">
            <FaqGuide />
          </div>
        )}
      </main>

      {/* Conversion Modal */}
      <ConversionModal
        job={job}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsConverting(false);
        }}
        onRetry={handleConvert}
        onPlayPreview={handlePlayPreview}
        onGoToHistory={() => setActiveTab('history')}
      />

      {/* Sticky Bottom Audio Player */}
      {activeAudio && (
        <AudioPlayer
          streamUrl={activeAudio.streamUrl}
          title={activeAudio.title}
          artist={activeAudio.artist}
          thumbnailUrl={activeAudio.thumbnailUrl}
          onClose={() => setActiveAudio(null)}
        />
      )}

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 bg-neutral-950/80 py-6 text-center text-xs text-neutral-500 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-neutral-400">Serviço ativo e operacional</span>
          </div>
          <p>© {new Date().getFullYear()} YouTube MP3 Downloader • Rápido, Gratuito e Seguro</p>
        </div>
      </footer>
    </div>
  );
}
