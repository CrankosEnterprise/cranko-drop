import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { BaseEngine, EngineProgressEvent } from './BaseEngine';
import { DownloadItem } from '../../../src/types';
import { BinaryManager } from '../BinaryManager';

export class GalleryDlEngine extends BaseEngine {
  private activeMap: Map<string, { process: ChildProcess; isCancelled: boolean }> = new Map();

  public async start(item: DownloadItem): Promise<string> {
    return this.runGalleryDl(item);
  }

  public async resume(item: DownloadItem): Promise<void> {
    await this.runGalleryDl(item);
  }

  public async pause(itemId: string): Promise<void> {
    const active = this.activeMap.get(itemId);
    if (active) {
      active.process.kill('SIGTERM');
      this.activeMap.delete(itemId);
      this.emit('paused', itemId);
    }
  }

  public async cancel(itemId: string): Promise<void> {
    const active = this.activeMap.get(itemId);
    if (active) {
      active.isCancelled = true;
      active.process.kill('SIGKILL');
      this.activeMap.delete(itemId);
    }
  }

  private runGalleryDl(item: DownloadItem): Promise<string> {
    return new Promise((resolve, reject) => {
      const binaryMgr = BinaryManager.getInstance();
      const galleryPath = binaryMgr.getBinaryPath('gallery-dl');

      if (!galleryPath || !fs.existsSync(galleryPath)) {
        return reject(new Error(`O executável gallery-dl não foi encontrado (${galleryPath || 'não configurado'}). Verifique os mecanismos de download.`));
      }

      const dir = path.dirname(item.savePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const args = [
        '--dest', dir,
        item.url
      ];

      const proc = spawn(galleryPath, args);
      this.activeMap.set(item.id, { process: proc, isCancelled: false });

      let downloadedCount = 0;

      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('#')) {
            downloadedCount++;
            const event: EngineProgressEvent = {
              downloadedBytes: downloadedCount * 1024 * 1024,
              totalBytes: 0,
              progress: 50,
              speed: 0,
              eta: 0
            };
            this.emit('progress', item.id, event);
          }
        }
      });

      let errOutput = '';
      proc.stderr.on('data', (data: Buffer) => {
        errOutput += data.toString('utf-8');
      });

      proc.on('close', (code) => {
        this.activeMap.delete(item.id);
        if (code === 0) {
          const event: EngineProgressEvent = {
            downloadedBytes: downloadedCount * 1024 * 1024,
            totalBytes: downloadedCount * 1024 * 1024,
            progress: 100,
            speed: 0,
            eta: 0
          };
          this.emit('progress', item.id, event);
          this.emit('completed', item.id, dir);
          resolve(dir);
        } else {
          reject(new Error(errOutput || `gallery-dl finalizou com código ${code}`));
        }
      });

      proc.on('error', (err) => {
        this.activeMap.delete(item.id);
        reject(err);
      });
    });
  }
}
