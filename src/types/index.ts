export type DownloadStatus = 
  | 'idle' 
  | 'analyzing' 
  | 'queued' 
  | 'downloading' 
  | 'paused' 
  | 'completed' 
  | 'error' 
  | 'cancelled';

export type DownloadEngine = 'native' | 'yt-dlp' | 'aria2' | 'gallery-dl';

export type MediaCategory = 
  | 'videos' 
  | 'audios' 
  | 'images' 
  | 'documents' 
  | 'archives' 
  | 'programs' 
  | 'others';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  filename: string;
  savePath: string;
  fileSize: number; // in bytes (0 if unknown)
  downloadedBytes: number;
  progress: number; // 0 to 100
  speed: number; // in bytes/sec
  eta: number; // estimated seconds remaining
  status: DownloadStatus;
  engine: DownloadEngine;
  category: MediaCategory;
  thumbnailUrl?: string;
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}

export interface UrlAnalysisResult {
  url: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
  filesize?: number;
  recommendedEngine: DownloadEngine;
  availableFormats?: {
    formatId: string;
    resolution?: string;
    extension: string;
    filesize?: number;
    hasVideo: boolean;
    hasAudio: boolean;
    note?: string;
  }[];
  isDirectLink: boolean;
  isPlaylist?: boolean;
  playlistCount?: number;
  isProtectedPlatform?: boolean;
  canDownloadDirectly?: boolean;
  protectionNotice?: string;
  officialUrl?: string;
  provider?: string;
  artist?: string;
  compatibleProviders?: DownloadProvider[];
  suggestedAction?: 'direct_download' | 'select_format' | 'open_external_provider' | 'import_file';
}

export type ConversionType = 'image' | 'audio' | 'video' | 'document';

export interface ConversionTask {
  id: string;
  sourcePath: string;
  sourceName: string;
  sourceExt: string;
  sourceSize: number;
  targetFormat: string;
  targetPath: string;
  type: ConversionType;
  options: {
    width?: number;
    height?: number;
    maintainAspect?: boolean;
    quality?: number; // 1-100
    bitrate?: string; // e.g. "320k"
    preset?: string;
    codec?: string;
  };
  progress: number; // 0-100
  status: 'idle' | 'converting' | 'completed' | 'error';
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}

export interface LibraryFile {
  id: string;
  name: string;
  path: string;
  size: number;
  category: MediaCategory;
  extension: string;
  createdAt: number;
  modifiedAt: number;
  thumbnail?: string;
}

export interface AppSettings {
  downloadDir: string;
  maxConcurrentDownloads: number;
  maxDownloadSpeed: number; // in KB/s (0 = unlimited)
  organizeByType: boolean;
  organizeByDate: boolean;
  theme: 'dark' | 'light' | 'system';
  notifyOnComplete: boolean;
  soundOnComplete: boolean;
  defaultVideoQuality: string;
  defaultAudioFormat: string;
  defaultImageFormat: string;
}

export interface BinaryStatus {
  name: 'yt-dlp' | 'ffmpeg' | 'ffprobe' | 'aria2c' | 'gallery-dl';
  available: boolean;
  version?: string;
  path?: string;
}

export type ProviderIntegrationMethod =
  | 'local_engine'       // Mecanismo nativo local (Cranko Native, yt-dlp, FFmpeg, etc.)
  | 'official_api'        // API oficial / aberta (Spotify oEmbed, Invidious, Unsplash)
  | 'custom_api'          // Instância personalizada configurável (Cobalt, Piped)
  | 'browser_assisted';   // Portal web especializado com abertura no navegador e importação guiada

export type ProviderStatus = 'operational' | 'degraded' | 'manual_assisted' | 'offline';

export interface DownloadProvider {
  id: string;
  name: string;
  category: 'video' | 'audio' | 'image' | 'file' | 'universal';
  description: string;
  platforms: string[]; // ['youtube', 'tiktok', 'instagram', 'twitter', 'spotify', 'direct', 'all']
  contentTypes: ('video' | 'audio' | 'image' | 'gallery' | 'document' | 'archive')[];
  availableFormats: string[];
  maxQuality: string;
  method: ProviderIntegrationMethod;
  status: ProviderStatus;
  lastChecked: number;
  isEnabled: boolean;
  websiteUrl?: string;
  apiUrl?: string;
  pingUrl?: string;
  statusMessage?: string;
}

export interface ExternalDownloadFile {
  name: string;
  path: string;
  size: number;
  extension: string;
  modifiedAt: number;
  category: MediaCategory;
}
