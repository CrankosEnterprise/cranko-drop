import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import https from 'node:https';
import { BinaryStatus } from '../../src/types';

export class BinaryManager {
  private static instance: BinaryManager;
  private isWindows: boolean = process.platform === 'win32';
  private platformDir: string = process.platform === 'win32' ? 'win' : 'linux';
  private userBinDir: string;

  private constructor() {
    this.userBinDir = path.join(app.getPath('userData'), 'bin');
    if (!fs.existsSync(this.userBinDir)) {
      fs.mkdirSync(this.userBinDir, { recursive: true });
    }
  }

  public static getInstance(): BinaryManager {
    if (!BinaryManager.instance) {
      BinaryManager.instance = new BinaryManager();
    }
    return BinaryManager.instance;
  }

  /**
   * Resolves the real executable path on disk.
   * NEVER returns a path inside an app.asar archive!
   */
  public getBinaryPath(name: 'yt-dlp' | 'ffmpeg' | 'ffprobe' | 'aria2c' | 'gallery-dl'): string | null {
    const filename = this.isWindows ? `${name}.exe` : name;

    const candidatePaths: string[] = [];

    // 1. User AppData bin directory (where downloaded updates/tools live)
    candidatePaths.push(path.join(this.userBinDir, filename));

    // 2. Production resources directory (extraResources: <resourcesPath>/bin/win/...)
    if (process.resourcesPath) {
      // extraResources with subfolder
      candidatePaths.push(path.join(process.resourcesPath, 'bin', this.platformDir, filename));
      // extraResources flat
      candidatePaths.push(path.join(process.resourcesPath, 'bin', filename));
      // asar.unpacked if unpacked
      candidatePaths.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', this.platformDir, filename));
      candidatePaths.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', filename));
    }

    // 3. Development project directory (only when not packaged)
    if (!app.isPackaged) {
      const cwd = process.cwd();
      candidatePaths.push(path.join(cwd, 'bin', this.platformDir, filename));
      candidatePaths.push(path.join(cwd, 'bin', filename));

      const appPath = app.getAppPath();
      if (!appPath.includes('app.asar')) {
        candidatePaths.push(path.join(appPath, 'bin', this.platformDir, filename));
        candidatePaths.push(path.join(appPath, 'bin', filename));
      }
    }

    // Check all explicit candidates
    for (const candidate of candidatePaths) {
      // CRITICAL: Never return a path inside app.asar (spawn will fail with ENOENT)
      if (candidate.includes('app.asar') && !candidate.includes('app.asar.unpacked')) {
        continue;
      }

      if (fs.existsSync(candidate)) {
        try {
          // Verify it's a file with size > 100KB (valid binary)
          const stat = fs.statSync(candidate);
          if (stat.isFile() && stat.size > 50000) {
            return candidate;
          }
        } catch {}
      }
    }

    // 4. Check if available in system PATH
    const systemPath = this.findInSystemPath(name);
    if (systemPath) {
      return systemPath;
    }

    return null;
  }

  private findInSystemPath(name: string): string | null {
    try {
      const cmd = this.isWindows ? 'where.exe' : 'which';
      const output = execFileSync(cmd, [name], { encoding: 'utf-8', timeout: 2000 });
      const firstLine = output.trim().split(/\r?\n/)[0];
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    } catch {
      // Not found in PATH
    }
    return null;
  }

  public async checkBinary(name: 'yt-dlp' | 'ffmpeg' | 'ffprobe' | 'aria2c' | 'gallery-dl'): Promise<BinaryStatus> {
    const binPath = this.getBinaryPath(name);
    if (!binPath) {
      return {
        name,
        available: false,
      };
    }

    return new Promise((resolve) => {
      const flag = name === 'ffmpeg' || name === 'ffprobe' ? '-version' : '--version';
      
      execFile(binPath, [flag], { timeout: 4000 }, (err, stdout) => {
        if (err) {
          resolve({
            name,
            available: false,
            path: binPath
          });
        } else {
          const firstLine = stdout.trim().split(/\r?\n/)[0] || '';
          resolve({
            name,
            available: true,
            version: firstLine.slice(0, 50),
            path: binPath
          });
        }
      });
    });
  }

  public async checkAllBinaries(): Promise<Record<string, BinaryStatus>> {
    const names: ('yt-dlp' | 'ffmpeg' | 'ffprobe' | 'aria2c' | 'gallery-dl')[] = [
      'yt-dlp',
      'ffmpeg',
      'ffprobe',
      'aria2c',
      'gallery-dl'
    ];

    const results: Record<string, BinaryStatus> = {};
    for (const name of names) {
      results[name] = await this.checkBinary(name);
    }
    return results;
  }

  /**
   * Downloads a standalone official binary directly into user's bin directory
   */
  public async downloadBinary(
    name: 'yt-dlp' | 'gallery-dl',
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const filename = this.isWindows ? `${name}.exe` : name;
    const dest = path.join(this.userBinDir, filename);

    let url = '';
    if (name === 'yt-dlp') {
      url = this.isWindows
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    }

    if (!url) return false;

    return new Promise((resolve) => {
      const tempPath = dest + '.tmp';
      const file = fs.createWriteStream(tempPath);

      const requestWithRedirects = (currentUrl: string, depth = 0) => {
        if (depth > 5) {
          file.close();
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          return resolve(false);
        }

        https.get(currentUrl, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return requestWithRedirects(res.headers.location, depth + 1);
          }

          if (res.statusCode !== 200) {
            file.close();
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            return resolve(false);
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let receivedBytes = 0;

          res.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length;
            file.write(chunk);
            if (totalBytes > 0 && onProgress) {
              onProgress(Math.min(100, Math.round((receivedBytes / totalBytes) * 100)));
            }
          });

          res.on('end', () => {
            file.end();
            try {
              // Verify downloaded file size (yt-dlp.exe is > 10MB)
              const stat = fs.statSync(tempPath);
              if (stat.size < 500000) {
                fs.unlinkSync(tempPath);
                return resolve(false);
              }

              if (fs.existsSync(dest)) fs.unlinkSync(dest);
              fs.renameSync(tempPath, dest);
              if (!this.isWindows) {
                fs.chmodSync(dest, 0o755);
              }
              resolve(true);
            } catch {
              resolve(false);
            }
          });

          res.on('error', () => {
            file.close();
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            resolve(false);
          });
        }).on('error', () => {
          file.close();
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          resolve(false);
        });
      };

      requestWithRedirects(url);
    });
  }
}
