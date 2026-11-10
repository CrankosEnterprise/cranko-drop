import { BrowserWindow, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { SimpleStore } from '../utils/store';
import { SettingsService } from './SettingsService';
import { BaseEngine } from './engines/BaseEngine';
import { NativeHttpEngine } from './engines/NativeHttpEngine';
import { YtDlpEngine } from './engines/YtDlpEngine';
import { Aria2Engine } from './engines/Aria2Engine';
import { GalleryDlEngine } from './engines/GalleryDlEngine';
import { LibraryService } from './LibraryService';
import { DownloadItem, DownloadEngine, MediaCategory } from '../../src/types';

export class DownloadManager {
  private static instance: DownloadManager;
  private store: SimpleStore<{ items: DownloadItem[] }>;
  private engines: Map<DownloadEngine, BaseEngine> = new Map();
  private formatMap: Map<string, string> = new Map(); // itemId -> customFormatId

  private constructor() {
    this.store = new SimpleStore<{ items: DownloadItem[] }>('downloads', { items: [] });

    // Initialize engines
    const nativeEngine = new NativeHttpEngine();
    const ytDlpEngine = new YtDlpEngine();
    const aria2Engine = new Aria2Engine();
    const galleryEngine = new GalleryDlEngine();

    this.engines.set('native', nativeEngine);
    this.engines.set('yt-dlp', ytDlpEngine);
    this.engines.set('aria2', aria2Engine);
    this.engines.set('gallery-dl', galleryEngine);

    // Bind engine events
    for (const [engineName, engine] of this.engines.entries()) {
      engine.on('progress', (itemId: string, event) => {
        this.updateItemProgress(itemId, event);
      });

      engine.on('completed', (itemId: string, finalPath: string) => {
        this.completeDownload(itemId, finalPath);
      });

      engine.on('paused', (itemId: string) => {
        this.updateItemStatus(itemId, 'paused');
      });
    }
  }

  public static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  public getAll(): DownloadItem[] {
    return this.store.get().items;
  }

  public async addDownload(
    url: string,
    title?: string,
    preferredEngine?: DownloadEngine,
    formatId?: string,
    customFilename?: string
  ): Promise<DownloadItem> {
    if (url.includes('spotify.com') || url.includes('spotify.link')) {
      throw new Error('O Spotify utiliza proteção DRM sob licença. O Cranko Drop respeita as diretrizes de licenciamento e não realiza downloads diretos desta plataforma.');
    }

    const settings = SettingsService.getInstance().getSettings();
    const engineType: DownloadEngine = preferredEngine || 'native';

    const safeTitle = (title || 'download').replace(/[\\/:*?"<>|]/g, '_').trim();
    const ext = this.guessExtension(url, formatId, safeTitle, engineType);
    const filename = customFilename || (safeTitle.endsWith(`.${ext}`) ? safeTitle : `${safeTitle}.${ext}`);

    const category = this.categorizeByExtension(ext);
    const targetDir = this.resolveDestinationDir(settings.downloadDir, category, settings.organizeByType);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const savePath = path.join(targetDir, filename);

    const newItem: DownloadItem = {
      id: `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url,
      title: title || filename,
      filename,
      savePath,
      fileSize: 0,
      downloadedBytes: 0,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'queued',
      engine: engineType,
      category,
      createdAt: Date.now()
    };

    if (formatId) {
      this.formatMap.set(newItem.id, formatId);
    }

    const current = this.store.get().items;
    this.store.set({ items: [newItem, ...current] });

    this.broadcast('download-added', newItem);
    this.processQueue();

    return newItem;
  }

  public async pauseDownload(id: string): Promise<void> {
    const item = this.findItem(id);
    if (!item || (item.status !== 'downloading' && item.status !== 'queued')) return;

    item.status = 'paused';
    item.speed = 0;
    this.persistItems();

    const engine = this.engines.get(item.engine);
    if (engine) {
      await engine.pause(id);
    }

    this.broadcast('download-updated', item);
    this.processQueue();
  }

  public async resumeDownload(id: string): Promise<void> {
    const item = this.findItem(id);
    if (!item || (item.status !== 'paused' && item.status !== 'error')) return;

    item.status = 'queued';
    item.errorMessage = undefined;
    this.persistItems();

    this.broadcast('download-updated', item);
    this.processQueue();
  }

  public async cancelDownload(id: string): Promise<void> {
    const item = this.findItem(id);
    if (!item) return;

    item.status = 'cancelled';
    item.speed = 0;
    this.persistItems();

    const engine = this.engines.get(item.engine);
    if (engine) {
      await engine.cancel(id);
    }

    this.broadcast('download-updated', item);
    this.processQueue();
  }

  public async retryDownload(id: string): Promise<void> {
    await this.resumeDownload(id);
  }

  public clearCompleted(): void {
    const items = this.store.get().items.filter(i => i.status !== 'completed' && i.status !== 'cancelled');
    this.store.replace({ items });
    this.broadcast('downloads-refreshed', items);
  }

  public removeDownload(id: string): void {
    this.cancelDownload(id);
    const items = this.store.get().items.filter(i => i.id !== id);
    this.store.replace({ items });
    this.broadcast('downloads-refreshed', items);
  }

  private async processQueue(): Promise<void> {
    const settings = SettingsService.getInstance().getSettings();
    const items = this.store.get().items;

    const activeCount = items.filter(i => i.status === 'downloading').length;
    const availableSlots = Math.max(0, settings.maxConcurrentDownloads - activeCount);

    if (availableSlots <= 0) return;

    const queuedItems = items.filter(i => i.status === 'queued').slice(0, availableSlots);

    for (const item of queuedItems) {
      this.startItem(item);
    }
  }

  private async startItem(item: DownloadItem): Promise<void> {
    item.status = 'downloading';
    this.persistItems();
    this.broadcast('download-updated', item);

    const engine = this.engines.get(item.engine);
    if (!engine) {
      this.failDownload(item.id, `Mecanismo de download '${item.engine}' não suportado.`);
      return;
    }

    const customFormatId = this.formatMap.get(item.id);

    try {
      const finalPath = await engine.start(item, customFormatId);
      this.completeDownload(item.id, finalPath);
    } catch (err: any) {
      this.failDownload(item.id, err?.message || 'Falha desconhecida no download');
    }
  }

  private updateItemProgress(itemId: string, event: any): void {
    const item = this.findItem(itemId);
    if (!item || item.status !== 'downloading') return;

    item.downloadedBytes = event.downloadedBytes;
    if (event.totalBytes > 0) item.fileSize = event.totalBytes;
    item.progress = Math.round(event.progress);
    item.speed = event.speed;
    item.eta = event.eta;

    this.broadcast('download-progress', item);
  }

  private updateItemStatus(itemId: string, status: any): void {
    const item = this.findItem(itemId);
    if (!item) return;
    item.status = status;
    item.speed = 0;
    this.persistItems();
    this.broadcast('download-updated', item);
  }

  private completeDownload(itemId: string, finalPath?: string): void {
    const item = this.findItem(itemId);
    if (!item) return;

    if (finalPath) {
      item.savePath = finalPath;
      item.filename = path.basename(finalPath);
      const newExt = path.extname(finalPath).replace('.', '').toLowerCase();
      if (newExt) {
        item.category = this.categorizeByExtension(newExt);
      }
    }

    if (fs.existsSync(item.savePath)) {
      try {
        item.fileSize = fs.statSync(item.savePath).size;
        item.downloadedBytes = item.fileSize;
      } catch {}
    }

    item.status = 'completed';
    item.progress = 100;
    item.speed = 0;
    item.eta = 0;
    item.completedAt = Date.now();

    this.persistItems();
    this.broadcast('download-updated', item);

    // Register with Library
    try {
      LibraryService.getInstance().registerFile(item.savePath);
    } catch {}

    this.processQueue();
  }

  private failDownload(itemId: string, errorMessage: string): void {
    const item = this.findItem(itemId);
    if (!item) return;

    item.status = 'error';
    item.speed = 0;
    item.eta = 0;
    item.errorMessage = errorMessage;

    this.persistItems();
    this.broadcast('download-updated', item);
    this.processQueue();
  }

  private findItem(id: string): DownloadItem | undefined {
    return this.store.get().items.find(i => i.id === id);
  }

  private persistItems(): void {
    this.store.replace({ items: this.store.get().items });
  }

  private broadcast(channel: string, payload: any): void {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    }
  }

  private guessExtension(urlStr: string, formatId?: string, title?: string, engine?: DownloadEngine): string {
    if (formatId === 'bestaudio/best') return 'mp3';
    
    // Check if title already has extension
    if (title && title.includes('.')) {
      const ext = title.split('.').pop()?.toLowerCase();
      if (ext && ext.length >= 2 && ext.length <= 5) return ext;
    }

    try {
      const parsed = new URL(urlStr);
      const parts = parsed.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && last.includes('.')) {
        const ext = last.split('.').pop();
        if (ext && ext.length >= 2 && ext.length <= 5) return ext.toLowerCase();
      }
    } catch {}

    // Fallbacks based on engine
    if (engine === 'yt-dlp') return 'mp4';
    if (engine === 'gallery-dl') return 'zip';

    return 'download';
  }

  private categorizeByExtension(ext: string): MediaCategory {
    const e = ext.toLowerCase();
    if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv'].includes(e)) return 'videos';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'].includes(e)) return 'audios';
    if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'svg', 'ico'].includes(e)) return 'images';
    if (['pdf', 'txt', 'docx', 'xlsx', 'pptx', 'epub', 'md', 'csv'].includes(e)) return 'documents';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(e)) return 'archives';
    if (['exe', 'msi', 'dmg', 'appimage', 'deb', 'apk', 'iso'].includes(e)) return 'programs';
    return 'others';
  }

  private resolveDestinationDir(baseDir: string, category: MediaCategory, organizeByType: boolean): string {
    if (!organizeByType) return baseDir;

    const folderMap: Record<MediaCategory, string> = {
      videos: 'Vídeos',
      audios: 'Áudios',
      images: 'Imagens',
      documents: 'Documentos',
      archives: 'Compactados',
      programs: 'Programas',
      others: 'Outros'
    };

    return path.join(baseDir, folderMap[category] || 'Outros');
  }
}
