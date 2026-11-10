import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { BaseEngine, EngineProgressEvent } from './BaseEngine';
import { DownloadItem } from '../../../src/types';

interface ActiveDownload {
  req: http.ClientRequest;
  res?: http.IncomingMessage;
  fileStream?: fs.WriteStream;
  tempPath: string;
  finalPath: string;
  downloadedBytes: number;
  totalBytes: number;
  lastProgressUpdate: number;
  bytesSinceLastUpdate: number;
  speed: number;
  isPaused: boolean;
  isCancelled: boolean;
}

export class NativeHttpEngine extends BaseEngine {
  private activeMap: Map<string, ActiveDownload> = new Map();

  public async start(item: DownloadItem): Promise<string> {
    return this.executeDownload(item, false);
  }

  public async resume(item: DownloadItem): Promise<void> {
    await this.executeDownload(item, true);
  }

  public async pause(itemId: string): Promise<void> {
    const active = this.activeMap.get(itemId);
    if (active) {
      active.isPaused = true;
      active.req.destroy();
      if (active.fileStream) {
        active.fileStream.end();
      }
      this.activeMap.delete(itemId);
    }
  }

  public async cancel(itemId: string): Promise<void> {
    const active = this.activeMap.get(itemId);
    if (active) {
      active.isCancelled = true;
      active.req.destroy();
      if (active.fileStream) {
        active.fileStream.end();
      }
      if (fs.existsSync(active.tempPath)) {
        try {
          fs.unlinkSync(active.tempPath);
        } catch {}
      }
      this.activeMap.delete(itemId);
    }
  }

  private executeDownload(item: DownloadItem, isResuming: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(item.url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const finalPath = item.savePath;
      const tempPath = `${finalPath}.cranko.tmp`;

      let existingBytes = 0;
      if (isResuming && fs.existsSync(tempPath)) {
        existingBytes = fs.statSync(tempPath).size;
      } else if (!isResuming && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }

      // Ensure directory exists
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const headers: Record<string, string> = {
        'User-Agent': 'CrankoDrop/1.0 (Windows NT 10.0; Win64; x64)',
      };

      if (existingBytes > 0) {
        headers['Range'] = `bytes=${existingBytes}-`;
      }

      const req = client.request(item.url, { method: 'GET', headers }, (res) => {
        // Handle Redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, item.url).toString();
          item.url = redirectUrl;
          return this.executeDownload(item, isResuming).then(resolve).catch(reject);
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`Servidor respondeu com status HTTP ${res.statusCode}: ${res.statusMessage || 'Erro'}`));
        }

        const contentType = (res.headers['content-type'] || '').toLowerCase();
        if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
          const hasExplicitHtmlExt = item.filename.endsWith('.html') || item.filename.endsWith('.htm');
          if (!hasExplicitHtmlExt) {
            req.destroy();
            return reject(new Error('O endereço retornou uma página web (HTML) e não um arquivo de mídia ou documento para download.'));
          }
        }

        // Check if server specified real filename in Content-Disposition
        let resolvedFinalPath = finalPath;
        const disposition = res.headers['content-disposition'];
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) {
            const cleanName = match[1].replace(/['"]/g, '').trim();
            if (cleanName) {
              resolvedFinalPath = path.join(path.dirname(finalPath), cleanName);
            }
          }
        }

        const isPartial = res.statusCode === 206;
        let totalBytes = item.fileSize || 0;

        if (res.headers['content-length']) {
          const incomingLength = parseInt(res.headers['content-length'], 10);
          totalBytes = isPartial ? existingBytes + incomingLength : incomingLength;
        }

        const fileStream = fs.createWriteStream(tempPath, { flags: isPartial ? 'a' : 'w' });

        const active: ActiveDownload = {
          req,
          res,
          fileStream,
          tempPath,
          finalPath: resolvedFinalPath,
          downloadedBytes: isPartial ? existingBytes : 0,
          totalBytes,
          lastProgressUpdate: Date.now(),
          bytesSinceLastUpdate: 0,
          speed: 0,
          isPaused: false,
          isCancelled: false
        };

        this.activeMap.set(item.id, active);

        res.on('data', (chunk: Buffer) => {
          if (active.isPaused || active.isCancelled) return;

          active.downloadedBytes += chunk.length;
          active.bytesSinceLastUpdate += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          const elapsed = (now - active.lastProgressUpdate) / 1000;

          if (elapsed >= 0.5) {
            active.speed = Math.round(active.bytesSinceLastUpdate / elapsed);
            active.bytesSinceLastUpdate = 0;
            active.lastProgressUpdate = now;

            const progress = active.totalBytes > 0
              ? Math.min(100, (active.downloadedBytes / active.totalBytes) * 100)
              : 0;

            const remainingBytes = Math.max(0, active.totalBytes - active.downloadedBytes);
            const eta = active.speed > 0 ? Math.round(remainingBytes / active.speed) : 0;

            const event: EngineProgressEvent = {
              downloadedBytes: active.downloadedBytes,
              totalBytes: active.totalBytes,
              progress,
              speed: active.speed,
              eta
            };

            this.emit('progress', item.id, event);
          }
        });

        res.on('end', () => {
          fileStream.end();
          this.activeMap.delete(item.id);

          if (active.isPaused) {
            this.emit('paused', item.id);
            return;
          }

          if (active.isCancelled) {
            return;
          }

          try {
            if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
              if (fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch {}
              }
              return reject(new Error('O download foi finalizado sem dados (0 bytes recebidos).'));
            }

            const targetPath = active.finalPath;
            if (fs.existsSync(targetPath)) {
              fs.unlinkSync(targetPath);
            }
            fs.renameSync(tempPath, targetPath);

            const event: EngineProgressEvent = {
              downloadedBytes: active.downloadedBytes,
              totalBytes: active.downloadedBytes,
              progress: 100,
              speed: 0,
              eta: 0
            };
            this.emit('progress', item.id, event);
            this.emit('completed', item.id, targetPath);
            resolve(targetPath);
          } catch (renameErr) {
            reject(renameErr);
          }
        });

        res.on('error', (err) => {
          fileStream.end();
          this.activeMap.delete(item.id);
          reject(err);
        });
      });

      req.on('error', (err) => {
        this.activeMap.delete(item.id);
        reject(err);
      });

      req.end();
    });
  }
}
