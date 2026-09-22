import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, X, Music, Download } from 'lucide-react';

interface AudioPlayerProps {
  streamUrl: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  streamUrl,
  title,
  artist,
  thumbnailUrl,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = streamUrl;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Auto-play blocked or error:', e);
        setIsPlaying(false);
      });
    }
  }, [streamUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      id="bottom-audio-player"
      className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 border-t border-neutral-800 backdrop-blur-xl px-4 py-3 sm:px-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
        {/* Track info */}
        <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0">
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 relative">
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5 px-1">
                <span className="w-1 h-3 bg-rose-500 animate-pulse rounded-full" />
                <span className="w-1 h-5 bg-rose-400 animate-bounce rounded-full" />
                <span className="w-1 h-2 bg-rose-500 animate-pulse rounded-full" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
              {title}
            </h4>
            <p className="text-[11px] text-neutral-400 truncate">
              {artist}
            </p>
          </div>
        </div>

        {/* Player Controls & Scrubber */}
        <div className="flex flex-col items-center gap-1.5 w-full sm:w-2/4">
          <div className="flex items-center gap-3">
            {/* Cycle speed */}
            <button
              type="button"
              onClick={cycleSpeed}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
              title="Velocidade de reprodução"
            >
              {playbackRate}x
            </button>

            {/* Play/Pause Button */}
            <button
              id="player-play-pause-btn"
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                }
              }}
              className="p-1.5 text-neutral-400 hover:text-neutral-200"
              title="Voltar 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline scrub */}
          <div className="w-full flex items-center gap-2 text-[11px] font-mono text-neutral-400">
            <span className="w-9 text-right shrink-0">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <span className="w-9 shrink-0">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Close */}
        <div className="flex items-center justify-end gap-3 w-full sm:w-1/4">
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-neutral-400 hover:text-neutral-200 p-1"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          <button
            id="close-player-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 rounded-lg transition-colors"
            title="Fechar player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
