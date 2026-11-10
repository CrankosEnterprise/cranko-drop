import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { execFile } from 'node:child_process';
import { BinaryManager } from './BinaryManager';
import { ProviderManager } from './ProviderManager';
import { UrlAnalysisResult, DownloadEngine } from '../../src/types';

export class UrlAnalyzer {
  private static instance: UrlAnalyzer;

  private mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'image/x-icon': 'ico',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/x-7z-compressed': '7z',
    'application/x-rar-compressed': 'rar',
    'application/x-rar': 'rar',
    'application/x-tar': 'tar',
    'application/gzip': 'tar.gz',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/x-matroska': 'mkv',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/flac': 'flac',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/x-m4a': 'm4a',
    'audio/m4a': 'm4a',
    'application/vnd.android.package-archive': 'apk',
    'application/x-msdownload': 'exe',
    'application/x-iso9660-image': 'iso',
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/csv': 'csv'
  };

  public static getInstance(): UrlAnalyzer {
    if (!UrlAnalyzer.instance) {
      UrlAnalyzer.instance = new UrlAnalyzer();
    }
    return UrlAnalyzer.instance;
  }

  public async analyzeUrl(inputUrl: string): Promise<UrlAnalysisResult> {
    const trimmed = inputUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('ftp://')) {
      throw new Error('URL inválida. Forneça um endereço começando com http://, https:// ou ftp://');
    }

    const domain = this.extractDomain(trimmed);
    const result = await this.resolveAnalysis(trimmed, domain);
    result.compatibleProviders = ProviderManager.getInstance().getCompatibleProviders(trimmed, domain);
    return result;
  }

  private async resolveAnalysis(trimmed: string, domain: string): Promise<UrlAnalysisResult> {
    // 1. Special Handling: Spotify (DRM Protected Licensing Platform)
    if (this.isSpotify(domain)) {
      return await this.analyzeSpotify(trimmed);
    }

    // 2. Direct Image Link Check (NEVER send direct images to gallery-dl!)
    if (this.isDirectImageExtension(trimmed)) {
      return await this.probeDirectUrl(trimmed);
    }

    // 3. Media Platforms (YouTube, TikTok, Instagram, Twitter/X, Vimeo, etc.)
    const isMediaPlatform = this.isKnownMediaPlatform(domain);
    const isGalleryPlatform = this.isKnownGalleryPlatform(domain);

    const binaryMgr = BinaryManager.getInstance();

    if (isMediaPlatform) {
      const ytDlpStatus = await binaryMgr.checkBinary('yt-dlp');
      if (ytDlpStatus.available && ytDlpStatus.path) {
        try {
          return await this.analyzeWithYtDlp(trimmed, ytDlpStatus.path);
        } catch (err: any) {
          console.warn('[UrlAnalyzer] yt-dlp metadata inspection failed, falling back to basic options:', err?.message || err);
        }
      }

      // Fallback options with high quality selection bv*+ba/b
      return {
        url: trimmed,
        title: this.generateFallbackTitle(trimmed),
        recommendedEngine: 'yt-dlp',
        isDirectLink: false,
        canDownloadDirectly: ytDlpStatus.available,
        availableFormats: [
          { formatId: 'bv*+ba/b', resolution: 'Melhor Qualidade Disponível (Auto Mux)', extension: 'mp4', hasVideo: true, hasAudio: true, note: 'Combina vídeo e áudio em resolução máxima' },
          { formatId: 'bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b', resolution: 'Full HD (1080p)', extension: 'mp4', hasVideo: true, hasAudio: true, note: 'Combina vídeo 1080p com áudio de alta fidelidade' },
          { formatId: 'bv*[height<=720]+ba/b[height<=720]/bv*+ba/b', resolution: 'HD (720p)', extension: 'mp4', hasVideo: true, hasAudio: true, note: 'Combina vídeo 720p com áudio' },
          { formatId: 'bv*[height<=480]+ba/b[height<=480]/bv*+ba/b', resolution: 'SD (480p)', extension: 'mp4', hasVideo: true, hasAudio: true },
          { formatId: 'bestaudio/best', resolution: 'Apenas Áudio (MP3 320k)', extension: 'mp3', hasVideo: false, hasAudio: true, note: 'Extrai áudio em alta fidelidade' }
        ]
      };
    }

    // 4. Galleries (Only supported album/gallery platforms)
    if (isGalleryPlatform && this.isGalleryPath(trimmed)) {
      return {
        url: trimmed,
        title: `Galeria ${domain}`,
        recommendedEngine: 'gallery-dl',
        isDirectLink: false,
        isPlaylist: true,
        canDownloadDirectly: true
      };
    }

    // 5. Direct HTTP/HTTPS File Inspection
    return await this.probeDirectUrl(trimmed);
  }

  private isSpotify(domain: string): boolean {
    return domain.includes('spotify.com') || domain.includes('spotify.link');
  }

  private isDirectImageExtension(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      return /\.(png|jpe?g|webp|gif|avif|bmp|tiff|ico|svg)$/i.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  private isGalleryPath(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      // Ensure it's not a direct image file
      return !/\.(png|jpe?g|webp|gif|avif|bmp|tiff|ico|svg)$/i.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  private async analyzeSpotify(urlStr: string): Promise<UrlAnalysisResult> {
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(urlStr)}`;
      const data = await this.fetchJson(oembedUrl);

      return {
        url: urlStr,
        title: data.title || 'Música do Spotify',
        thumbnailUrl: data.thumbnail_url,
        recommendedEngine: 'native',
        isDirectLink: false,
        isProtectedPlatform: true,
        canDownloadDirectly: false,
        provider: 'Spotify',
        officialUrl: urlStr,
        protectionNotice: 'O Spotify utiliza proteção DRM para streaming comercial sob licença. O Cranko Drop respeita os direitos autorais e termos de serviço, portanto não realiza download direto de faixas do Spotify. Você pode reproduzir a faixa oficialmente ou buscar versões autorizadas no YouTube abaixo.'
      };
    } catch {
      return {
        url: urlStr,
        title: 'Mídia do Spotify',
        recommendedEngine: 'native',
        isDirectLink: false,
        isProtectedPlatform: true,
        canDownloadDirectly: false,
        provider: 'Spotify',
        officialUrl: urlStr,
        protectionNotice: 'O Spotify utiliza proteção DRM para streaming licenciado. Por questões de conformidade legal, este conteúdo não pode ser baixado diretamente pelo aplicativo.'
      };
    }
  }

  private isKnownMediaPlatform(domain: string): boolean {
    const list = [
      'youtube.com', 'youtu.be', 'tiktok.com', 'twitter.com', 'x.com',
      'instagram.com', 'facebook.com', 'fb.watch', 'vimeo.com', 'twitch.tv',
      'soundcloud.com', 'dailymotion.com', 'reddit.com', 'bilibili.com'
    ];
    return list.some(d => domain.includes(d));
  }

  private isKnownGalleryPlatform(domain: string): boolean {
    const list = ['imgur.com', 'artstation.com', 'deviantart.com', 'pinterest.com', 'flickr.com'];
    return list.some(d => domain.includes(d));
  }

  private extractDomain(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  private generateFallbackTitle(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return decodeURIComponent(segments[segments.length - 1]);
      }
      return parsed.hostname;
    } catch {
      return urlStr;
    }
  }

  private analyzeWithYtDlp(urlStr: string, ytDlpPath: string): Promise<UrlAnalysisResult> {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-single-json',
        '--no-warnings',
        '--no-playlist',
        '--extractor-args', 'youtube:player_client=android,web',
        urlStr
      ];

      execFile(ytDlpPath, args, { maxBuffer: 20 * 1024 * 1024, timeout: 25000 }, (err, stdout) => {
        if (err) {
          return reject(err);
        }

        try {
          const data = JSON.parse(stdout);
          const formats: UrlAnalysisResult['availableFormats'] = [];

          if (Array.isArray(data.formats)) {
            // 1. Add Best Quality Available (bv*+ba/b)
            formats.push({
              formatId: 'bv*+ba/b',
              resolution: 'Melhor Qualidade Disponível (Auto Mux)',
              extension: 'mp4',
              hasVideo: true,
              hasAudio: true,
              note: 'Resolução máxima disponível com áudio mesclado via FFmpeg'
            });

            // 2. Discover available video heights
            const seenRes = new Set<number>();
            const videoFormats = data.formats
              .filter((f: any) => f.vcodec && f.vcodec !== 'none' && f.height && typeof f.height === 'number')
              .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

            for (const f of videoFormats) {
              const h = f.height;
              if (!seenRes.has(h) && h >= 144) {
                seenRes.add(h);
                let label = `${h}p`;
                if (h >= 2160) label = '4K Ultra HD (2160p)';
                else if (h >= 1440) label = '2K Quad HD (1440p)';
                else if (h >= 1080) label = 'Full HD (1080p)';
                else if (h >= 720) label = 'HD (720p)';
                else if (h >= 480) label = 'SD (480p)';

                formats.push({
                  formatId: `bv*[height<=${h}]+ba/b[height<=${h}]/bv*+ba/b`,
                  resolution: label,
                  extension: 'mp4',
                  filesize: f.filesize || f.filesize_approx,
                  hasVideo: true,
                  hasAudio: true,
                  note: `Vídeo ${h}p com áudio integrado via FFmpeg`
                });
              }
            }

            // 3. Audio only option
            formats.push({
              formatId: 'bestaudio/best',
              resolution: 'Apenas Áudio (MP3 320k)',
              extension: 'mp3',
              hasVideo: false,
              hasAudio: true,
              note: 'Extrai áudio em alta fidelidade'
            });
          }

          resolve({
            url: urlStr,
            title: data.title || 'Vídeo sem título',
            thumbnailUrl: data.thumbnail,
            duration: data.duration,
            recommendedEngine: 'yt-dlp',
            isDirectLink: false,
            canDownloadDirectly: true,
            availableFormats: formats.length > 0 ? formats : undefined,
            isPlaylist: !!data._type && data._type === 'playlist',
            playlistCount: data.playlist_count
          });
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  }

  public searchYouTube(query: string): Promise<{ title: string; channel: string; thumbnail: string; duration: number; url: string }[]> {
    const binaryMgr = BinaryManager.getInstance();
    const ytDlpPath = binaryMgr.getBinaryPath('yt-dlp');
    if (!ytDlpPath) return Promise.resolve([]);

    return new Promise((resolve) => {
      const args = [
        `ytsearch4:${query}`,
        '--dump-single-json',
        '--no-playlist',
        '--extractor-args', 'youtube:player_client=android,web'
      ];

      execFile(ytDlpPath, args, { maxBuffer: 15 * 1024 * 1024, timeout: 15000 }, (err, stdout) => {
        if (err || !stdout) {
          return resolve([]);
        }

        try {
          const data = JSON.parse(stdout);
          const entries = data.entries || (data._type === 'video' ? [data] : []);
          const results = entries.slice(0, 4).map((e: any) => ({
            title: e.title || 'Vídeo oficial',
            channel: e.uploader || e.channel || 'Canal oficial',
            thumbnail: e.thumbnail || '',
            duration: e.duration || 0,
            url: e.webpage_url || `https://www.youtube.com/watch?v=${e.id}`
          }));
          resolve(results);
        } catch {
          resolve([]);
        }
      });
    });
  }

  private async probeDirectUrl(urlStr: string): Promise<UrlAnalysisResult> {
    return new Promise((resolve, reject) => {
      try {
        const parsed = new URL(urlStr);
        const client = parsed.protocol === 'https:' ? https : http;

        const req = client.request(urlStr, { method: 'HEAD', timeout: 8000 }, (res) => {
          // Handle redirect
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, urlStr).toString();
            return this.probeDirectUrl(redirectUrl).then(resolve).catch(reject);
          }

          // Check HTTP errors
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`O servidor respondeu com erro HTTP ${res.statusCode} (${res.statusMessage || 'Falha na requisição'}).`));
          }

          const contentType = (res.headers['content-type'] || '').toLowerCase();
          const contentLength = res.headers['content-length'] ? parseInt(res.headers['content-length'], 10) : undefined;

          // Reject standard web pages (HTML) that are not download files
          if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
            const hasFileExt = /\.(zip|pdf|png|jpe?g|webp|gif|avif|bmp|tiff|mp4|mp3|mkv|exe|apk|iso|tar|gz|7z)$/i.test(parsed.pathname);
            if (!hasFileExt) {
              return reject(new Error('A URL informada aponta para uma página web (HTML) e não para um arquivo direto para download.'));
            }
          }

          let filename: string | undefined;

          // Check Content-Disposition
          const disposition = res.headers['content-disposition'];
          if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
              filename = match[1].replace(/['"]/g, '').trim();
            }
          }

          // Check URL Path
          if (!filename) {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length > 0) {
              const last = decodeURIComponent(parts[parts.length - 1]);
              if (last.includes('.')) {
                filename = last;
              }
            }
          }

          // Infer extension from MIME type if filename has no extension
          if (filename && !filename.includes('.')) {
            const ext = this.guessExtensionFromMime(contentType);
            if (ext) {
              filename = `${filename}.${ext}`;
            }
          } else if (!filename) {
            const ext = this.guessExtensionFromMime(contentType) || 'bin';
            filename = `arquivo_${Date.now()}.${ext}`;
          }

          resolve({
            url: urlStr,
            title: filename,
            filesize: contentLength,
            recommendedEngine: 'native',
            isDirectLink: true,
            canDownloadDirectly: true
          });
        });

        req.on('error', () => {
          // Fallback probe with GET if HEAD was blocked
          this.probeWithGetRange(urlStr).then(resolve).catch(reject);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Tempo limite excedido ao inspecionar a URL.'));
        });

        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private probeWithGetRange(urlStr: string): Promise<UrlAnalysisResult> {
    return new Promise((resolve, reject) => {
      try {
        const parsed = new URL(urlStr);
        const client = parsed.protocol === 'https:' ? https : http;

        const req = client.request(urlStr, {
          method: 'GET',
          headers: { Range: 'bytes=0-1024' },
          timeout: 8000
        }, (res) => {
          req.destroy();

          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`O servidor respondeu com erro HTTP ${res.statusCode}.`));
          }

          const contentType = (res.headers['content-type'] || '').toLowerCase();
          if (contentType.includes('text/html')) {
            const hasFileExt = /\.(zip|pdf|png|jpe?g|webp|gif|avif|bmp|tiff|mp4|mp3|mkv|exe|apk|iso|tar|gz|7z)$/i.test(parsed.pathname);
            if (!hasFileExt) {
              return reject(new Error('A URL aponta para uma página web (HTML) e não para um arquivo direto de download.'));
            }
          }

          const parts = parsed.pathname.split('/').filter(Boolean);
          const rawName = parts.length > 0 ? decodeURIComponent(parts[parts.length - 1]) : 'arquivo';
          const ext = this.guessExtensionFromMime(contentType);
          const filename = rawName.includes('.') ? rawName : (ext ? `${rawName}.${ext}` : rawName);

          resolve({
            url: urlStr,
            title: filename,
            recommendedEngine: 'native',
            isDirectLink: true,
            canDownloadDirectly: true
          });
        });

        req.on('error', reject);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private guessExtensionFromMime(mime: string): string | null {
    const clean = mime.split(';')[0].trim().toLowerCase();
    return this.mimeMap[clean] || null;
  }

  private fetchJson(urlStr: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(urlStr, { headers: { 'User-Agent': 'CrankoDrop/1.0' } }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }
}
