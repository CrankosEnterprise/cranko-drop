import { shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { SimpleStore } from '../utils/store';
import { SettingsService } from './SettingsService';
import { LibraryFile, MediaCategory } from '../../src/types';

export class LibraryService {
  private static instance: LibraryService;
  private store: SimpleStore<{ files: LibraryFile[] }>;

  private constructor() {
    this.store = new SimpleStore<{ files: LibraryFile[] }>('library', { files: [] });
  }

  public static getInstance(): LibraryService {
    if (!LibraryService.instance) {
      LibraryService.instance = new LibraryService();
    }
    return LibraryService.instance;
  }

  public getAll(): LibraryFile[] {
    return this.store.get().files;
  }

  public registerFile(filePath: string): LibraryFile | null {
    if (!fs.existsSync(filePath)) return null;

    try {
      const stat = fs.statSync(filePath);
      const parsed = path.parse(filePath);
      const ext = parsed.ext.replace('.', '').toLowerCase();
      const category = this.categorize(ext);

      const existingIndex = this.store.get().files.findIndex(f => f.path === filePath);

      const fileItem: LibraryFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: parsed.base,
        path: filePath,
        size: stat.size,
        category,
        extension: ext,
        createdAt: Math.round(stat.birthtimeMs || stat.ctimeMs),
        modifiedAt: Math.round(stat.mtimeMs)
      };

      const files = [...this.store.get().files];
      if (existingIndex >= 0) {
        files[existingIndex] = fileItem;
      } else {
        files.unshift(fileItem);
      }

      this.store.replace({ files });
      return fileItem;
    } catch {
      return null;
    }
  }

  public scanDownloadsFolder(): LibraryFile[] {
    const settings = SettingsService.getInstance().getSettings();
    const baseDir = settings.downloadDir;

    if (!fs.existsSync(baseDir)) return this.getAll();

    const discovered: string[] = [];
    this.walkDir(baseDir, discovered);

    for (const filePath of discovered) {
      this.registerFile(filePath);
    }

    return this.getAll();
  }

  public async openFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    const normalized = path.normalize(path.resolve(filePath));
    if (!fs.existsSync(normalized)) {
      throw new Error(`Arquivo não encontrado: ${normalized}`);
    }
    const err = await shell.openPath(normalized);
    if (err) {
      return { success: false, error: err };
    }
    return { success: true };
  }

  public async showInFolder(filePath: string): Promise<{ success: boolean; openedDir?: boolean; error?: string }> {
    const normalized = path.normalize(path.resolve(filePath));
    if (fs.existsSync(normalized)) {
      shell.showItemInFolder(normalized);
      return { success: true };
    }

    // Fallback: If file was deleted/moved, try to open the directory
    const dir = path.dirname(normalized);
    if (fs.existsSync(dir)) {
      const err = await shell.openPath(dir);
      if (err) {
        return { success: false, error: `Falha ao abrir pasta: ${err}` };
      }
      return { success: true, openedDir: true };
    }

    throw new Error(`O arquivo ou pasta de destino não foi localizado: ${normalized}`);
  }

  public async deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      await shell.trashItem(filePath);
    }
    const files = this.store.get().files.filter(f => f.path !== filePath);
    this.store.replace({ files });
  }

  public renameFile(oldPath: string, newName: string): string {
    if (!fs.existsSync(oldPath)) {
      throw new Error(`Arquivo não encontrado: ${oldPath}`);
    }

    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);

    if (fs.existsSync(newPath)) {
      throw new Error(`Já existe um arquivo com o nome: ${newName}`);
    }

    fs.renameSync(oldPath, newPath);

    const files = this.store.get().files.map(f => {
      if (f.path === oldPath) {
        return {
          ...f,
          name: newName,
          path: newPath,
          extension: path.extname(newName).replace('.', '').toLowerCase()
        };
      }
      return f;
    });

    this.store.replace({ files });
    return newPath;
  }

  private walkDir(dir: string, fileList: string[]): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this.walkDir(full, fileList);
        } else if (entry.isFile()) {
          // ignore .tmp and .part files
          if (!entry.name.endsWith('.tmp') && !entry.name.endsWith('.part') && !entry.name.endsWith('.aria2')) {
            fileList.push(full);
          }
        }
      }
    } catch {}
  }

  private categorize(ext: string): MediaCategory {
    const e = ext.toLowerCase();
    if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv'].includes(e)) return 'videos';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'].includes(e)) return 'audios';
    if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'svg', 'ico'].includes(e)) return 'images';
    if (['pdf', 'txt', 'docx', 'xlsx', 'pptx', 'epub', 'md', 'csv'].includes(e)) return 'documents';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(e)) return 'archives';
    if (['exe', 'msi', 'dmg', 'appimage', 'deb', 'apk', 'iso'].includes(e)) return 'programs';
    return 'others';
  }
}
