import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { LibraryService } from './LibraryService';
import { SettingsService } from './SettingsService';
import { ExternalDownloadFile, LibraryFile, MediaCategory } from '../../src/types';

export class ExternalImportService {
  private static instance: ExternalImportService;

  private constructor() {}

  public static getInstance(): ExternalImportService {
    if (!ExternalImportService.instance) {
      ExternalImportService.instance = new ExternalImportService();
    }
    return ExternalImportService.instance;
  }

  public getWindowsDownloadsPath(): string {
    try {
      if (app) {
        return app.getPath('downloads');
      }
    } catch {}

    const userProfile = process.env.USERPROFILE || process.env.HOME || '';
    const fallbackPath = path.join(userProfile, 'Downloads');
    return fs.existsSync(fallbackPath) ? fallbackPath : process.cwd();
  }

  public scanRecentDownloads(limit = 12): ExternalDownloadFile[] {
    const downloadsDir = this.getWindowsDownloadsPath();
    if (!fs.existsSync(downloadsDir)) return [];

    try {
      const entries = fs.readdirSync(downloadsDir, { withFileTypes: true });
      const files: ExternalDownloadFile[] = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const name = entry.name;
        // Ignore incomplete / temporary download files
        if (
          name.endsWith('.crdownload') ||
          name.endsWith('.part') ||
          name.endsWith('.tmp') ||
          name.endsWith('.aria2') ||
          name.endsWith('.cranko.tmp') ||
          name.startsWith('~')
        ) {
          continue;
        }

        const fullPath = path.join(downloadsDir, name);
        try {
          const stat = fs.statSync(fullPath);
          // Only show files with actual data
          if (stat.size === 0) continue;

          const ext = path.extname(name).replace('.', '').toLowerCase();
          const category = this.categorize(ext);

          files.push({
            name,
            path: fullPath,
            size: stat.size,
            extension: ext,
            modifiedAt: Math.round(stat.mtimeMs),
            category
          });
        } catch {
          // File may be locked or permission restricted
        }
      }

      // Sort newest first
      files.sort((a, b) => b.modifiedAt - a.modifiedAt);
      return files.slice(0, limit);
    } catch {
      return [];
    }
  }

  public async importFile(
    sourcePath: string,
    options: { copyToLibraryFolder?: boolean; deleteOriginal?: boolean } = { copyToLibraryFolder: true }
  ): Promise<{ success: boolean; file: LibraryFile; message?: string }> {
    const normalizedSource = path.normalize(path.resolve(sourcePath));

    if (!fs.existsSync(normalizedSource)) {
      throw new Error(`Arquivo não encontrado para importação: ${normalizedSource}`);
    }

    const stat = fs.statSync(normalizedSource);
    if (stat.size === 0) {
      throw new Error('O arquivo está vazio (0 bytes). Verifique se o download no navegador já foi concluído.');
    }

    const settings = SettingsService.getInstance().getSettings();
    const destDir = settings.downloadDir;

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const parsed = path.parse(normalizedSource);
    let targetPath = path.join(destDir, parsed.base);

    // If copying to another folder and file already exists, avoid collision
    if (options.copyToLibraryFolder && path.dirname(normalizedSource).toLowerCase() !== destDir.toLowerCase()) {
      let counter = 1;
      while (fs.existsSync(targetPath)) {
        targetPath = path.join(destDir, `${parsed.name} (${counter})${parsed.ext}`);
        counter++;
      }

      fs.copyFileSync(normalizedSource, targetPath);

      if (options.deleteOriginal) {
        try {
          fs.unlinkSync(normalizedSource);
        } catch {}
      }
    } else {
      targetPath = normalizedSource;
    }

    // Register into Cranko Library
    const libraryService = LibraryService.getInstance();
    const registered = libraryService.registerFile(targetPath);

    if (!registered) {
      throw new Error('Falha ao catalogar o arquivo importado na biblioteca.');
    }

    return {
      success: true,
      file: registered,
      message: `Arquivo "${parsed.base}" importado e validado com sucesso na biblioteca.`
    };
  }

  private categorize(ext: string): MediaCategory {
    const e = ext.toLowerCase();
    if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv'].includes(e)) return 'videos';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'].includes(e)) return 'audios';
    if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'svg'].includes(e)) return 'images';
    if (['pdf', 'txt', 'docx', 'xlsx', 'pptx', 'epub', 'md', 'csv'].includes(e)) return 'documents';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(e)) return 'archives';
    if (['exe', 'msi', 'dmg', 'appimage', 'deb', 'apk', 'iso'].includes(e)) return 'programs';
    return 'others';
  }
}
