import { BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { SimpleStore } from '../utils/store';
import { BinaryManager } from './BinaryManager';
import { LibraryService } from './LibraryService';
import { ConversionTask, ConversionType } from '../../src/types';

export class ConversionService {
  private static instance: ConversionService;
  private store: SimpleStore<{ tasks: ConversionTask[] }>;

  private constructor() {
    this.store = new SimpleStore<{ tasks: ConversionTask[] }>('conversions', { tasks: [] });
  }

  public static getInstance(): ConversionService {
    if (!ConversionService.instance) {
      ConversionService.instance = new ConversionService();
    }
    return ConversionService.instance;
  }

  public getAll(): ConversionTask[] {
    return this.store.get().tasks;
  }

  public async createTask(
    sourcePath: string,
    targetFormat: string,
    type: ConversionType,
    options: ConversionTask['options'] = {}
  ): Promise<ConversionTask> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Arquivo de origem não encontrado: ${sourcePath}`);
    }

    const stat = fs.statSync(sourcePath);
    const parsed = path.parse(sourcePath);
    const safeFormat = targetFormat.toLowerCase().replace('.', '');

    // Generate non-colliding target path
    let targetPath = path.join(parsed.dir, `${parsed.name}_converted.${safeFormat}`);
    let counter = 1;
    while (fs.existsSync(targetPath)) {
      targetPath = path.join(parsed.dir, `${parsed.name}_converted_${counter}.${safeFormat}`);
      counter++;
    }

    const newTask: ConversionTask = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sourcePath,
      sourceName: parsed.base,
      sourceExt: parsed.ext.replace('.', '').toLowerCase(),
      sourceSize: stat.size,
      targetFormat: safeFormat,
      targetPath,
      type,
      options,
      progress: 0,
      status: 'idle',
      createdAt: Date.now()
    };

    const current = this.store.get().tasks;
    this.store.set({ tasks: [newTask, ...current] });
    this.broadcast('conversion-added', newTask);

    this.runConversion(newTask);
    return newTask;
  }

  private async runConversion(task: ConversionTask): Promise<void> {
    task.status = 'converting';
    task.progress = 10;
    this.persistTasks();
    this.broadcast('conversion-updated', task);

    const binaryMgr = BinaryManager.getInstance();
    const ffmpegPath = binaryMgr.getBinaryPath('ffmpeg') || 'ffmpeg';

    try {
      const args = this.buildFfmpegArgs(task);
      const proc = spawn(ffmpegPath, args);

      proc.stderr.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        // Parse time progression if available
        const timeMatch = text.match(/time=(\d+):(\d+):([\d.]+)/);
        if (timeMatch) {
          // Increment progress smoothly
          if (task.progress < 90) {
            task.progress = Math.min(90, task.progress + 5);
            this.broadcast('conversion-updated', task);
          }
        }
      });

      let errOutput = '';
      proc.stderr.on('data', (chunk) => { errOutput += chunk.toString(); });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(task.targetPath)) {
          task.status = 'completed';
          task.progress = 100;
          task.completedAt = Date.now();
          this.persistTasks();
          this.broadcast('conversion-updated', task);

          // Register in library
          try {
            LibraryService.getInstance().registerFile(task.targetPath);
          } catch {}
        } else {
          task.status = 'error';
          task.errorMessage = `Erro na conversão (${code}): ${errOutput.slice(-200)}`;
          this.persistTasks();
          this.broadcast('conversion-updated', task);
        }
      });

      proc.on('error', (err) => {
        task.status = 'error';
        task.errorMessage = err.message;
        this.persistTasks();
        this.broadcast('conversion-updated', task);
      });
    } catch (err: any) {
      task.status = 'error';
      task.errorMessage = err?.message || 'Falha ao iniciar processo de conversão';
      this.persistTasks();
      this.broadcast('conversion-updated', task);
    }
  }

  private buildFfmpegArgs(task: ConversionTask): string[] {
    const args: string[] = ['-y', '-i', task.sourcePath];

    if (task.type === 'image') {
      const filters: string[] = [];
      if (task.options.width || task.options.height) {
        const w = task.options.width || -1;
        const h = task.options.height || -1;
        filters.push(`scale=${w}:${h}`);
      }

      if (filters.length > 0) {
        args.push('-vf', filters.join(','));
      }

      if (task.targetFormat === 'jpg' || task.targetFormat === 'jpeg') {
        const q = task.options.quality ? Math.round((100 - task.options.quality) / 3) : 2;
        args.push('-q:v', `${Math.max(1, q)}`);
      } else if (task.targetFormat === 'webp') {
        const q = task.options.quality || 85;
        args.push('-quality', `${q}`);
      }
    } else if (task.type === 'audio') {
      args.push('-vn'); // Strip video
      const bitrate = task.options.bitrate || '320k';
      args.push('-b:a', bitrate);

      if (task.targetFormat === 'mp3') {
        args.push('-c:a', 'libmp3lame');
      } else if (task.targetFormat === 'aac') {
        args.push('-c:a', 'aac');
      } else if (task.targetFormat === 'flac') {
        args.push('-c:a', 'flac');
      } else if (task.targetFormat === 'opus') {
        args.push('-c:a', 'libopus');
      }
    } else if (task.type === 'video') {
      const filters: string[] = [];
      if (task.options.width || task.options.height) {
        const w = task.options.width || -2;
        const h = task.options.height || -2;
        filters.push(`scale=${w}:${h}`);
      }

      if (filters.length > 0) {
        args.push('-vf', filters.join(','));
      }

      if (task.targetFormat === 'gif') {
        args.push('-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse');
      } else {
        args.push('-c:v', task.options.codec || 'libx264');
        args.push('-preset', task.options.preset || 'medium');
        args.push('-crf', '23');
        args.push('-c:a', 'aac', '-b:a', '192k');
      }
    } else if (task.type === 'document') {
      // Document image to PDF
      // FFmpeg handles image input and output to PDF!
    }

    args.push(task.targetPath);
    return args;
  }

  private persistTasks(): void {
    this.store.replace({ tasks: this.store.get().tasks });
  }

  private broadcast(channel: string, payload: any): void {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    }
  }
}
