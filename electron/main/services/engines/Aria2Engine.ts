import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { BaseEngine, EngineProgressEvent } from './BaseEngine';
import { DownloadItem } from '../../../src/types';
import { BinaryManager } from '../BinaryManager';

interface ActiveAria2 {
  process: ChildProcess;
  item: DownloadItem;
  isPaused: boolean;
  isCancelled: boolean;
}

export class Aria2Engine extends BaseEngine {
  private activeMap: Map<string, ActiveAria2> = new Map();

  public async start(item: DownloadItem): Promise<string> {
    return this.runAria2(item);
  }

  public async resume(item: DownloadItem): Promise<void> {
    await this.runAria2(item);
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

      // Cleanup aria2 control file (.aria2) and temp files
      const controlFile = `${active.item.savePath}.aria2`;
      if (fs.existsSync(controlFile)) {
        try { fs.unlinkSync(controlFile); } catch {}
      }
      if (fs.existsSync(active.item.savePath)) {
        try { fs.unlinkSync(active.item.savePath); } catch {}
      }

      this.activeMap.delete(itemId);
    }
  }

  private runAria2(item: DownloadItem): Promise<string> {
    return new Promise((resolve, reject) => {
      const binaryMgr = BinaryManager.getInstance();
      const aria2Path = binaryMgr.getBinaryPath('aria2c') || 'aria2c';

      const dir = path.dirname(item.savePath);
      const outFilename = path.basename(item.savePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const args = [
        '-c', // Continue partial downloads
        '-s', '16', // 16 connections per server
        '-x', '16',
        '-k', '1M',
        '--summary-interval=1',
        '-d', dir,
        '-o', outFilename,
        item.url
      ];

      const proc = spawn(aria2Path, args);
      const active: ActiveAria2 = {
        process: proc,
        item,
        isPaused: false,
        isCancelled: false
      };

      this.activeMap.set(item.id, active);

      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        // Example aria2 summary:
        // [#2089b0 12MiB/34MiB(35%) CN:4 DL:4.2MiB ETA:5s]
        const match = text.match(/\[#\w+\s+([\d.]+)([KMGT]?i?B)\/([\d.]+)([KMGT]?i?B)\((\d+)%\)\s+.*?DL:([\d.]+)([KMGT]?i?B).*?(?:ETA:(\w+))?\]/i);
        if (match) {
          const downloaded = this.parseSize(`${match[1]}${match[2]}`);
          const total = this.parseSize(`${match[3]}${match[4]}`);
          const percent = parseInt(match[5], 10);
          const speed = this.parseSpeed(`${match[6]}${match[7]}/s`);
          const eta = match[8] ? this.parseEta(match[8]) : 0;

          const event: EngineProgressEvent = {
            downloadedBytes: downloaded,
            totalBytes: total,
            progress: percent,
            speed,
            eta
          };

          this.emit('progress', item.id, event);
        }
      });

      let errOutput = '';
      proc.stderr.on('data', (data: Buffer) => {
        errOutput += data.toString('utf-8');
      });

      proc.on('close', (code) => {
        this.activeMap.delete(item.id);

        if (active.isPaused || active.isCancelled) return;

        if (code === 0) {
          const event: EngineProgressEvent = {
            downloadedBytes: item.fileSize,
            totalBytes: item.fileSize,
            progress: 100,
            speed: 0,
            eta: 0
          };
          this.emit('progress', item.id, event);
          this.emit('completed', item.id, item.savePath);
          resolve(item.savePath);
        } else {
          reject(new Error(errOutput || `aria2 finalizou com código ${code}`));
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
    const matchSec = etaStr.match(/(\d+)s/i);
    const matchMin = etaStr.match(/(\d+)m/i);
    let seconds = 0;
    if (matchMin) seconds += parseInt(matchMin[1], 10) * 60;
    if (matchSec) seconds += parseInt(matchSec[1], 10);
    return seconds;
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
