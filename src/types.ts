export type AudioFormat = 'mp3' | 'm4a' | 'wav' | 'flac';

export type AudioBitrate = '128k' | '192k' | '256k' | '320k';

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  author: string;
  authorUrl?: string;
  thumbnailUrl: string;
  hqThumbnailUrl: string;
  duration?: number; // in seconds
  durationFormatted?: string;
  viewCount?: string;
}

export interface ConversionSettings {
  format: AudioFormat;
  bitrate: AudioBitrate;
  trim: boolean;
  trimStart: string; // "00:00"
  trimEnd: string;   // "03:45"
  customTitle: string;
  customArtist: string;
  customAlbum: string;
}

export interface ConversionJob {
  id: string;
  videoUrl: string;
  videoTitle: string;
  author: string;
  thumbnailUrl: string;
  format: AudioFormat;
  bitrate: AudioBitrate;
  status: 'idle' | 'analyzing' | 'converting' | 'processing' | 'ready' | 'error';
  progress: number; // 0 to 100
  stageText?: string;
  elapsedSeconds?: number;
  downloadUrl?: string;
  streamUrl?: string;
  errorMessage?: string;
  fileSize?: string;
  filename: string;
  createdAt: number;
}

export interface DownloadHistoryItem {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  format: AudioFormat;
  bitrate: AudioBitrate;
  downloadUrl: string;
  timestamp: number;
  duration?: string;
}
