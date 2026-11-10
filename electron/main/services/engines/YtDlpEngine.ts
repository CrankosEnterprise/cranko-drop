import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { BaseEngine, EngineProgressEvent } from './BaseEngine';
import { DownloadItem } from '../../../src/types';
import { BinaryManager } from '../BinaryManager';

interface ActiveYtDlp {
  process: ChildProcess;
  item: DownloadItem;
  isPaused: boolean;
  isCancelled: boolean;
}

export class YtDlpEngine extends BaseEngine {
  private activeMap: Map<string, ActiveYtDlp> = new Map();

  public async start(item: DownloadItem, customFormatId?: string): Promise<string> {
    return this.runYtDlp(item, customFormatId);
  }

  public async resume(item: DownloadItem): Promise<void> {
    await this.runYtDlp(item);
  }

  public async pause(itemId: string): Promise<void> {
    const active = this.activeMap.get(itemId);
    if (active) {
      active.isPaused = true;
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

      // Cleanup .part files if any
      const dir = path.dirname(active.item.savePath);
      const base = path.basename(active.item.savePath);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (f.startsWith(base) && f.endsWith('.part')) {
            try {
              fs.unlinkSync(path.join(dir, f));
            } catch {}
          }
        }
      }

      this.activeMap.delete(itemId);
    }
  }

  private runYtDlp(item: DownloadItem, customFormatId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const binaryMgr = BinaryManager.getInstance();
      const ytDlpPath = binaryMgr.getBinaryPath('yt-dlp');

      if (!ytDlpPath || !fs.existsSync(ytDlpPath)) {
        return reject(new Error('O executável do yt-dlp não foi localizado. Acesse a aba Configurações e clique em "Baixar Oficial" para ativá-lo.'));
      }

      const ffmpegPath = binaryMgr.getBinaryPath('ffmpeg');

      const outDir = path.dirname(item.savePath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const args = [
        '--newline',
        '--no-playlist',
        '--continue',
        '--extractor-args', 'youtube:player_client=android,web',
        '--progress-template',
        '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_str)s',
      ];

      if (ffmpegPath && fs.existsSync(ffmpegPath)) {
        args.push('--ffmpeg-location', path.dirname(ffmpegPath));
      }

      if (item.category === 'audios' || customFormatId === 'bestaudio/best') {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
        args.push('-o', path.join(outDir, '%(title)s.%(ext)s'));
      } else if (customFormatId) {
        args.push('-f', customFormatId);
        args.push('--merge-output-format', 'mp4');
        args.push('-o', path.join(outDir, '%(title)s.%(ext)s'));
      } else {
        // Default to best quality combining video and audio
        args.push('-f', 'bv*+ba/b');
        args.push('--merge-output-format', 'mp4');
        args.push('-o', path.join(outDir, '%(title)s.%(ext)s'));
      }

      args.push(item.url);

      const proc = spawn(ytDlpPath, args);
      const active: ActiveYtDlp = {
        process: proc,
        item,
        isPaused: false,
        isCancelled: false,
      };

      this.activeMap.set(item.id, active);

      let finalFilePath = item.savePath;

      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        const lines = text.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Check for downloaded destination
          if (trimmed.startsWith('[download] Destination:')) {
            finalFilePath = trimmed.replace('[download] Destination:', '').trim();
          } else if (trimmed.includes('[ExtractAudio] Destination:')) {
            finalFilePath = trimmed.replace('[ExtractAudio] Destination:', '').trim();
          } else if (trimmed.includes('[Merger] Merging formats into')) {
            const match = trimmed.match(/"([^"]+)"/);
            if (match && match[1]) {
              finalFilePath = match[1];
            }
          }

          // Template format: percent|speed|eta|total
          if (trimmed.includes('|')) {
            const parts = trimmed.split('|');
            if (parts.length >= 4) {
              const rawPercent = parts[0].replace('%', '').trim();
              const rawSpeed = parts[1].trim();
              const rawEta = parts[2].trim();
              const rawTotal = parts[3].trim();

              const progress = parseFloat(rawPercent) || 0;
              const speed = this.parseSpeed(rawSpeed);
              const eta = this.parseEta(rawEta);
              const totalBytes = this.parseSize(rawTotal);
              const downloadedBytes = totalBytes > 0 ? (progress / 100) * totalBytes : 0;

              const event: EngineProgressEvent = {
                downloadedBytes,
                totalBytes,
                progress,
                speed,
                eta
              };

              this.emit('progress', item.id, event);
            }
          }
        }
      });

      let errOutput = '';
      proc.stderr.on('data', (data: Buffer) => {
        errOutput += data.toString('utf-8');
      });

      proc.on('close', (code) => {
        this.activeMap.delete(item.id);

        if (active.isPaused) {
          return;
        }

        if (active.isCancelled) {
          return;
        }

        if (code === 0) {
          const event: EngineProgressEvent = {
            downloadedBytes: item.fileSize,
            totalBytes: item.fileSize,
            progress: 100,
            speed: 0,
            eta: 0
          };
          this.emit('progress', item.id, event);
          this.emit('completed', item.id, finalFilePath);
          resolve(finalFilePath);
        } else {
          reject(new Error(errOutput || `yt-dlp finalizou com código de erro ${code}`));
        }
      });

      proc.on('error', (err) => {
        this.activeMap.delete(item.id);
        reject(err);
      });
    });
  }

  private parseSpeed(speedStr: string): number {
    const match = speedStr.match(/([\d.]+)\s*([KMGT]?i?B\/s)/i);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit.startsWith('K')) return Math.round(val * 1024);
    if (unit.startsWith('M')) return Math.round(val * 1024 * 1024);
    if (unit.startsWith('G')) return Math.round(val * 1024 * 1024 * 1024);
    return Math.round(val);
  }

  private parseEta(etaStr: string): number {
    const parts = etaStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    return 0;
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/([\d.]+)\s*([KMGT]?i?B)/i);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit.startsWith('K')) return Math.round(val * 1024);
    if (unit.startsWith('M')) return Math.round(val * 1024 * 1024);
    if (unit.startsWith('G')) return Math.round(val * 1024 * 1024 * 1024);
    return Math.round(val);
  }
}
